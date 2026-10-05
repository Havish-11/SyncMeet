import { useEffect, useRef, useState } from 'react';
import { createPeerConnection, descriptionForSocket } from '../lib/rtc.js';

// Each participant has one RTCPeerConnection.
export function useWebRTC({ socket, active, joinNumber, initialPeersRef, localStream }) {
  const connections = useRef(new Map());
  const localStreamRef = useRef(localStream);
  const screenRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [screenStream, setScreenStream] = useState(null);

  localStreamRef.current = localStream;

  function getAudioTrack() {
    return localStreamRef.current?.getAudioTracks()[0] || null;
  }

  function getVideoTrack() {
    if (screenRef.current) {
      return screenRef.current.getVideoTracks()[0] || null;
    }

    return localStreamRef.current?.getVideoTracks()[0] || null;
  }

  function closeConnection(userId) {
    const connection = connections.current.get(userId);
    if (!connection) return;

    connection.pc.close();
    connections.current.delete(userId);

    setRemoteStreams((oldStreams) => {
      const newStreams = { ...oldStreams };
      delete newStreams[userId];
      return newStreams;
    });
  }

  function closeAllConnections() {
    for (const userId of connections.current.keys()) {
      closeConnection(userId);
    }
  }

  function setupConnection(userId, pc) {
    closeConnection(userId);

    const remoteStream = new MediaStream();

    connections.current.set(userId, {
      pc,
      remoteStream,
      videoSender: null,
      pendingIce: [],
    });

    pc.ontrack = (event) => {
      remoteStream.addTrack(event.track);

      setRemoteStreams((oldStreams) => ({
        ...oldStreams,
        [userId]: remoteStream,
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: userId,
          data: event.candidate.toJSON(),
        });
      }
    };

    return connections.current.get(userId);
  }

  async function addQueuedIce(connection) {
    for (const candidate of connection.pendingIce) {
      try {
        await connection.pc.addIceCandidate(candidate);
      } catch {
        // Ignore old/invalid ICE candidates.
      }
    }

    connection.pendingIce = [];
  }

  async function callUser(userId) {
    const pc = createPeerConnection();

    // Create audio/video channels even when one device is unavailable.
    // This lets the other person send media back to us.
    const audio = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const video = pc.addTransceiver('video', { direction: 'sendrecv' });

    await audio.sender.replaceTrack(getAudioTrack());
    await video.sender.replaceTrack(getVideoTrack());

    const connection = setupConnection(userId, pc);
    connection.videoSender = video.sender;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('offer', {
        to: userId,
        data: descriptionForSocket(pc.localDescription),
      });
    } catch (error) {
      console.error('Could not create offer', error);
    }
  }

  useEffect(() => {
    function receiveOffer({ from, data }) {
      answerUser(from, data);
    }

    function receiveAnswer({ from, data }) {
      const connection = connections.current.get(from);
      if (!connection) return;

      connection.pc
        .setRemoteDescription(data)
        .then(() => addQueuedIce(connection))
        .catch((error) => console.error('Could not set answer', error));
    }

    function receiveIce({ from, data }) {
      const connection = connections.current.get(from);
      if (!connection) return;

      if (connection.pc.remoteDescription) {
        connection.pc.addIceCandidate(data).catch(() => {});
      } else {
        connection.pendingIce.push(data);
      }
    }

    function userLeft({ userId }) {
      closeConnection(userId);
    }

    socket.on('offer', receiveOffer);
    socket.on('answer', receiveAnswer);
    socket.on('ice-candidate', receiveIce);
    socket.on('user-left', userLeft);

    return () => {
      socket.off('offer', receiveOffer);
      socket.off('answer', receiveAnswer);
      socket.off('ice-candidate', receiveIce);
      socket.off('user-left', userLeft);
    };
  }, [socket]);

  async function answerUser(userId, offer) {
    const pc = createPeerConnection();
    const connection = setupConnection(userId, pc);

    try {
      await pc.setRemoteDescription(offer);

      // The offer created the tracks/transceivers on this side.
      for (const transceiver of pc.getTransceivers()) {
        const track = transceiver.receiver.track;

        transceiver.direction = 'sendrecv';

        if (track.kind === 'audio') {
          await transceiver.sender.replaceTrack(getAudioTrack());
        }

        if (track.kind === 'video') {
          connection.videoSender = transceiver.sender;
          await transceiver.sender.replaceTrack(getVideoTrack());
        }
      }

      await addQueuedIce(connection);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        to: userId,
        data: descriptionForSocket(pc.localDescription),
      });
    } catch (error) {
      console.error('Could not answer offer', error);
    }
  }

  useEffect(() => {
    closeAllConnections();

    if (!active) return;

    for (const peer of initialPeersRef.current) {
      callUser(peer.userId);
    }
  }, [active, joinNumber]);

  async function replaceVideoTrack(track) {
    for (const connection of connections.current.values()) {
      if (connection.videoSender) {
        try {
          await connection.videoSender.replaceTrack(track);
        } catch {
          // Ignore a connection that has already closed.
        }
      }
    }
  }

  async function startShare() {
    if (screenRef.current) return;

    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = screen.getVideoTracks()[0];

      screenRef.current = screen;
      setScreenStream(screen);

      track.onended = stopShare;

      await replaceVideoTrack(track);
      socket.emit('media-state', { sharing: true });
    } catch {
      // The user cancelled screen selection.
    }
  }

  async function stopShare() {
    const screen = screenRef.current;
    if (!screen) return;

    screen.getTracks().forEach((track) => track.stop());
    screenRef.current = null;
    setScreenStream(null);

    await replaceVideoTrack(localStreamRef.current?.getVideoTracks()[0] || null);
    socket.emit('media-state', { sharing: false });
  }

  useEffect(() => {
    return () => {
      closeAllConnections();
      screenRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    remoteStreams,
    screenStream,
    sharing: !!screenStream,
    startShare,
    stopShare,
  };
}
