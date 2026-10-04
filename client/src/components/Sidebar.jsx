import { useState } from 'react';
import Avatar from './Avatar.jsx';

export default function Sidebar({ rooms, currentRoom, users, me, onSwitch, onLeave, open, onClose }) {
  const [newRoom, setNewRoom] = useState('');
  const [error, setError] = useState('');

  async function create(e) {
    e.preventDefault();
    const name = newRoom.trim().toLowerCase().replace(/\s+/g, '-');
    if (!/^[a-z0-9][a-z0-9-]{1,23}$/.test(name)) return setError('2–24 chars: a–z, 0–9, dashes');
    const res = await onSwitch(name);
    if (res?.error) setError(res.error); else { setNewRoom(''); setError(''); }
  }

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Rooms and online users">
      <div className="sidebar-head">
        <span className="brand"><span className="brand-dot" aria-hidden="true" />Pulse Chat</span>
        <button className="icon-btn only-mobile" onClick={onClose} aria-label="Close sidebar">✕</button>
      </div>

      <h2>Rooms</h2>
      <ul className="room-list">
        {rooms.map((r) => (
          <li key={r.name}>
            <button className={r.name === currentRoom ? 'active' : ''} aria-current={r.name === currentRoom ? 'true' : undefined} onClick={() => onSwitch(r.name)}>
              <span># {r.name}</span>
              {r.online > 0 && <span className="pill">{r.online}</span>}
            </button>
          </li>
        ))}
      </ul>
      <form className="new-room" onSubmit={create}>
        <label className="sr-only" htmlFor="new-room">New room name</label>
        <input id="new-room" value={newRoom} onChange={(e) => { setNewRoom(e.target.value); setError(''); }} placeholder="New room…" maxLength={24} />
        <button className="icon-btn" type="submit" aria-label="Create room">+</button>
      </form>
      {error && <p className="error small" role="alert">{error}</p>}

      <h2>Online in #{currentRoom} — {users.length}</h2>
      <ul className="user-list">
        {users.map((u) => (
          <li key={u.id}>
            <Avatar name={u.nickname} size={28} />
            <span>{u.nickname}{u.id === me.id && <em> (you)</em>}</span>
            <span className="online-dot" aria-label="online" />
          </li>
        ))}
      </ul>

      <div className="me">
        <Avatar name={me.nickname} size={32} />
        <span className="me-name">{me.nickname}</span>
        <button className="link-btn" onClick={onLeave}>Leave</button>
      </div>
    </aside>
  );
}
