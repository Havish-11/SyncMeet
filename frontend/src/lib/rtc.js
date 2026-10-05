const env = import.meta.env ?? {}; // (optional chaining keeps this file importable outside Vite, e.g. in tests)
const turnUrl = env.VITE_TURN_URL;

export const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ...(turnUrl
      ? [{ urls: turnUrl, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }]
      : []),
  ],
};

// OFFERER (the newcomer). Pre-add one audio + one video sendrecv transceiver and attach our tracks.
// Later swaps (camera <-> screen share) are just sender.replaceTrack(): no renegotiation needed.
export function createOfferPeer({ audioTrack, videoTrack }) {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const audio = pc.addTransceiver('audio', { direction: 'sendrecv' });
  const video = pc.addTransceiver('video', { direction: 'sendrecv' });
  audio.sender.replaceTrack(audioTrack ?? null).catch(() => {});
  video.sender.replaceTrack(videoTrack ?? null).catch(() => {});
  return { pc, videoSender: video.sender };
}

// ANSWERER (someone already in the room). Do NOT pre-add transceivers here: when an offer arrives the
// browser creates its own transceivers, and ones made earlier with addTransceiver() are NOT reused.
// Those new ones default to "recvonly", so we must flip them to sendrecv and attach our tracks
// AFTER setRemoteDescription and BEFORE createAnswer. Otherwise we never send media back.
export const createAnswerPeer = () => new RTCPeerConnection(RTC_CONFIG);

export async function acceptOffer(pc, offer, { audioTrack, videoTrack }) {
  await pc.setRemoteDescription(offer);
  let videoSender = null;
  for (const t of pc.getTransceivers()) {
    const isVideo = t.receiver.track.kind === 'video';
    t.direction = 'sendrecv';
    await t.sender.replaceTrack((isVideo ? videoTrack : audioTrack) ?? null);
    if (isVideo) videoSender = t.sender;
  }
  return videoSender;
}

// Plain {type, sdp} object that is safe to send over Socket.IO.
export const toDesc = (d) => ({ type: d.type, sdp: d.sdp });

export const gridColumns = (n) => Math.max(1, Math.ceil(Math.sqrt(n)));