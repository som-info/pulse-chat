import { useState } from 'react';

export default function JoinScreen({ rooms, initialNickname, onJoin, connected }) {
  const [nickname, setNickname] = useState(initialNickname);
  const [room, setRoom] = useState('general');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const nick = nickname.trim();
    if (nick.length < 2 || nick.length > 20) return setError('Nickname must be 2–20 characters.');
    setBusy(true);
    const res = await onJoin(nick, room);
    setBusy(false);
    if (res?.error) setError(res.error);
  }

  return (
    <main className="join">
      <form className="join-card" onSubmit={submit} noValidate>
        <div className="join-logo" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M4 17h6l3-8 6 15 3-7h6" /></svg>
        </div>
        <h1>Pulse Chat</h1>
        <p className="muted">Real-time chat rooms. Pick a nickname and jump in.</p>

        <label htmlFor="nickname">Nickname</label>
        <input id="nickname" value={nickname} onChange={(e) => { setNickname(e.target.value); setError(''); }}
          maxLength={20} autoComplete="nickname" autoFocus placeholder="e.g. Alex" aria-invalid={Boolean(error)} aria-describedby="join-error" />

        <label htmlFor="room">Room</label>
        <select id="room" value={room} onChange={(e) => setRoom(e.target.value)}>
          {rooms.map((r) => <option key={r.name} value={r.name}>#{r.name} {r.online ? `· ${r.online} online` : ''}</option>)}
        </select>

        <p id="join-error" className="error" role="alert">{error}</p>
        <button className="btn" type="submit" disabled={busy || !connected}>{connected ? (busy ? 'Joining…' : 'Join chat') : 'Connecting…'}</button>
      </form>
    </main>
  );
}
