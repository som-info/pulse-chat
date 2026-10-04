import fs from 'node:fs';
import path from 'node:path';

/**
 * Per-room message history kept in memory and (optionally) persisted to a JSON file.
 * Writes are debounced and atomic (write to tmp file, then rename).
 */
export class History {
  constructor({ file = null, limit = 100 } = {}) {
    this.file = file;
    this.limit = limit;
    this.rooms = new Map();
    this.timer = null;
    this.load();
  }

  load() {
    if (!this.file || !fs.existsSync(this.file)) return;
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const [room, msgs] of Object.entries(data.rooms || {})) {
        if (Array.isArray(msgs)) this.rooms.set(room, msgs.slice(-this.limit));
      }
    } catch (err) {
      console.warn(`[history] could not read ${this.file}: ${err.message} – starting empty`);
    }
  }

  roomNames() {
    return [...this.rooms.keys()];
  }

  get(room) {
    return this.rooms.get(room) || [];
  }

  ensure(room) {
    if (!this.rooms.has(room)) this.rooms.set(room, []);
  }

  add(room, message) {
    this.ensure(room);
    const list = this.rooms.get(room);
    list.push(message);
    if (list.length > this.limit) list.splice(0, list.length - this.limit);
    this.scheduleSave();
    return message;
  }

  scheduleSave() {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.saveNow(); }, 300);
  }

  saveNow() {
    if (!this.file) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ rooms: Object.fromEntries(this.rooms) }, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
