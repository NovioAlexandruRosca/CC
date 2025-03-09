const url = require('url');
const mysql = require('mysql2');
const { getRequestBody, sendResponse } = require('../utils');

const dbConfig = require('../config')
const pool = mysql.createPool(dbConfig);

const librariesRoutes = {

  'GET:/libraries': (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    let sql = 'SELECT * FROM libraries';
    const params = [];
    const conditions = [];

    if (query.name) {
      conditions.push('name LIKE ?');
      params.push(`%${query.name}%`);
    }

    if (query.location) {
      conditions.push('location LIKE ?');
      params.push(`%${query.location}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (query.sort) {
      const direction = query.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${mysql.escapeId(query.sort)} ${direction}`;
    } else {
      sql += ' ORDER BY id ASC';
    }

    const limit = query.limit ? parseInt(query.limit) : 10;
    const page = query.page ? parseInt(query.page) : 1;
    const offset = (page - 1) * limit;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    pool.query(sql, params, (err, results) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      pool.query('SELECT COUNT(*) as count FROM libraries', (err, countResult) => {
        if (err) {
          return sendResponse(res, 200, {
            data: results,
            pagination: { page, limit }
          });
        }

        const totalItems = countResult[0].count;
        const totalPages = Math.ceil(totalItems / limit);

        sendResponse(res, 200, {
          data: results,
          pagination: {
            page,
            limit,
            totalItems,
            totalPages
          }
        });
      });
    });
  },

  'GET:/libraries/:id/': (req, res, id) => {
    pool.query('SELECT * FROM libraries WHERE id = ?', [id], (err, results) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      if (results.length === 0) {
        return sendResponse(res, 404, { error: 'Library not found' });
      }

      sendResponse(res, 200, results[0]);
    });
  },

  'GET:/libraries/stats': (req, res) => {
    const stats = {};

    pool.query('SELECT COUNT(*) as total_libraries FROM libraries', (err, totalLibrariesResult) => {
        if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        stats.total_libraries = totalLibrariesResult[0].total_libraries;

        pool.query('SELECT COUNT(*) as total_books FROM library_books', (err, totalBooksResult) => {
            if (err) {
                return sendResponse(res, 500, { error: 'Database error', details: err.message });
            }

            stats.total_books = totalBooksResult[0].total_books;

            stats.average_books_per_library = (stats.total_books / stats.total_libraries).toFixed(2);

            pool.query(
                `SELECT b.genre, COUNT(*) as count 
                 FROM library_books lb 
                 JOIN books b ON lb.book_id = b.id 
                 GROUP BY b.genre`,
                (err, genreResults) => {
                    if (err) {
                        return sendResponse(res, 500, { error: 'Database error', details: err.message });
                    }

                    stats.books_by_genre = genreResults;

                    pool.query(
                        `SELECT a.name as author, COUNT(*) as count 
                         FROM library_books lb 
                         JOIN authors a ON lb.author_id = a.id 
                         GROUP BY a.name`,
                        (err, authorResults) => {
                            if (err) {
                                return sendResponse(res, 500, { error: 'Database error', details: err.message });
                            }

                            stats.books_by_author = authorResults;

                            sendResponse(res, 200, { stats });
                        }
                    );
                }
            );
        });
    });
  },

  'GET:/libraries/:library_id/stats': (req, res, library_id) => {
    if (!library_id || isNaN(library_id)) {
        return sendResponse(res, 400, { error: 'Invalid library ID' });
    }

    pool.query('SELECT * FROM libraries WHERE id = ?', [library_id], (err, libraryResults) => {
        if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        if (libraryResults.length === 0) {
            return sendResponse(res, 404, { error: 'Library not found' });
        }

        const library = libraryResults[0];

        const stats = {};

        pool.query(
            'SELECT COUNT(*) as total_books FROM library_books WHERE library_id = ?',
            [library_id],
            (err, totalBooksResult) => {
                if (err) {
                    return sendResponse(res, 500, { error: 'Database error', details: err.message });
                }

                stats.total_books = totalBooksResult[0].total_books;

                pool.query(
                    `SELECT b.genre, COUNT(*) as count 
                     FROM library_books lb 
                     JOIN books b ON lb.book_id = b.id 
                     WHERE lb.library_id = ? 
                     GROUP BY b.genre`,
                    [library_id],
                    (err, genreResults) => {
                        if (err) {
                            return sendResponse(res, 500, { error: 'Database error', details: err.message });
                        }

                        stats.books_by_genre = genreResults;

                        pool.query(
                            `SELECT a.name as author, COUNT(*) as count 
                             FROM library_books lb 
                             JOIN authors a ON lb.author_id = a.id 
                             WHERE lb.library_id = ? 
                             GROUP BY a.name`,
                            [library_id],
                            (err, authorResults) => {
                                if (err) {
                                    return sendResponse(res, 500, { error: 'Database error', details: err.message });
                                }

                                stats.books_by_author = authorResults;

                                pool.query(
                                    `SELECT AVG(b.published_year) as average_year 
                                     FROM library_books lb 
                                     JOIN books b ON lb.book_id = b.id 
                                     WHERE lb.library_id = ?`,
                                    [library_id],
                                    (err, yearResult) => {
                                        if (err) {
                                            return sendResponse(res, 500, { error: 'Database error', details: err.message });
                                        }

                                        stats.average_year = yearResult[0].average_year || 0;

                                        sendResponse(res, 200, {
                                            library_id: library.id,
                                            library_name: library.name,
                                            stats,
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
  },

  //////////////////////////

  'POST:/libraries': async (req, res) => {
    try {
      const { name, location } = await getRequestBody(req);

      if (!name || !location) {
        return sendResponse(res, 400, { error: 'Missing required fields: name, location' });
      }

      pool.query(
        'INSERT INTO libraries (name, location) VALUES (?, ?)',
        [name, location],
        (err, result) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          const newLibrary = {
            id: result.insertId,
            name,
            location,
            created_at: new Date()
          };

          res.writeHead(201, {
            'Content-Type': 'application/json',
            'Location': `/libraries/${result.insertId}`
          });
          res.end(JSON.stringify(newLibrary));
        }
      );
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'POST:/libraries/:id/': async (req, res, id) => {
    try {
      const { name, location } = await getRequestBody(req);

      if (!name || !location) {
        return sendResponse(res, 400, { error: 'Missing required fields: name, location' });
      }

      pool.query(
        'SELECT * FROM libraries WHERE id = ?',
        [id],
        (err, results) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          if (results.length > 0) {
            return sendResponse(res, 409, { error: 'Library with this ID already exists' });
          }

          pool.query(
            'INSERT INTO libraries (id, name, location) VALUES (?, ?, ?)',
            [id, name, location],
            (err, result) => {
              if (err) {
                return sendResponse(res, 500, { error: 'Database error', details: err.message });
              }

              const newLibrary = {
                id: id,
                name,
                location,
                created_at: new Date()
              };

              res.writeHead(201, {
                'Content-Type': 'application/json',
                'Location': `/libraries/${id}`
              });
              res.end(JSON.stringify(newLibrary));
            }
          );
        }
      );
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  //////////////////////////

  'PUT:/libraries/:id/': async (req, res, id) => {
    try {
      const { name, location } = await getRequestBody(req);

      pool.query('SELECT id FROM libraries WHERE id = ?', [id], (err, results) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }
        if (results.length === 0) {
          return sendResponse(res, 404, { error: 'Library not found' });
        }

        pool.query(
          'UPDATE libraries SET name = ?, location = ? WHERE id = ?',
          [name, location, id],
          (err, result) => {
            if (err) {
              return sendResponse(res, 500, { error: 'Database error', details: err.message });
            }

            sendResponse(res, 200, { message: 'Library updated successfully' });
          }
        );
      });
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'PUT:/libraries': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  },

  //////////////////////////

  'DELETE:/libraries/:id/': (req, res, id) => {
    pool.query('DELETE FROM libraries WHERE id = ?', [id], (err, result) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      if (result.affectedRows === 0) {
        return sendResponse(res, 404, { error: 'Library not found' });
      }

      sendResponse(res, 200, { message: 'Library deleted successfully' });
    });
  },

  'DELETE:/libraries': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  }
};

module.exports = librariesRoutes;