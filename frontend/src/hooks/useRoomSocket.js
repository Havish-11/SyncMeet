import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../socket.js';

const TERMINAL = ['error', 'replaced', 'kicked'];

// Owns the socket + room membership. status: connecting | joined | reconnecting | error | replaced | kicked
export function useRoomSocket(roomId, token, initialMedia) {
  const [socket] = useState(() => createSocket(token));
  const media = useRef(initialMedia); // mic/cam at mount time, sent with join-room
  const initialPeersRef = useRef([]); // peers present at join: we send offers to these
  const [status, setStatus] = useState('connecting');
  const [hostId, setHostId] = useState(null);
  const [peers, setPeers] = useState([]); // [{userId, name, mic, cam, sharing}] (everyone but me)
  const [joinEpoch, setJoinEpoch] = useState(0); // +1 per successful (re)join

  useEffect(() => {
    const join = () =>
      socket.emit('join-room', { roomId, ...media.current }, (res) => {
        if (res?.error) { setStatus('error'); return; }
        initialPeersRef.current = res.peers;
        setHostId(res.hostId);
        setPeers(res.peers);
        setStatus('joined');
        setJoinEpoch((e) => e + 1);
      });

    const terminate = (s) => { setStatus(s); socket.disconnect(); };

    socket.on('connect', join); // also fires after an automatic reconnect -> rejoin
    socket.on('connect_error', (err) => { if (err.message === 'unauthorized') setStatus('error'); });
    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      setStatus((s) => (TERMINAL.includes(s) ? s : 'reconnecting'));
    });
    socket.on('user-joined', (p) => setPeers((prev) => [...prev.filter((x) => x.userId !== p.userId), p]));
    socket.on('user-left', ({ userId }) => setPeers((prev) => prev.filter((x) => x.userId !== userId)));
    socket.on('media-state', ({ userId, mic, cam, sharing }) =>
      setPeers((prev) => prev.map((x) => (x.userId === userId ? { ...x, mic, cam, sharing } : x))));
    socket.on('host-changed', ({ hostId }) => setHostId(hostId));
    socket.on('replaced', () => terminate('replaced'));
    socket.on('kicked', () => terminate('kicked'));

    socket.connect(); // after listeners are attached

    return () => {
      socket.emit('leave-room');
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket, roomId]);

  const kick = useCallback((userId) => socket.emit('kick', { userId }), [socket]);

  return { socket, status, hostId, peers, joinEpoch, initialPeersRef, kick };
}