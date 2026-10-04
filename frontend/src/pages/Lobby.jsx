import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMedia } from '../context/MediaContext.jsx';
import { api } from '../api.js';

// Camera/mic preview before joining. The stream lives in MediaContext, so Room reuses it (no 2nd prompt).
export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { stream, mic, cam, hasAudio, hasVideo, error, start, release, toggleMic, toggleCam, setPrepared } = useMedia();
  const videoRef = useRef(null);
  const joining = useRef(false);
  const [roomError, setRoomError] = useState('');

  useEffect(() => {
    start();
    api(`/api/rooms/${roomId}`).catch((e) => setRoomError(e.message));
    return () => { if (!joining.current) release(); }; // leaving without joining: turn the camera off
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const join = () => {
    joining.current = true;
    setPrepared(true);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="card wide">
      <h1>Ready to join?</h1>
      <p className="muted">Room {roomId}</p>
      <div className="preview">
        <video ref={videoRef} autoPlay playsInline muted className="mirror" style={{ visibility: stream && cam ? 'visible' : 'hidden' }} />
        {!(stream && cam) && <div className="avatar">📷</div>}
      </div>
      <div className="row center-row">
        <button className={mic ? '' : 'off'} onClick={toggleMic} disabled={!hasAudio}>{mic ? '🎤 Mic on' : '🔇 Mic off'}</button>
        <button className={cam ? '' : 'off'} onClick={toggleCam} disabled={!hasVideo}>{cam ? '📷 Camera on' : '🚫 Camera off'}</button>
      </div>
      {error && <p className="warn">{error}</p>}
      {roomError && <p className="error">{roomError}</p>}
      <div className="row">
        <button className="ghost" onClick={() => navigate('/')}>Back</button>
        <button onClick={join} disabled={!!roomError}>Join now</button>
      </div>
    </div>
  );
}