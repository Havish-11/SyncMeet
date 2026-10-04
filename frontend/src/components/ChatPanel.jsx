import { useEffect, useRef, useState } from 'react';

export default function ChatPanel({ messages, onSend, selfId }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    onSend(text);
    setText('');
  };

  return (
    <div className="panel chat">
      <h3>Chat</h3>
      <div className="chat-list">
        {messages.length === 0 && <p className="muted">No messages yet.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.userId === selfId ? 'mine' : ''}`}>
            <div className="meta">
              {m.userId === selfId ? 'You' : m.name} · {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div>{m.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="row" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" maxLength={2000} />
        <button>Send</button>
      </form>
    </div>
  );
}