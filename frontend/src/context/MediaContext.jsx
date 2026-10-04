import { createContext, useCallback, useContext, useRef, useState } from 'react';

const MediaCtx = createContext(null);
export const useMedia = () => useContext(MediaCtx);

// Possible attempts
const ATTEMPTS = [{ video: true, audio: true }, { audio: true }, { video: true }];

export function MediaProvider({ children }) {
  const [stream, setStream] = useState(null);
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [error, setError] = useState('');
  const [prepared, setPrepared] = useState(false); // Lobby -> Room
  const streamRef = useRef(null);
  const pending = useRef(null);
  const gen = useRef(0); // bumped by release() so a late getUserMedia result is discarded

  const start = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    if (pending.current) return pending.current;
    const myGen = gen.current;

    pending.current = (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera and mic need HTTPS (or localhost).');
        return null;
      }
      for (const constraints of ATTEMPTS) {
        try {
          const s = await navigator.mediaDevices.getUserMedia(constraints);
          if (myGen !== gen.current) { s.getTracks().forEach((t) => t.stop()); return null; }
          streamRef.current = s;
          setStream(s);
          setMic(s.getAudioTracks().length > 0);
          setCam(s.getVideoTracks().length > 0);
          setError(constraints.audio && constraints.video ? '' : 'Limited devices: one of camera/mic is unavailable.');
          return s;
        } catch { /* try next */ }
      }
      if (myGen === gen.current) setError('Could not access camera or mic. You can still join and watch.');
      return null;
    })().finally(() => { pending.current = null; });

    return pending.current;
  }, []);

  const release = useCallback(() => { // reset everything
    gen.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pending.current = null;
    setStream(null); setMic(false); setCam(false); setError(''); setPrepared(false);
  }, []);

  // Muting = disabling the track.
  const toggleMic = () => {
    const next = !mic;
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMic(next);
    return next;
  };

  // Turning the camera on/off
  const toggleCam = () => {
    const next = !cam;
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
    setCam(next);
    return next;
  };

  const value = {
    stream, mic, cam, error, prepared, setPrepared,
    hasAudio: !!stream?.getAudioTracks().length,
    hasVideo: !!stream?.getVideoTracks().length,
    start, release, toggleMic, toggleCam,
  };
  return <MediaCtx.Provider value={value}>{children}</MediaCtx.Provider>; // makes the valeu available to all components inside the provider
}