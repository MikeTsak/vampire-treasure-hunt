// src/pages/ActiveHunt.jsx
import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../api';

export default function ActiveHunt() {
  const [huntData, setHuntData] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [textAnswer, setTextAnswer] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch Hunt, User Role, and Character Data simultaneously
      const [huntRes, authRes, charRes] = await Promise.all([
        api.get('/hunts/active'),
        api.get('/auth/me'),
        api.get('/characters/me').catch(() => ({ data: { character: null } })) // Catch if they have no character yet
      ]);

      setHuntData(huntRes.data);
      setIsAdmin(authRes.data.user?.role === 'admin');
      
      // Try to use Character Name, fallback to Account Display Name, fallback to Kindred
      const charName = charRes.data?.character?.name || authRes.data.user?.display_name || 'Kindred';
      setPlayer({ name: charName });

    } catch (err) {
      setError('Failed to connect to the network.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (payload) => {
    setError('');
    try {
      const res = await api.post('/hunts/submit', {
        step_id: huntData.step.id,
        ...payload
      });
      
      if (res.data.completed) {
        setHuntData({ ...huntData, progress: { completed: true } });
      } else {
        loadData(); // Reload to get the next step
        setTextAnswer('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect. The shadows reject your answer.');
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return setError("GPS not supported on this device.");
    
    navigator.geolocation.getCurrentPosition(
      (pos) => submitAnswer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Failed to acquire coordinates. Ensure location services are on.")
    );
  };

  const handleQR = (text) => {
    if (text) submitAnswer({ text_answer: text });
  };

  if (loading) return <p style={{textAlign: 'center', marginTop: '50px'}}>Syncing with the network...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* --- IDENTITY & ADMIN SECTION --- */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#e0e0e0', margin: '0 0 5px 0' }}>
          Welcome, <span style={{ color: '#b01423' }}>{player?.name}</span>
        </h2>
        
        {isAdmin && (
          <a 
            href="https://attlarp.gr/admin/hunts" 
            style={{ 
              display: 'inline-block', 
              marginTop: '10px', 
              background: '#222', 
              color: '#a18a4d', 
              padding: '8px 16px', 
              borderRadius: '4px', 
              textDecoration: 'none', 
              border: '1px solid #a18a4d', 
              fontSize: '0.9rem',
              fontFamily: 'Cinzel, serif'
            }}
          >
            ⚙️ Enter Storyteller Panel
          </a>
        )}
      </div>

      {/* --- HUNT SECTION --- */}
      {!huntData?.hunt ? (
         <div style={{ background: '#121212', padding: '30px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' }}>
           <h3 style={{ color: '#888', margin: 0 }}>No active hunts tonight.</h3>
         </div>
      ) : huntData.progress?.completed ? (
        <div style={{ textAlign: 'center', background: '#121212', padding: '30px', border: '1px solid #a18a4d', borderRadius: '8px' }}>
          <h2 style={{ color: '#a18a4d', fontFamily: 'Cinzel, serif' }}>Hunt Complete</h2>
          <p>You have survived the night and uncovered the secrets.</p>
        </div>
      ) : (
        <div style={{ background: '#121212', border: '1px solid #333', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ color: '#8a8a90', marginTop: 0 }}>Step {huntData.step.step_order}</h3>
          <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>{huntData.step.prompt}</p>

          {error && <p style={{ color: '#ffaaaa', background: 'rgba(50,0,0,0.5)', padding: '10px', border: '1px solid red' }}>{error}</p>}

          {huntData.step.task_type === 'text' && (
            <div>
              <input 
                type="text" 
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Enter the password..."
                style={{ width: '100%', padding: '12px', background: '#000', color: '#fff', border: '1px solid #555', marginBottom: '10px' }}
              />
              <button onClick={() => submitAnswer({ text_answer: textAnswer })} style={{ width: '100%', padding: '12px', background: '#b01423', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Submit
              </button>
            </div>
          )}

          {huntData.step.task_type === 'gps' && (
            <button onClick={handleGPS} style={{ width: '100%', padding: '15px', background: '#222', color: '#a18a4d', border: '1px solid #a18a4d', cursor: 'pointer' }}>
              📍 Verify GPS Coordinates
            </button>
          )}

          {huntData.step.task_type === 'qr' && (
            <div style={{ border: '2px solid #b01423', borderRadius: '8px', overflow: 'hidden' }}>
              <Scanner onResult={(text) => handleQR(text)} />
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', padding: '10px 0' }}>Point your camera at the sigil (QR code)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}