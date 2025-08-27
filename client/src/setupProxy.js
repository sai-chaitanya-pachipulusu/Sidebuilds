const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API routes to the backend server
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
  
  // Optional: Also proxy socket.io requests
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      ws: true // Enable websocket proxying
    })
  );
};