const turnUrl = import.meta.env.VITE_TURN_URL;

export const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ...(turnUrl
      ? [{ urls: turnUrl, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL }]
      : []),
  ],
};

// Always create one audio + one video sendrecv transceiver (on BOTH sides).
// Then: tracks can be attached/swapped with sender.replaceTrack() and no renegotiation is ever needed
// (camera <-> screen share, cam on/off), and peers without a camera can still receive video.
export function createPeerConnection() {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const audio = pc.addTransceiver('audio', { direction: 'sendrecv' });
  const video = pc.addTransceiver('video', { direction: 'sendrecv' });
  return { pc, audioSender: audio.sender, videoSender: video.sender };
}

export const toDesc = (d) => ({ type: d.type, sdp: d.sdp });

export const gridColumns = (n) => Math.max(1, Math.ceil(Math.sqrt(n))); //decides how many cols your video grid should have