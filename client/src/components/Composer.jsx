import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';

const MAX = 1000;

export default function Composer({ room, onSend }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const typingRef = useRef(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const stopTyping = () => {
    clearTimeout(timerRef.current);
    if (typingRef.current) { typingRef.current = false; socket.emit('typing', false); }
  };

  useEffect(() => { inputRef.current?.focus(); return stopTyping; }, [room]);

  function handleChange(e) {
    setText(e.target.value);
    setError('');
    if (!typingRef.current) { typingRef.current = true; socket.emit('typing', true); }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(stopTyping, 1500);
  }

  async function submit(e) {
    e?.preventDefault();
    const value = text.trim();
    if (!value) return;
    stopTyping();
    const res = await onSend(value);
    if (res?.error) setError(res.error); else setText('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
    <form className="composer" onSubmit={submit}>
      {error && <p className="error small" role="alert">{error}</p>}
      <div className="composer-row">
        <label className="sr-only" htmlFor="message">Message #{room}</label>
        <textarea id="message" ref={inputRef} rows={1} value={text} maxLength={MAX} placeholder={`Message #${room}`}
          onChange={handleChange} onKeyDown={onKeyDown} />
        <button className="send" type="submit" disabled={!text.trim()} aria-label="Send message">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 21 3l-8.5 18-2-7.5z" /></svg>
        </button>
      </div>
      <p className="hint">Enter to send · Shift + Enter for a new line{text.length > MAX - 100 ? ` · ${MAX - text.length} left` : ''}</p>
    </form>
  );
}
