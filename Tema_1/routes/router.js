const booksRoutes = require('./books');
const authorsRoutes = require('./authors');
const librariesRoutes = require('./library');
const libraryManagerRoutes = require('./library-books');
const {sendResponse} = require("../utils");

const routes = {
  ...booksRoutes,
  ...authorsRoutes,
  ...librariesRoutes,
  ...libraryManagerRoutes,
  'default': (req, res) => {
    sendResponse(res, 404, { error: 'Endpoint not found' });
  }
};


module.exports = routes;