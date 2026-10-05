import { useEffect, useRef, useState } from 'react';

export default function ChatPanel({ messages, onSend, selfId }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function submit(event) {
    event.preventDefault();

    if (!text.trim()) return;

    onSend(text);
    setText('');
  }

  return (
    <div className="panel chat">
      <h3>Chat</h3>

      <div className="chat-list">
        {messages.length === 0 && (
          <p className="muted">No messages yet.</p>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`msg ${message.userId === selfId ? 'mine' : ''}`}
          >
            <div className="meta">
              {message.userId === selfId ? 'You' : message.name}
              {' - '}
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>

            <div>{message.text}</div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form className="row" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message..."
          maxLength={2000}
        />
        <button>Send</button>
      </form>
    </div>
  );
}
