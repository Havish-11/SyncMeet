export default function Controls({
  mic, cam, hasAudio, hasVideo, sharing, canShare,
  onMic, onCam, onShare, onLeave, panel, onPanel, unread,
}) {
  return (
    <div className="controls">
      <button className={mic ? '' : 'off'} onClick={onMic} disabled={!hasAudio}>{mic ? '🎤 Mute' : '🔇 Unmute'}</button>
      <button className={cam ? '' : 'off'} onClick={onCam} disabled={!hasVideo}>{cam ? '📷 Stop video' : '🚫 Start video'}</button>
      <button className={sharing ? 'on' : ''} onClick={onShare} disabled={!canShare}>{sharing ? '🛑 Stop sharing' : '🖥 Share screen'}</button>
      <button className={panel === 'chat' ? 'on' : 'ghost'} onClick={() => onPanel('chat')}>
        💬 Chat {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      <button className={panel === 'people' ? 'on' : 'ghost'} onClick={() => onPanel('people')}>👥 People</button>
      <button className="danger" onClick={onLeave}>Leave</button>
    </div>
  );
}