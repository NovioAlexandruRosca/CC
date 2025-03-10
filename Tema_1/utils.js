const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    const bodyParts = [];

    req.on('data', (chunk) => {
      bodyParts.push(chunk);
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(bodyParts).toString();

        if (!body) {
          resolve({});
          return;
        }

        const parsedBody = JSON.parse(body);
        resolve(parsedBody);
      } catch (err) {
        reject(new Error('Invalid JSON format in request body'));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
};


const sendResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};


module.exports = { getRequestBody, sendResponse };
