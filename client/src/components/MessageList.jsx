import { useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { dayLabel, formatTime } from '../utils.js';

export default function MessageList({ messages, me }) {
  const endRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    // Auto-scroll only if the user is already near the bottom (or the list just loaded).
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom || messages.length < 2 || messages.at(-1)?.userId === me.id) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, me.id]);

  if (!messages.length) {
    return <div className="messages empty" ref={listRef}><p>No messages yet. Say hello 👋</p></div>;
  }

  let lastDay = '';
  let prev = null;
  return (
    <ol className="messages" ref={listRef} aria-live="polite" aria-label="Messages">
      {messages.map((m) => {
        const day = dayLabel(m.ts);
        const showDay = day !== lastDay;
        lastDay = day;
        const grouped = prev && prev.type === 'user' && m.type === 'user' && prev.nickname === m.nickname && m.ts - prev.ts < 5 * 60 * 1000 && !showDay;
        prev = m;
        return (
          <li key={m.id} className="msg-row">
            {showDay && <div className="day-sep"><span>{day}</span></div>}
            {m.type === 'system' ? (
              <p className="system">{m.text} · {formatTime(m.ts)}</p>
            ) : (
              <div className={`msg${m.nickname === me.nickname ? ' mine' : ''}${grouped ? ' grouped' : ''}`}>
                {!grouped ? <Avatar name={m.nickname} /> : <span className="avatar-spacer" />}
                <div className="bubble-wrap">
                  {!grouped && (
                    <p className="msg-meta"><strong>{m.nickname}</strong> <time dateTime={new Date(m.ts).toISOString()}>{formatTime(m.ts)}</time></p>
                  )}
                  <p className="bubble">{m.text}</p>
                </div>
              </div>
            )}
          </li>
        );
      })}
      <li ref={endRef} aria-hidden="true" />
    </ol>
  );
}
