import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  port: Number(process.env.PORT) || 4100,
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  // Set HISTORY_FILE="" to keep history in memory only.
  historyFile: process.env.HISTORY_FILE === '' ? null : path.resolve(root, process.env.HISTORY_FILE || 'data/history.json'),
  historyLimit: Number(process.env.HISTORY_LIMIT) || 100,
  clientDist: path.resolve(root, '../client/dist'),
};
