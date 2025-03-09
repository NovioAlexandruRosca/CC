require('dotenv').config();
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

const routes = require('./routes/router');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  const path = decodeURIComponent(parsedUrl.pathname);
  const trimmedPath = path.replace(/[\n\r]/g, '').replace(/\/$/, '');

  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const booksIdMatch = trimmedPath.match(/^\/books\/(\d+)$/);
  const authorsIdMatch = trimmedPath.match(/^\/authors\/(\d+)$/);
  const librariesIdMatch = trimmedPath.match(/^\/libraries\/(\d+)$/);
  const libraryManagerIdMatch = trimmedPath.match(/^\/library-books\/(\d+)$/)

  const bookRecommendationsMatch = trimmedPath.match(/^\/books\/(\d+)\/recommendations$/)
  const libraryStatsMatch = trimmedPath.match(/^\/libraries\/(\d+)\/stats$/);


  if (booksIdMatch) {
    const id = booksIdMatch[1];
    const routeKey = `${method}:/books/:id/`;

    if (routes[routeKey]) {
      return routes[routeKey](req, res, id);
    }
  } else if (authorsIdMatch) {
    const id = authorsIdMatch[1];
    const routeKey = `${method}:/authors/:id/`;

    if (routes[routeKey]) {
      return routes[routeKey](req, res, id);
    }
  } else if (librariesIdMatch){
    const id = librariesIdMatch[1];
    const routeKey = `${method}:/libraries/:id/`;

    if (routes[routeKey]) {
      return routes[routeKey](req, res, id);
    }
  } else if (libraryManagerIdMatch){
    const id = libraryManagerIdMatch[1];
    const routeKey = `${method}:/library-books/:id/`;

    if (routes[routeKey]) {
      return routes[routeKey](req, res, id);
    }
  } else if (bookRecommendationsMatch) {
    const id = bookRecommendationsMatch[1];
    const routeKey = `GET:/books/:id/recommendations/`;

    if (routes[routeKey]) {
        return routes[routeKey](req, res, id);
    }
  }else if (libraryStatsMatch) {
    const libraryId = libraryStatsMatch[1];
    const routeKey = `GET:/libraries/:library_id/stats`;

    if (routes[routeKey]) {
        return routes[routeKey](req, res, libraryId);
    }
}


  const routeKey = `${method}:${trimmedPath}`;

  console.log(routeKey)

  if (routes[routeKey]) {
    return routes[routeKey](req, res);
  }

  routes.default(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});