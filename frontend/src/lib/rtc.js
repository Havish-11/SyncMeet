const turnUrl = import.meta.env.VITE_TURN_URL;

export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    ...(turnUrl
      ? [{
          urls: turnUrl,
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_CREDENTIAL,
        }]
      : []),
  ],
};

export function createPeerConnection() {
  return new RTCPeerConnection(RTC_CONFIG);
}

export function descriptionForSocket(description) {
  return {
    type: description.type,
    sdp: description.sdp,
  };
}

export function getGridColumns(numberOfPeople) {
  return Math.max(1, Math.ceil(Math.sqrt(numberOfPeople)));
}
