import { io } from 'socket.io-client';

// Same origin by default (Vite proxy in dev, Express static hosting in production).
const url = import.meta.env.VITE_SERVER_URL || undefined;

export const socket = io(url, { autoConnect: false });

/** Emit an event and resolve with the server acknowledgement (or a timeout error). */
export function request(event, payload, timeout = 5000) {
  return new Promise((resolve) => {
    socket.timeout(timeout).emit(event, payload, (err, res) => {
      resolve(err ? { error: 'The server did not respond. Please try again.' } : res);
    });
  });
}
