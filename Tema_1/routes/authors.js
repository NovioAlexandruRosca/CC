const url = require('url');
const mysql = require('mysql2');
const { getRequestBody, sendResponse } = require('../utils');
const { validateAuthorData} = require('../validation_scripts');

const dbConfig = require('../config')
const pool = mysql.createPool(dbConfig);

const authorsRoutes = {

  'GET:/authors': (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    let sql = 'SELECT * FROM authors';
    const params = [];
    const conditions = [];

    if (query.country) {
      conditions.push('country = ?');
      params.push(query.country);
    }

    if (query.name) {
      conditions.push('name LIKE ?');
      params.push(`%${query.name}%`);
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

      pool.query('SELECT COUNT(*) as count FROM authors', (err, countResult) => {
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

  'GET:/authors/:id/': (req, res, id) => {
    pool.query('SELECT * FROM authors WHERE id = ?', [id], (err, results) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      if (results.length === 0) {
        return sendResponse(res, 404, { error: 'Author not found' });
      }

      pool.query('SELECT * FROM books WHERE author LIKE ?', [`%${results[0].name}%`], (err, books) => {
        if (err) {
          return sendResponse(res, 200, results[0]);
        }

        const authorWithBooks = {
          ...results[0],
          books
        };

        sendResponse(res, 200, authorWithBooks);
      });
    });
  },

  //////////////////////////

  'POST:/authors': async (req, res) => {
    try {
      const authorData = await getRequestBody(req);

      const validationErrors = validateAuthorData(authorData);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query(
        'INSERT INTO authors (name, biography, birth_year, country) VALUES (?, ?, ?, ?)',
        [authorData.name, authorData.biography, authorData.birth_year, authorData.country],
        (err, result) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          const newAuthor = {
            id: result.insertId,
            ...authorData,
            created_at: new Date()
          };

          res.writeHead(201, {
            'Content-Type': 'application/json',
            'Location': `/authors/${result.insertId}`
          });
          res.end(JSON.stringify(newAuthor));
        }
      );
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'POST:/authors/:id/': async (req, res, id) => {
    try {
      const authorData = await getRequestBody(req);

      const validationErrors = validateAuthorData(authorData);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query(
        'SELECT * FROM authors WHERE id = ?',
        [id],
        (err, results) => {
          if (err) {
            return sendResponse(res, 500, { error: 'Database error', details: err.message });
          }

          if (results.length > 0) {
            return sendResponse(res, 409, { error: 'Author with this ID already exists' });
          }

          pool.query(
            'INSERT INTO authors (id, name, biography, birth_year, country) VALUES (?, ?, ?, ?, ?)',
            [id, authorData.name, authorData.biography, authorData.birth_year, authorData.country],
            (err, result) => {
              if (err) {
                return sendResponse(res, 500, { error: 'Database error', details: err.message });
              }

              const newAuthor = {
                id: id,
                ...authorData,
                created_at: new Date()
              };

              res.writeHead(201, {
                'Content-Type': 'application/json',
                'Location': `/authors/${id}`
              });
              res.end(JSON.stringify(newAuthor));
            }
          );
        }
      );
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  //////////////////////////

  'PUT:/authors/:id/': async (req, res, id) => {
    try {
      const authorData = await getRequestBody(req);

      const validationErrors = validateAuthorData(authorData);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query('SELECT * FROM authors WHERE id = ?', [id], (err, results) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        if (results.length === 0) {
          return sendResponse(res, 404, { error: 'Author not found' });
        }

        pool.query(
          'UPDATE authors SET name = ?, biography = ?, birth_year = ?, country = ? WHERE id = ?',
          [authorData.name, authorData.biography, authorData.birth_year, authorData.country, id],
          (err, result) => {
            if (err) {
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

  'PUT:/authors': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  },

  //////////////////////////

  'PATCH:/authors/:id/': async (req, res, id) => {
    try {
      const authorData = await getRequestBody(req);

      if (Object.keys(authorData).length === 0) {
        return sendResponse(res, 400, { error: 'Request body cannot be empty' });
      }

      const validationErrors = validateAuthorData(authorData, false);
      if (validationErrors.length > 0) {
        return sendResponse(res, 400, { errors: validationErrors });
      }

      pool.query('SELECT * FROM authors WHERE id = ?', [id], (err, results) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        if (results.length === 0) {
          return sendResponse(res, 404, { error: 'Author not found' });
        }

        const allowedFields = ['name', 'biography', 'birth_year', 'country'];
        const updates = {};

        for (const field of allowedFields) {
          if (authorData[field] !== undefined) {
            updates[field] = authorData[field];
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
          `UPDATE authors SET ${setClause} WHERE id = ?`,
          values,
          (err, result) => {
            if (err) {
              return sendResponse(res, 500, { error: 'Database error', details: err.message });
            }

            sendResponse(res, 200, { message: 'Author updated successfully' });
          }
        );
      });
    } catch (err) {
      sendResponse(res, 400, { error: 'Invalid JSON in request body' });
    }
  },

  'PATCH:/authors': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  },

  //////////////////////////

  'DELETE:/authors/:id/': (req, res, id) => {
    pool.query('SELECT * FROM authors WHERE id = ?', [id], (err, results) => {
      if (err) {
        return sendResponse(res, 500, { error: 'Database error', details: err.message });
      }

      if (results.length === 0) {
        return sendResponse(res, 404, { error: 'Author not found' });
      }

      pool.query('DELETE FROM authors WHERE id = ?', [id], (err, result) => {
        if (err) {
          return sendResponse(res, 500, { error: 'Database error', details: err.message });
        }

        sendResponse(res, 200, { message: 'Author deleted successfully' });
      });
    });
  },

  'DELETE:/authors': (req, res) => {
    sendResponse(res, 405, { error: 'Method Not Allowed on entire collection' });
  }
}

module.exports = authorsRoutes;