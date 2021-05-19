const app = require('./app');
const { PORT } = require('./config');

const server = require('http').createServer(app.callback());
server.listen(PORT, '0.0.0.0');

module.exports = app;
