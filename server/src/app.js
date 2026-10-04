import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { History } from './history.js';
import { DEFAULT_ROOMS, cleanNickname, cleanRoom, cleanText } from './validate.js';

/**
 * Creates the HTTP server, Express app and Socket.IO server.
 * Returns { server, io, history } so tests can start it on a random port.
 */
export function createChatServer({ clientOrigin = ['http://localhost:5173'], historyFile = null, historyLimit = 100, clientDist = null } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: clientOrigin } });
  const history = new History({ file: historyFile, limit: historyLimit });
  DEFAULT_ROOMS.forEach((r) => history.ensure(r));

  /** socket.id -> { id, nickname, room } */
  const users = new Map();

  const usersIn = (room) =>
    [...users.values()].filter((u) => u.room === room).map((u) => ({ id: u.id, nickname: u.nickname })).sort((a, b) => a.nickname.localeCompare(b.nickname));

  const roomList = () => {
    const names = new Set([...DEFAULT_ROOMS, ...history.roomNames(), ...[...users.values()].map((u) => u.room)]);
    return [...names].map((name) => ({ name, online: usersIn(name).length, isDefault: DEFAULT_ROOMS.includes(name) }));
  };

  const systemMessage = (room, text) => ({ id: randomUUID(), room, type: 'system', text, ts: Date.now() });

  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()) }));
  app.get('/api/rooms', (_req, res) => res.json(roomList()));
  app.get('/api/rooms/:room/messages', (req, res) => {
    const { value, error } = cleanRoom(req.params.room);
    if (error) return res.status(400).json({ error });
    res.json(history.get(value));
  });

  // Serve the built React client in production (npm run build in /client).
  if (clientDist && fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  io.on('connection', (socket) => {
    const leaveCurrent = () => {
      const user = users.get(socket.id);
      if (!user) return;
      socket.leave(user.room);
      users.delete(socket.id);
      socket.to(user.room).emit('typing', { nickname: user.nickname, isTyping: false });
      socket.to(user.room).emit('message', systemMessage(user.room, `${user.nickname} left the room`));
      io.to(user.room).emit('users', usersIn(user.room));
    };

    socket.on('join', (payload = {}, ack = () => {}) => {
      if (typeof ack !== 'function') return;
      const nick = cleanNickname(payload.nickname);
      if (nick.error) return ack({ error: nick.error });
      const room = cleanRoom(payload.room || 'general');
      if (room.error) return ack({ error: room.error });

      const current = users.get(socket.id);
      if (current && current.room === room.value && current.nickname === nick.value) {
        return ack({ ok: true, user: current, room: room.value, history: history.get(room.value), users: usersIn(room.value), rooms: roomList() });
      }
      const taken = [...users.values()].some(
        (u) => u.id !== socket.id && u.room === room.value && u.nickname.toLowerCase() === nick.value.toLowerCase(),
      );
      if (taken) return ack({ error: `The nickname “${nick.value}” is already used in #${room.value}.` });

      leaveCurrent();
      const user = { id: socket.id, nickname: nick.value, room: room.value };
      users.set(socket.id, user);
      history.ensure(room.value);
      socket.join(room.value);

      ack({ ok: true, user, room: room.value, history: history.get(room.value), users: usersIn(room.value), rooms: roomList() });
      socket.to(room.value).emit('message', systemMessage(room.value, `${user.nickname} joined the room`));
      io.to(room.value).emit('users', usersIn(room.value));
      io.emit('rooms', roomList());
    });

    socket.on('message', (payload = {}, ack = () => {}) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const user = users.get(socket.id);
      if (!user) return reply({ error: 'Join a room first.' });
      const text = cleanText(payload.text);
      if (text.error) return reply({ error: text.error });
      const message = history.add(user.room, { id: randomUUID(), room: user.room, type: 'user', nickname: user.nickname, userId: user.id, text: text.value, ts: Date.now() });
      io.to(user.room).emit('message', message);
      reply({ ok: true, message });
    });

    socket.on('typing', (isTyping) => {
      const user = users.get(socket.id);
      if (user) socket.to(user.room).emit('typing', { nickname: user.nickname, isTyping: Boolean(isTyping) });
    });

    socket.on('leave', () => { leaveCurrent(); io.emit('rooms', roomList()); });
    socket.on('disconnect', () => {
      const had = users.has(socket.id);
      leaveCurrent();
      if (had) io.emit('rooms', roomList());
    });
  });

  return { app, server, io, history };
}
