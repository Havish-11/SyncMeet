// STUN finds your public address. TURN relays media when a direct connection is impossible
// (different networks, mobile data, strict NATs). Without TURN, calls across networks often stay black.
const iceServers = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

if (import.meta.env.VITE_TURN_URL) {
  iceServers.push({
    urls: import.meta.env.VITE_TURN_URL.split(','), // comma-separated list is fine
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers });
}

// Send only plain {type, sdp} over the socket.
export function descriptionForSocket({ type, sdp }) {
  return { type, sdp };
}

export function getGridColumns(numberOfPeople) {
  return Math.max(1, Math.ceil(Math.sqrt(numberOfPeople)));
}