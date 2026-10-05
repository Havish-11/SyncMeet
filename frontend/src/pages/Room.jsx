import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useMedia } from '../context/MediaContext.jsx';
import { useRoomSocket } from '../hooks/useRoomSocket.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import { useChat } from '../hooks/useChat.js';
import VideoGrid from '../components/VideoGrid.jsx';
import Controls from '../components/Controls.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import ParticipantList from '../components/ParticipantList.jsx';

const MESSAGES = {
  error: 'Could not join this room. It may have expired.',
  replaced: 'You joined this room from another tab or device.',
  kicked: 'The host removed you from the room.',
};

// Thin page: composes the hooks and the presentational components.
function RoomInner({ roomId }) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { stream, mic, cam, hasAudio, hasVideo, toggleMic, toggleCam, release } = useMedia();

  const { socket, status, hostId, peers, joinEpoch, initialPeersRef, kick } = useRoomSocket(roomId, token, { mic, cam });
  const active = !['connecting', 'error', 'replaced', 'kicked'].includes(status);
  const rtc = useWebRTC({ socket, active, joinEpoch, initialPeersRef, localStream: stream });

  const [panel, setPanel] = useState(null); // null | 'chat' | 'people'
  const chat = useChat(socket, { open: panel === 'chat', selfId: user.id });

  useEffect(() => () => release(), []); 

  if (MESSAGES[status]) {
    return (
      <div className="card">
        <p>{MESSAGES[status]}</p>
        <button onClick={() => navigate('/')}>Back to dashboard</button>
      </div>
    );
  }
  if (status === 'connecting') return <p className="center">Joining…</p>;

  const tiles = [
    { id: user.id, local: true, name: user.name, stream: rtc.screenStream ?? stream, mic, cam, sharing: rtc.sharing, host: hostId === user.id },
    ...peers.map((p) => ({
      id: p.userId, name: p.name, stream: rtc.remoteStreams[p.userId] ?? null,
      mic: p.mic, cam: p.cam, sharing: p.sharing, host: p.userId === hostId,
    })),
  ];

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

  return (
    <div className="room">
      <header className="room-header">
        <strong>Room {roomId}</strong>
        <button className="ghost small" onClick={() => navigator.clipboard.writeText(`${location.origin}/lobby/${roomId}`)}>Copy invite link</button>
        {status === 'reconnecting' && <span className="warn">Reconnecting…</span>}
      </header>

      <div className="room-body">
        <VideoGrid tiles={tiles} />
        {panel && (
          <aside className="side">
            {panel === 'chat'
              ? <ChatPanel messages={chat.messages} onSend={chat.send} selfId={user.id} />
              : <ParticipantList me={user} peers={peers} hostId={hostId} onKick={kick} />}
          </aside>
        )}
      </div>

      <Controls
        mic={mic} cam={cam} hasAudio={hasAudio} hasVideo={hasVideo}
        sharing={rtc.sharing} canShare={!!navigator.mediaDevices?.getDisplayMedia}
        onMic={() => socket.emit('media-state', { mic: toggleMic() })}
        onCam={() => socket.emit('media-state', { cam: toggleCam() })}
        onShare={rtc.sharing ? rtc.stopShare : rtc.startShare}
        onLeave={() => navigate('/')}
        panel={panel} onPanel={togglePanel} unread={chat.unread}
      />
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const { prepared } = useMedia();
  // Direct visit / refresh: the preview stream is gone, so go through the Lobby first.
  if (!prepared) return <Navigate to={`/lobby/${roomId}`} replace />;
  return <RoomInner key={roomId} roomId={roomId} />;
}