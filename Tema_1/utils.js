const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    const bodyParts = [];
    
    req.on('data', (chunk) => {
      bodyParts.push(chunk);
    });
    
    req.on('end', () => {
      const body = Buffer.concat(bodyParts).toString();
      resolve(body ? JSON.parse(body) : {});
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
