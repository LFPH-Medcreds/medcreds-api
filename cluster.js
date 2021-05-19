const cluster = require('cluster');
const os = require('os');

const CPUS = os.cpus();

if (cluster.isMaster) {
  CPUS.forEach(() => {
    cluster.fork();
  });
  cluster.on('listening', (worker) => {
    console.log(`Cluster ${worker.process.pid} connected`);
  });
  cluster.on('disconnect', (worker) => {
    console.log(`Cluster ${worker.process.pid} disconnected`);
  });
  cluster.on('exit', (worker) => {
    console.log(`Cluster ${worker.process.pid} is dead, starting new one`);
    cluster.fork();
  });
} else {
  require('./server.js');
}
