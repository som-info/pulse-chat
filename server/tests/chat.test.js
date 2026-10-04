import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { io as connect } from 'socket.io-client';
import { createChatServer } from '../src/app.js';
import { History } from '../src/history.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-'));
const historyFile = path.join(tmpDir, 'history.json');
let chat, url;
const clients = [];

before(async () => {
  chat = createChatServer({ historyFile, historyLimit: 5 });
  await new Promise((r) => chat.server.listen(0, r));
  url = `http://localhost:${chat.server.address().port}`;
});
after(async () => {
  clients.forEach((c) => c.close());
  chat.io.close();
  await new Promise((r) => chat.server.close(r));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const client = () => { const c = connect(url, { transports: ['websocket'], forceNew: true }); clients.push(c); return c; };
const emit = (c, ev, data) => new Promise((r) => c.emit(ev, data, r));
const next = (c, ev, pred = () => true) => new Promise((r) => { const h = (d) => { if (pred(d)) { c.off(ev, h); r(d); } }; c.on(ev, h); });

test('health and rooms endpoints', async () => {
  assert.equal((await (await fetch(`${url}/api/health`)).json()).status, 'ok');
  const rooms = await (await fetch(`${url}/api/rooms`)).json();
  assert.deepEqual(rooms.map((r) => r.name).slice(0, 3), ['general', 'random', 'dev-talk']);
});

test('rejects invalid nickname and room', async () => {
  const a = client();
  assert.match((await emit(a, 'join', { nickname: 'x', room: 'general' })).error, /Nickname/);
  assert.match((await emit(a, 'join', { nickname: 'Valid', room: '!!' })).error, /Room/);
});

test('join, online users, messages, typing and history', async () => {
  const a = client(); const b = client();
  const ja = await emit(a, 'join', { nickname: 'Alice', room: 'general' });
  assert.equal(ja.ok, true);
  const usersUpdate = next(a, 'users', (u) => u.length === 2);
  const joinedNotice = next(a, 'message', (m) => m.type === 'system');
  const jb = await emit(b, 'join', { nickname: 'Bob', room: 'general' });
  assert.deepEqual(jb.users.map((u) => u.nickname), ['Alice', 'Bob']);
  assert.deepEqual((await usersUpdate).map((u) => u.nickname), ['Alice', 'Bob']);
  assert.match((await joinedNotice).text, /Bob joined/);

  const typing = next(b, 'typing');
  a.emit('typing', true);
  assert.deepEqual(await typing, { nickname: 'Alice', isTyping: true });

  const received = next(b, 'message', (m) => m.type === 'user');
  const sent = await emit(a, 'message', { text: '  Hello Bob!  ' });
  assert.equal(sent.message.text, 'Hello Bob!');
  assert.equal((await received).nickname, 'Alice');

  assert.match((await emit(a, 'message', { text: '   ' })).error, /empty/);
  const hist = await (await fetch(`${url}/api/rooms/general/messages`)).json();
  assert.equal(hist.at(-1).text, 'Hello Bob!');
});

test('nickname must be unique within a room', async () => {
  const c = client();
  const res = await emit(c, 'join', { nickname: 'alice', room: 'general' });
  assert.match(res.error, /already used/);
  assert.equal((await emit(c, 'join', { nickname: 'alice', room: 'random' })).ok, true);
});

test('custom rooms appear in the room list and history is capped', async () => {
  const d = client();
  const res = await emit(d, 'join', { nickname: 'Dana', room: 'Book Club' });
  assert.equal(res.room, 'book-club');
  assert.ok(res.rooms.some((r) => r.name === 'book-club' && r.online === 1));
  for (let i = 0; i < 7; i++) await emit(d, 'message', { text: `msg ${i}` });
  const hist = chat.history.get('book-club');
  assert.equal(hist.length, 5);
  assert.equal(hist[0].text, 'msg 2');
});

test('history persists to the JSON file', async () => {
  chat.history.saveNow();
  const reloaded = new History({ file: historyFile, limit: 5 });
  assert.equal(reloaded.get('book-club').at(-1).text, 'msg 6');
});

test('message before join is rejected', async () => {
  const e = client();
  assert.match((await emit(e, 'message', { text: 'hi' })).error, /Join a room/);
});
