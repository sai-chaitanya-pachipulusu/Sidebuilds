const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API routes to the backend server
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5002',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyReq.path}`);
      }
    })
  );
  
  // Optional: Also proxy socket.io requests
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:5002',
      changeOrigin: true,
      ws: true // Enable websocket proxying
    })
  );
};
