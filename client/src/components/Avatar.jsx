import { colorFor, initials } from '../utils.js';

export default function Avatar({ name, size = 36 }) {
  return (
    <span className="avatar" style={{ background: colorFor(name), width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
