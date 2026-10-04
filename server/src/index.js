import { createChatServer } from './app.js';
import { config } from './config.js';

const { server, history, io } = createChatServer(config);

server.listen(config.port, () => {
  console.log(`Pulse Chat server listening on http://localhost:${config.port}`);
  console.log(config.historyFile ? `Message history: ${config.historyFile}` : 'Message history: in memory only');
});

function shutdown() {
  history.saveNow();
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
