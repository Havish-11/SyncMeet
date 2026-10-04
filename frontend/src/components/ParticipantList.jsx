export default function ParticipantList({ me, peers, hostId, onKick }) {
  const iAmHost = hostId === me.id;
  return (
    <div className="panel">
      <h3>Participants ({peers.length + 1})</h3>
      <ul className="people">
        <li>{me.name} (you){iAmHost && ' ★ host'}</li>
        {peers.map((p) => (
          <li key={p.userId}>
            <span>
              {p.name}{p.userId === hostId && ' ★ host'}{!p.mic && ' 🔇'}{p.sharing && ' 🖥'}
            </span>
            {iAmHost && <button className="ghost small" onClick={() => onKick(p.userId)}>Remove</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}