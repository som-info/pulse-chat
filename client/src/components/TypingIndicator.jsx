export default function TypingIndicator({ names }) {
  let text = '';
  if (names.length === 1) text = `${names[0]} is typing`;
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing`;
  else if (names.length > 2) text = 'Several people are typing';
  return (
    <div className="typing" aria-live="polite">
      {text && (<><span className="dots" aria-hidden="true"><i /><i /><i /></span>{text}…</>)}
    </div>
  );
}
