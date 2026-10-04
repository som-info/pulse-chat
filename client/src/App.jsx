import { useCallback, useEffect, useState } from 'react';
import { request, socket } from './socket.js';
import { NICK_KEY } from './utils.js';
import JoinScreen from './components/JoinScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import MessageList from './components/MessageList.jsx';
import TypingIndicator from './components/TypingIndicator.jsx';
import Composer from './components/Composer.jsx';

const DEFAULT_ROOMS = [{ name: 'general', online: 0 }, { name: 'random', online: 0 }, { name: 'dev-talk', online: 0 }];

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState('general');
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const join = useCallback(async (nickname, roomName) => {
    const res = await request('join', { nickname, room: roomName });
    if (res?.ok) {
      setMe(res.user);
      setRoom(res.room);
      setMessages(res.history);
      setUsers(res.users);
      setRooms(res.rooms);
      setTyping([]);
      setSidebarOpen(false);
      localStorage.setItem(NICK_KEY, nickname);
    }
    return res;
  }, []);

  useEffect(() => {
    socket.connect();
    fetch('/api/rooms').then((r) => (r.ok ? r.json() : null)).then((data) => data && setRooms(data)).catch(() => {});
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMessage = (m) => setMessages((list) => [...list, m]);
    const onUsers = (u) => setUsers(u);
    const onRooms = (r) => setRooms(r);
    const onTyping = ({ nickname, isTyping }) =>
      setTyping((list) => (isTyping ? [...new Set([...list, nickname])] : list.filter((n) => n !== nickname)));
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', onMessage);
    socket.on('users', onUsers);
    socket.on('rooms', onRooms);
    socket.on('typing', onTyping);
    return () => {
      socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('message', onMessage);
      socket.off('users', onUsers); socket.off('rooms', onRooms); socket.off('typing', onTyping);
      socket.disconnect();
    };
  }, []);

  // Re-join automatically after a dropped connection.
  useEffect(() => {
    if (connected && me) join(me.nickname, room);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const leave = () => { socket.emit('leave'); setMe(null); setMessages([]); setUsers([]); };
  const send = (text) => request('message', { text });

  if (!me) {
    return <JoinScreen rooms={rooms} connected={connected} initialNickname={localStorage.getItem(NICK_KEY) || ''} onJoin={join} />;
  }

  const current = rooms.find((r) => r.name === room);
  return (
    <div className="chat">
      <Sidebar rooms={rooms} currentRoom={room} users={users} me={me} open={sidebarOpen}
        onClose={() => setSidebarOpen(false)} onSwitch={(r) => join(me.nickname, r)} onLeave={leave} />
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <main className="room">
        <header className="room-head">
          <button className="icon-btn only-mobile" onClick={() => setSidebarOpen(true)} aria-label="Open rooms and users">☰</button>
          <div>
            <h1># {room}</h1>
            <p className="muted small">{current?.online ?? users.length} online{current?.isDefault ? '' : ' · custom room'}</p>
          </div>
          <span className={`status ${connected ? 'on' : 'off'}`}>{connected ? 'Connected' : 'Reconnecting…'}</span>
        </header>
        <MessageList messages={messages} me={me} />
        <TypingIndicator names={typing} />
        <Composer room={room} onSend={send} />
      </main>
    </div>
  );
}
