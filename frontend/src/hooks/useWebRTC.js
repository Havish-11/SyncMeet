import { useCallback, useEffect, useRef, useState } from 'react';
import { createPeerConnection, toDesc } from '../lib/rtc.js';

// Mesh WebRTC. The NEWCOMER sends offers to everyone already in the room; existing peers only answer.
// That rule means two peers never offer to each other at the same time.
export function useWebRTC({ socket, active, joinEpoch, initialPeersRef, localStream }) {
  const peers = useRef(new Map()); // userId -> { pc, videoSender, pendingIce }
  const localRef = useRef(localStream);
  localRef.current = localStream;
  const screenRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // userId -> MediaStream
  const [screenStream, setScreenStream] = useState(null);

  const cameraTrack = () => localRef.current?.getVideoTracks()[0] ?? null;
  const outgoingVideo = () => screenRef.current?.getVideoTracks()[0] ?? cameraTrack();

  const closePeer = useCallback((userId) => {
    const entry = peers.current.get(userId);
    if (!entry) return;
    peers.current.delete(userId);
    entry.pc.onicecandidate = entry.pc.ontrack = null;
    entry.pc.close();
    setRemoteStreams((s) => { const { [userId]: _gone, ...rest } = s; return rest; });
  }, []);

  const closeAll = useCallback(() => {
    for (const id of [...peers.current.keys()]) closePeer(id);
  }, [closePeer]);

  const createPeer = useCallback((userId) => {
    closePeer(userId); // always start fresh (peer refreshed / rejoined)
    const { pc, audioSender, videoSender } = createPeerConnection();
    const remote = new MediaStream(); 
    const entry = { pc, videoSender, pendingIce: [] };
    peers.current.set(userId, entry);

    audioSender.replaceTrack(localRef.current?.getAudioTracks()[0] ?? null).catch(() => {});
    videoSender.replaceTrack(outgoingVideo()).catch(() => {}); // screen if currently sharing, else camera

    pc.ontrack = (e) => {
      if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
      setRemoteStreams((s) => (s[userId] === remote ? s : { ...s, [userId]: remote }));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { to: userId, data: e.candidate.toJSON() });
    };
    return entry;
  }, [socket, closePeer]);

  const flushIce = async (entry) => {
    for (const c of entry.pendingIce.splice(0)) await entry.pc.addIceCandidate(c).catch(() => {});
  };

  const offerTo = useCallback(async (userId) => {
    const entry = createPeer(userId);
    try {
      await entry.pc.setLocalDescription(await entry.pc.createOffer());
      socket.emit('offer', { to: userId, data: toDesc(entry.pc.localDescription) });
    } catch (err) { console.error('offer failed', err); }
  }, [socket, createPeer]);

  // Signaling listeners. Registered in the same commit as useRoomSocket's effect, i.e. before any
  // network event can arrive.
  useEffect(() => {
    const onOffer = async ({ from, data }) => {
      const entry = createPeer(from);
      try {
        await entry.pc.setRemoteDescription(data);
        await flushIce(entry);
        await entry.pc.setLocalDescription(await entry.pc.createAnswer());
        socket.emit('answer', { to: from, data: toDesc(entry.pc.localDescription) });
      } catch (err) { console.error('offer handling failed', err); }
    };
    const onAnswer = async ({ from, data }) => {
      const entry = peers.current.get(from);
      if (!entry || entry.pc.signalingState !== 'have-local-offer') return;
      try { await entry.pc.setRemoteDescription(data); await flushIce(entry); }
      catch (err) { console.error('answer failed', err); }
    };
    const onIce = ({ from, data }) => {
      const entry = peers.current.get(from);
      if (!entry) return;
      if (entry.pc.remoteDescription) entry.pc.addIceCandidate(data).catch(() => {});
      else entry.pendingIce.push(data); // arrived before the remote description: queue it
    };
    const onLeft = ({ userId }) => closePeer(userId);

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIce);
    socket.on('user-left', onLeft);
    return () => {
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIce);
      socket.off('user-left', onLeft);
      closeAll();
    };
  }, [socket, createPeer, closePeer, closeAll]);

  // (Re)join: tear everything down and offer to whoever was in the room at join time.
  useEffect(() => {
    closeAll();
    if (!active) return;
    initialPeersRef.current.forEach((p) => offerTo(p.userId));
  }, [active, joinEpoch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- screen sharing: swap the video sender's track, no renegotiation
  const replaceVideo = useCallback(
    (track) => Promise.all([...peers.current.values()].map((e) => e.videoSender.replaceTrack(track).catch(() => {}))),
    []
  );

  const stopShare = useCallback(async () => {
    const screen = screenRef.current;
    if (!screen) return;
    screenRef.current = null;
    screen.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    await replaceVideo(cameraTrack());
    socket.emit('media-state', { sharing: false });
  }, [socket, replaceVideo]);

  const startShare = useCallback(async () => {
    if (screenRef.current) return;
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = screen.getVideoTracks()[0];
      screenRef.current = screen;
      track.onended = stopShare; // browser's own "Stop sharing" button
      setScreenStream(screen);
      await replaceVideo(track);
      socket.emit('media-state', { sharing: true });
    } catch { /* user cancelled the picker */ }
  }, [socket, replaceVideo, stopShare]);

  useEffect(() => () => screenRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { remoteStreams, screenStream, sharing: !!screenStream, startShare, stopShare };
}