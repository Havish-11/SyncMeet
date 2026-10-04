import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const create = async () => {
    setError('');
    try {
      const { roomId } = await api('/api/rooms', { method: 'POST' });
      navigate(`/lobby/${roomId}`);
    } catch (e) { setError(e.message); }
  };

  const join = async (e) => {
    e.preventDefault();
    setError('');
    // accept a bare ID or a pasted /room/<id> link
    const id = code.trim().split('/').pop();
    try {
      await api(`/api/rooms/${id}`);
      navigate(`/lobby/${id}`);
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="card">
      <div className="row">
        <h1>Hi, {user.name}</h1>
        <button className="ghost" onClick={logout}>Log out</button>
      </div>
      <button onClick={create}>New meeting</button>
      <p className="muted">or join one</p>
      <form className="row" onSubmit={join}>
        <input placeholder="Room ID or link" value={code} onChange={(e) => setCode(e.target.value)} required />
        <button>Join</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}