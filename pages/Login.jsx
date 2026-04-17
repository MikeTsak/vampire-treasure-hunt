// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Hits your existing Erebus Portal login route
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      nav('/');
    } catch (err) {
      setError('Invalid credentials. The Court does not recognize you.');
    }
  };

  return (
    <div style={{ background: '#121212', padding: '30px', borderRadius: '8px', border: '1px solid #333' }}>
      <h2 style={{ fontFamily: 'Cinzel, serif', color: '#b01423', textAlign: 'center' }}>Identify Yourself</h2>
      {error && <p style={{ color: '#ffaaaa', background: 'rgba(50,0,0,0.5)', padding: '10px' }}>{error}</p>}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #555' }}
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #555' }}
          required 
        />
        <button type="submit" style={{ padding: '15px', background: '#b01423', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Cinzel', fontSize: '1.1rem' }}>
          Enter the Night
        </button>
      </form>
    </div>
  );
}