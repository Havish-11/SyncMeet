import { useCallback, useEffect, useRef, useState } from 'react';

// Messages only live while you're in the room (the server doesn't store history).
export function useChat(socket, { open, selfId }) {
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const onMsg = (m) => {
      setMessages((prev) => [...prev, m]);
      if (!openRef.current && m.userId !== selfId) setUnread((n) => n + 1);
    };
    socket.on('chat-message', onMsg);
    return () => socket.off('chat-message', onMsg);
  }, [socket, selfId]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  const send = useCallback((text) => {
    if (text.trim()) socket.emit('chat-message', { text });
  }, [socket]);

  return { messages, send, unread };
}