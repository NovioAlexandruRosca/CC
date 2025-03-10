const url = require('url');
const mysql = require('mysql2');
const { getRequestBody, sendResponse } = require('../utils');

const dbConfig = require('../config')
const pool = mysql.createPool(dbConfig);

const libraryManagerRoutes = {

  'GET:/library-books/:id/': (req, res, id) => {
        pool.query('SELECT * FROM library_books WHERE id = ?', [id], (err, results) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          if (results.length === 0) {
            return sendResponse(res, 404, { error: 'Library-book entry not found' });
          }

          sendResponse(res, 200, results[0]);
        });
      },

  'GET:/library-books': (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    let sql = 'SELECT * FROM library_books';
    const params = [];
    const conditions = [];

    if (query.library_id) {
      conditions.push('library_id = ?');
      params.push(query.library_id);
    }

    if (query.book_id) {
      conditions.push('book_id = ?');
      params.push(query.book_id);
    }

    if (query.author_id) {
      conditions.push('author_id = ?');
      params.push(query.author_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    pool.query(sql, params, (err, results) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      sendResponse(res, 200, { data: results });
    });
  },

    //////////////////////////

  'POST:/library-books/:id/': async (req, res, library_id) => {
    try {
      const { book_id, author_id } = await getRequestBody(req);

      if (!book_id || !author_id) {
        return sendResponse(res, 400, { error: 'Missing required fields: book_id, author_id' });
      }

      pool.query('SELECT id FROM libraries WHERE id = ?', [library_id], (err, libraryResults) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }
        if (libraryResults.length === 0) {
          return sendResponse(res, 404, { error: 'Library not found' });
        }

        pool.query('SELECT id FROM books WHERE id = ?', [book_id], (err, bookResults) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }
          if (bookResults.length === 0) {
            return sendResponse(res, 404, { error: 'Book not found' });
          }

          pool.query('SELECT id FROM authors WHERE id = ?', [author_id], (err, authorResults) => {
            if (err) {
              return sendResponse(res, 500, { error: 'Database error', details: err.message });
            }
            if (authorResults.length === 0) {
              return sendResponse(res, 404, { error: 'Author not found' });
            }

            pool.query('SELECT id FROM library_books WHERE library_id = ? AND book_id = ?', [library_id, book_id], (err, conflictResults) => {
              if (err) {
                return sendResponse(res, 500, { error: 'Database error', details: err.message });
              }
              if (conflictResults.length > 0) {
                return sendResponse(res, 409, { error: 'Book already exists in this library' });
              }

              pool.query(
                'INSERT INTO library_books (library_id, book_id, author_id) VALUES (?, ?, ?)',
                [library_id, book_id, author_id],
                (err, result) => {
                  if (err) {
                    return sendResponse(res, 500, { error: 'Database error', details: err.message });
                  }

                  const newEntry = {
                    id: result.insertId,
                    library_id,
                    book_id,
                    author_id,
                    added_at: new Date()
                  };

                  res.writeHead(201, {
                    'Content-Type': 'application/json',
                    'Location': `/library-books/${result.insertId}`
                  });
                  res.end(JSON.stringify(newEntry));
                }
              );
            });
          });
        });
      });
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'POST:/library-books': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  },

    //////////////////////////

  'PUT:/library-books/:id/': async (req, res, id) => {
    try {
      const { library_id, book_id, author_id } = await getRequestBody(req);

      if (!library_id || !book_id || !author_id) {
        return sendResponse(res, 400, { error: 'Missing required fields: library_id, book_id, author_id' });
      }

      pool.query('SELECT id FROM library_books WHERE id = ?', [id], (err, entryResults) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }
        if (entryResults.length === 0) {
          return sendResponse(res, 404, { error: 'Library-book entry not found' });
        }

        pool.query('SELECT id FROM libraries WHERE id = ?', [library_id], (err, libraryResults) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }
          if (libraryResults.length === 0) {
            return sendResponse(res, 404, { error: 'Library not found' });
          }

          pool.query('SELECT id FROM books WHERE id = ?', [book_id], (err, bookResults) => {
            if (err) {
              return sendResponse(res, 500, { error: 'Database error', details: err.message });
            }
            if (bookResults.length === 0) {
              return sendResponse(res, 404, { error: 'Book not found' });
            }

            pool.query('SELECT id FROM authors WHERE id = ?', [author_id], (err, authorResults) => {
              if (err) {
                return sendResponse(res, 500, { error: 'Database error', details: err.message });
              }
              if (authorResults.length === 0) {
                return sendResponse(res, 404, { error: 'Author not found' });
              }

              pool.query(
                'SELECT id FROM library_books WHERE library_id = ? AND book_id = ? AND id != ?',
                [library_id, book_id, id],
                (err, conflictResults) => {
                  if (err) {
                    return sendResponse(res, 500, { error: 'Database error', details: err.message });
                  }
                  if (conflictResults.length > 0) {
                    return sendResponse(res, 409, { error: 'Book already exists in this library' });
                  }

                  pool.query(
                    'UPDATE library_books SET library_id = ?, book_id = ?, author_id = ? WHERE id = ?',
                    [library_id, book_id, author_id, id],
                    (err, result) => {
                      if (err) {
                        return sendResponse(res, 500, { error: 'Database error', details: err.message });
                      }

                      sendResponse(res, 200, { message: 'Library-book entry updated successfully' });
                    }
                  );
                }
              );
            });
          });
        });
      });
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'PUT:/library-books': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  },

    //////////////////////////

  'DELETE:/library-books/:id/': (req, res, id) => {
    pool.query('DELETE FROM library_books WHERE id = ?', [id], (err, result) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      if (result.affectedRows === 0) {
        return sendResponse(res, 404, { error: 'Library-book entry not found' });
      }

      sendResponse(res, 200, { message: 'Library-book entry deleted successfully' });
    });
  },

  'DELETE:/library-books': (req, res) => {
      sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
    }

}

module.exports = libraryManagerRoutes;