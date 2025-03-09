const url = require('url');
const mysql = require('mysql2');
const { getRequestBody, sendResponse } = require('../utils');
const {validateBookData} = require('../validation_scripts');

const dbConfig = require('../config')
const pool = mysql.createPool(dbConfig);

const booksRoutes = {

  'GET:/books': (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    let sql = 'SELECT * FROM books';
    const params = [];
    const conditions = [];

    if (query.genre) {
      conditions.push('genre = ?');
      params.push(query.genre);
    }

    if (query.author) {
      conditions.push('author LIKE ?');
      params.push(`%${query.author}%`);
    }

    if (query.year) {
      conditions.push('published_year = ?');
      params.push(query.year);
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

      pool.query('SELECT COUNT(*) as count FROM books', (err, countResult) => {
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

  'GET:/books/:id/': (req, res, id) => {
    pool.query('SELECT * FROM books WHERE id = ?', [id], (err, results) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      if (results.length === 0) {
        return sendResponse(res, 404, { error: 'Book not found' });
      }

      sendResponse(res, 200, results[0]);
    });
  },

  'GET:/books/:id/recommendations/': (req, res, id) => {
      const parsedUrl = url.parse(req.url, true);
      const query = parsedUrl.query;

      const useGenre = query.genre === 'true';
      const useAuthor = query.author === 'true';

      if (!useGenre && !useAuthor) {
          return sendResponse(res, 400, { error: 'At least one criteria (genre or author) must be enabled' });
      }

      pool.query('SELECT genre, author FROM books WHERE id = ?', [id], (err, bookResults) => {
          if (err) {
              return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          if (bookResults.length === 0) {
              return sendResponse(res, 404, { error: 'Book not found' });
          }

          const { genre, author } = bookResults[0];

          let sql = 'SELECT * FROM books WHERE id != ?';
          const params = [id];

          if (useGenre && useAuthor) {
              sql += ' AND genre = ? AND author = ?';
              params.push(genre, author);
          } else if (useGenre) {
              sql += ' AND genre = ?';
              params.push(genre);
          } else if (useAuthor) {
              sql += ' AND author = ?';
              params.push(author);
          }

          let limit = query.limit ? parseInt(query.limit) : 5;

          sql += ` LIMIT ${limit}`;

          pool.query(sql, params, (err, results) => {
              if (err) {
                  return sendResponse(res, 500, { error: 'Database error', details: err.message });
              }

              if (results.length === 0) {
                  return sendResponse(res, 404, { message: 'No recommendations found' });
              }

              sendResponse(res, 200, { recommendations: results });
          });
      });
  },

  'GET:/books/recommendations': (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    const genre = query.genre;
    const author = query.author;

    if (!genre && !author) {
        return sendResponse(res, 400, { error: 'At least one filter (genre or author) must be provided' });
    }

    let sql = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (genre) {
        sql += ' AND genre = ?';
        params.push(genre);
    }

    if (author) {
        sql += ' AND author LIKE ?';
        params.push(`%${author}%`);
    }

   let limit = query.limit ? parseInt(query.limit) : 5;

   sql += ` LIMIT ${limit}`;

    pool.query(sql, params, (err, results) => {
        if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        if (results.length === 0) {
            return sendResponse(res, 404, { message: 'No recommendations found' });
        }

        sendResponse(res, 200, { recommendations: results });
    });
  },

   //////////////////////////

  'POST:/books': async (req, res) => {
    try {
      const bookData = await getRequestBody(req);

      const validationErrors = validateBookData(bookData);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query(
        'INSERT INTO books (title, author, genre, published_year, isbn) VALUES (?, ?, ?, ?, ?)',
        [bookData.title, bookData.author, bookData.genre, bookData.published_year, bookData.isbn],
        (err, result) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return sendResponse(res, 409, { error: 'Book with this ISBN already exists' });
            }
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          const newBook = {
            id: result.insertId,
            ...bookData,
            created_at: new Date()
          };

          res.writeHead(201, {
            'Content-Type': 'application/json',
            'Location': `/books/${result.insertId}`
          });
          res.end(JSON.stringify(newBook));
        }
      );
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'POST:/books/:id/': async (req, res, id) => {
    try {
      const bookData = await getRequestBody(req);

      const validationErrors = validateBookData(bookData);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query(
        'SELECT * FROM books WHERE id = ?',
        [id],
        (err, results) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          if (results.length > 0) {
            return sendResponse(res, 409, { error: 'Book with this ID already exists' });
          }

          pool.query(
            'INSERT INTO books (id, title, author, genre, published_year, isbn) VALUES (?, ?, ?, ?, ?, ?)',
            [id, bookData.title, bookData.author, bookData.genre, bookData.published_year, bookData.isbn],
            (err, result) => {
              if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                  return sendResponse(res, 409, { error: 'Book with this ISBN already exists' });
                }
                return sendResponse(res, 500, { error: 'Database error', details: err.message });
              }

              const newBook = {
                id: id,
                ...bookData,
                created_at: new Date()
              };

              res.writeHead(201, {
                'Content-Type': 'application/json',
                'Location': `/books/${id}`
              });
              res.end(JSON.stringify(newBook));
            }
          );
        }
      );
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

   //////////////////////////

  'PUT:/books/:id/': async (req, res, id) => {
    try {
      const bookData = await getRequestBody(req);

      const validationErrors = validateBookData(bookData);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query('SELECT * FROM books WHERE id = ?', [id], (err, results) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        if (results.length === 0) {
          return sendResponse(res, 404, { error: 'Book not found' });
        }

        pool.query(
          'UPDATE books SET title = ?, author = ?, genre = ?, published_year = ?, isbn = ? WHERE id = ?',
          [bookData.title, bookData.author, bookData.genre, bookData.published_year, bookData.isbn, id],
          (err, result) => {
            if (err) {
              if (err.code === 'ER_DUP_ENTRY') {
                return sendResponse(res, 409, { error: 'Book with this ISBN already exists' });
              }
              return sendResponse(res, 500, { error: 'Database error', details: err.message });
            }

            res.writeHead(204);
            res.end();
          }
        );
      });
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'PUT:/books': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  },

  //////////////////////////

  'PATCH:/books/:id/': async (req, res, id) => {
    try {
      const bookData = await getRequestBody(req);

      if (Object.keys(bookData).length === 0) {
        return sendResponse(res, 400, { error: 'Request body cannot be empty' });
      }

      const validationErrors = validateBookData(bookData, false);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query('SELECT * FROM books WHERE id = ?', [id], (err, results) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        if (results.length === 0) {
          return sendResponse(res, 404, { error: 'Book not found' });
        }

        const allowedFields = ['title', 'author', 'genre', 'published_year', 'isbn'];
        const updates = {};

        for (const field of allowedFields) {
          if (bookData[field] !== undefined) {
            updates[field] = bookData[field];
          }
        }

        if (Object.keys(updates).length === 0) {
          return sendResponse(res, 400, { error: 'No valid fields to update' });
        }

        const setClause = Object.keys(updates)
          .map(key => `${key} = ?`)
          .join(', ');

        const values = [...Object.values(updates), id];

        pool.query(
          `UPDATE books SET ${setClause} WHERE id = ?`,
          values,
          (err, result) => {
            if (err) {
              if (err.code === 'ER_DUP_ENTRY') {
                return sendResponse(res, 409, { error: 'Book with this ISBN already exists' });
              }
              return sendResponse(res, 500, { error: 'Database error', details: err.message });
            }

            sendResponse(res, 200, { message: 'Book updated successfully' });
          }
        );
      });
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'PATCH:/books': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  },

  //////////////////////////

  'DELETE:/books/:id/': (req, res, id) => {
    pool.query('SELECT * FROM books WHERE id = ?', [id], (err, results) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      if (results.length === 0) {
        return sendResponse(res, 404, { error: 'Book not found' });
      }

      pool.query('DELETE FROM books WHERE id = ?', [id], (err, result) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        sendResponse(res, 200, { message: 'Book deleted successfully' });
      });
    });
  },

  'DELETE:/books': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  }
}

module.exports = booksRoutes;