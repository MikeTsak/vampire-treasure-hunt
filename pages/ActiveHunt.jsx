// src/pages/ActiveHunt.jsx
import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../api';

export default function ActiveHunt() {
  const [huntData, setHuntData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [textAnswer, setTextAnswer] = useState('');

  useEffect(() => {
    loadHunt();
  }, []);

  const loadHunt = async () => {
    try {
      const res = await api.get('/hunts/active');
      setHuntData(res.data);
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
        loadHunt();
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

  if (loading) return <p style={{textAlign: 'center'}}>Syncing with the network...</p>;
  if (!huntData?.hunt) return <h2 style={{textAlign: 'center'}}>No active hunts tonight.</h2>;
  
  if (huntData.progress?.completed) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', background: '#121212', padding: '30px', border: '1px solid #a18a4d' }}>
        <h2 style={{ color: '#a18a4d', fontFamily: 'Cinzel' }}>Hunt Complete</h2>
        <p>You have survived the night and uncovered the secrets.</p>
      </div>
    );
  }

  const { step } = huntData;

  return (
    <div style={{ background: '#121212', border: '1px solid #333', borderRadius: '8px', padding: '20px' }}>
      <h3 style={{ color: '#8a8a90', marginTop: 0 }}>Step {step.step_order}</h3>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>{step.prompt}</p>

      {error && <p style={{ color: '#ffaaaa', background: 'rgba(50,0,0,0.5)', padding: '10px', border: '1px solid red' }}>{error}</p>}

      {step.task_type === 'text' && (
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

      {step.task_type === 'gps' && (
        <button onClick={handleGPS} style={{ width: '100%', padding: '15px', background: '#222', color: '#a18a4d', border: '1px solid #a18a4d', cursor: 'pointer' }}>
          📍 Verify GPS Coordinates
        </button>
      )}

      {step.task_type === 'qr' && (
        <div style={{ border: '2px solid #b01423', borderRadius: '8px', overflow: 'hidden' }}>
          <Scanner onResult={(text) => handleQR(text)} />
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', padding: '10px 0' }}>Point your camera at the sigil (QR code)</p>
        </div>
      )}
    </div>
  );
}