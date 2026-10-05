import { useEffect, useRef, useState } from 'react';
import { createPeerConnection, descriptionForSocket } from '../lib/rtc.js';

// One RTCPeerConnection per other person in the room.
// Rule: whoever JOINS calls everyone already inside. Everyone else only answers.
export function useWebRTC({ socket, active, joinNumber, initialPeersRef, localStream }) {
  const peers = useRef(new Map()); // userId -> { pc, isCaller, videoSender, pendingIce }
  const screenRef = useRef(null);
  const localRef = useRef(localStream);
  localRef.current = localStream;

  const [remoteStreams, setRemoteStreams] = useState({});
  const [screenStream, setScreenStream] = useState(null);

  const audioTrack = () => localRef.current?.getAudioTracks()[0] || null;
  const cameraTrack = () => localRef.current?.getVideoTracks()[0] || null;
  const videoTrack = () => screenRef.current?.getVideoTracks()[0] || cameraTrack();

  // ---------- create / close ----------

  function closePeer(userId) {
    const peer = peers.current.get(userId);
    if (!peer) return;
    peers.current.delete(userId);
    peer.pc.close();
    setRemoteStreams((old) => {
      const next = { ...old };
      delete next[userId];
      return next;
    });
  }

  function closeAllPeers() {
    for (const userId of [...peers.current.keys()]) closePeer(userId);
  }

  function createPeer(userId, isCaller) {
    closePeer(userId);

    const pc = createPeerConnection();
    const peer = { pc, isCaller, videoSender: null, pendingIce: [] };
    peers.current.set(userId, peer);

    pc.ontrack = (event) => {
      if (peers.current.get(userId)?.pc !== pc) return; // connection was replaced
      // Make a NEW stream each time a track arrives so <video> always picks it up.
      setRemoteStreams((old) => ({
        ...old,
        [userId]: new MediaStream([...(old[userId]?.getTracks() ?? []), event.track]),
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit('ice-candidate', { to: userId, data: event.candidate.toJSON() });
    };

    // If the link dies, the caller simply dials again.
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && isCaller && peers.current.get(userId)?.pc === pc) {
        callUser(userId);
      }
    };

    return peer;
  }

  // ---------- media ----------

  // Put our mic/camera (or screen) on every audio/video slot, so we can send AND receive.
  async function attachLocalMedia(peer) {
    for (const t of peer.pc.getTransceivers()) {
      t.direction = 'sendrecv';
      if (t.receiver.track.kind === 'audio') {
        await t.sender.replaceTrack(audioTrack());
      } else {
        peer.videoSender = t.sender;
        await t.sender.replaceTrack(videoTrack());
      }
    }
  }

  async function setRemote(peer, description) {
    await peer.pc.setRemoteDescription(description);
    // ICE candidates that arrived too early can be added now.
    for (const candidate of peer.pendingIce) peer.pc.addIceCandidate(candidate).catch(() => {});
    peer.pendingIce = [];
  }

  // ---------- calling and answering ----------

  async function callUser(userId) {
    const peer = createPeer(userId, true);
    try {
      peer.pc.addTransceiver('audio');
      peer.pc.addTransceiver('video');
      await attachLocalMedia(peer);

      await peer.pc.setLocalDescription(await peer.pc.createOffer());
      socket.emit('offer', { to: userId, data: descriptionForSocket(peer.pc.localDescription) });
    } catch (error) {
      console.error('Could not call', userId, error);
    }
  }

  async function answerUser(userId, offer) {
    const peer = createPeer(userId, false);
    try {
      await setRemote(peer, offer);
      await attachLocalMedia(peer);

      await peer.pc.setLocalDescription(await peer.pc.createAnswer());
      socket.emit('answer', { to: userId, data: descriptionForSocket(peer.pc.localDescription) });
    } catch (error) {
      console.error('Could not answer', userId, error);
    }
  }

  // ---------- socket messages ----------

  useEffect(() => {
    const onOffer = ({ from, data }) => answerUser(from, data);

    const onAnswer = ({ from, data }) => {
      const peer = peers.current.get(from);
      if (peer) setRemote(peer, data).catch((e) => console.error('Bad answer', e));
    };

    const onIce = ({ from, data }) => {
      const peer = peers.current.get(from);
      if (!peer) return;
      if (peer.pc.remoteDescription) peer.pc.addIceCandidate(data).catch(() => {});
      else peer.pendingIce.push(data);
    };

    const onUserLeft = ({ userId }) => closePeer(userId);

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIce);
    socket.on('user-left', onUserLeft);
    return () => {
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIce);
      socket.off('user-left', onUserLeft);
    };
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every (re)join: start fresh and call the people who were already in the room.
  useEffect(() => {
    closeAllPeers();
    if (!active) return;
    for (const peer of initialPeersRef.current) callUser(peer.userId);
  }, [active, joinNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the room.
  useEffect(() => () => {
    closeAllPeers();
    screenRef.current?.getTracks().forEach((t) => t.stop());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- screen sharing ----------

  async function sendVideo(track) {
    for (const peer of peers.current.values()) {
      await peer.videoSender?.replaceTrack(track).catch(() => {});
    }
  }

  async function startShare() {
    if (screenRef.current) return;
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenRef.current = screen;
      setScreenStream(screen);
      screen.getVideoTracks()[0].onended = stopShare; // browser "Stop sharing" button

      await sendVideo(screen.getVideoTracks()[0]);
      socket.emit('media-state', { sharing: true });
    } catch {
      // User cancelled the screen picker.
    }
  }

  async function stopShare() {
    if (!screenRef.current) return;
    screenRef.current.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreenStream(null);

    await sendVideo(cameraTrack());
    socket.emit('media-state', { sharing: false });
  }

  return { remoteStreams, screenStream, sharing: !!screenStream, startShare, stopShare };
}