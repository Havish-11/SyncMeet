import {useEffect,useRef} from 'react';

export default function VideoTile({ stream, name, local, mic, cam, sharing, host }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream ?? null;
  }, [stream]);

  const showVideo = !!stream && (sharing || cam);
  const cls = [sharing ? 'contain' : '', local && !sharing ? 'mirror' : ''].join(' ');

  return (
    <div className={`tile ${sharing ? 'sharing' : ''}`}>
      <video ref={ref} className={cls} autoPlay playsInline muted={local} style={{ visibility: showVideo ? 'visible' : 'hidden' }} />
      {!showVideo && <div className="avatar">{(name || '?')[0].toUpperCase()}</div>}
      <div className="label">
        {name}{local && ' (you)'}{host && ' ★'}{!mic && ' 🔇'}{sharing && ' 🖥'}
      </div>
    </div>
  );
}