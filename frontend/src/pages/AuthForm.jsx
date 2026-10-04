import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await (isRegister ? register(form) : login(form));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>
      {isRegister && <input placeholder="Name" value={form.name} onChange={set('name')} required />}
      <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
      <input type="password" placeholder="Password (6+ chars)" value={form.password} onChange={set('password')} required />
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>{busy ? '…' : isRegister ? 'Register' : 'Log in'}</button>
      <p className="muted">
        {isRegister ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Register</Link></>}
      </p>
    </form>
  );
}