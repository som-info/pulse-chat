export const DEFAULT_ROOMS = ['general', 'random', 'dev-talk'];
export const MAX_MESSAGE = 1000;

const NICK_RE = /^[\p{L}\p{N}_\-. ]{2,20}$/u;
const ROOM_RE = /^[a-z0-9][a-z0-9-]{1,23}$/;

export function cleanNickname(value) {
  const nick = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!NICK_RE.test(nick)) return { error: 'Nickname must be 2–20 characters (letters, numbers, spaces, _ - .).' };
  return { value: nick };
}

export function cleanRoom(value) {
  const room = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!ROOM_RE.test(room)) return { error: 'Room name must be 2–24 characters: lowercase letters, numbers and dashes.' };
  return { value: room };
}

export function cleanText(value) {
  const text = String(value ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return { error: 'Message cannot be empty.' };
  if (text.length > MAX_MESSAGE) return { error: `Message is too long (max ${MAX_MESSAGE} characters).` };
  return { value: text };
}
