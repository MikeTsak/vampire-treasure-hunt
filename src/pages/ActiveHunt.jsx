import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../api';

export default function ActiveHunt() {
  const [huntData, setHuntData] = useState(null);
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [huntRes, authRes, charRes] = await Promise.all([
        api.get('/hunts/active'),
        api.get('/auth/me'),
        api.get('/characters/me').catch(() => ({ data: { character: null } }))
      ]);

      setHuntData(huntRes.data);
      
      const charName = charRes.data?.character?.name || authRes.data.user?.display_name || 'Kindred';
      setPlayer({ name: charName });

    } catch (err) {
      setError('Failed to connect to the Erebus network.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (payload) => {
    setError('');
    setIsSubmitting(true);
    try {
      const res = await api.post('/hunts/submit', {
        step_id: huntData.step.id,
        ...payload
      });
      
      if (res.data.completed) {
        setHuntData({ ...huntData, progress: { completed: true } });
      } else {
        loadData();
        setTextAnswer('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect. The shadows reject your answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return setError("GPS not supported on this device.");
    setIsSubmitting(true);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => submitAnswer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setIsSubmitting(false);
        setError("Failed to acquire coordinates. Ensure location services are on.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleQR = (text) => {
    if (text && !isSubmitting) submitAnswer({ text_answer: text });
  };

  if (loading) return <p style={{textAlign: 'center', marginTop: '50px'}}>Syncing with the network...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#e0e0e0', margin: '0' }}>
          Welcome, <span style={{ color: '#b01423' }}>{player?.name}</span>
        </h2>
      </div>

      {!huntData?.hunt ? (
         <div style={{ background: '#121212', padding: '30px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' }}>
           <h3 style={{ color: '#888', margin: 0 }}>No active hunts tonight.</h3>
         </div>
      ) : huntData.progress?.completed ? (
        <div style={{ textAlign: 'center', background: '#121212', padding: '30px', border: '1px solid #a18a4d', borderRadius: '8px' }}>
          <h2 style={{ color: '#a18a4d', fontFamily: 'Cinzel, serif', marginTop: 0 }}>Hunt Complete</h2>
          <p style={{ margin: 0 }}>You have survived the night and uncovered the secrets.</p>
        </div>
      ) : (
        <div style={{ background: '#121212', border: '1px solid #333', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ color: '#8a8a90', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Step {huntData.step.step_order}</h3>
          <p style={{ fontSize: '1.2rem', marginBottom: '30px', lineHeight: '1.5' }}>{huntData.step.prompt}</p>

          {error && <p style={{ color: '#ffaaaa', background: 'rgba(50,0,0,0.5)', padding: '12px', border: '1px solid red', borderRadius: '4px' }}>{error}</p>}

          {huntData.step.task_type === 'text' && (
            <div>
              <input 
                type="text" 
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Enter the password..."
                disabled={isSubmitting}
                style={{ width: '100%', padding: '12px', background: '#000', color: '#fff', border: '1px solid #555', marginBottom: '10px', boxSizing: 'border-box', borderRadius: '4px' }}
              />
              <button 
                onClick={() => submitAnswer({ text_answer: textAnswer })} 
                disabled={isSubmitting || !textAnswer.trim()}
                style={{ width: '100%', padding: '12px', background: '#b01423', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
              >
                {isSubmitting ? 'Verifying...' : 'Submit'}
              </button>
            </div>
          )}

          {huntData.step.task_type === 'gps' && (
            <button 
              onClick={handleGPS} 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '15px', background: '#222', color: '#a18a4d', border: '1px solid #a18a4d', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1rem' }}
            >
              {isSubmitting ? 'Acquiring Signal...' : '📍 Verify GPS Coordinates'}
            </button>
          )}

          {huntData.step.task_type === 'qr' && (
            <div style={{ border: '2px solid #b01423', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
              {!isSubmitting ? (
                <Scanner onResult={(text) => handleQR(text)} />
              ) : (
                <p style={{ textAlign: 'center', padding: '50px 0', color: '#a18a4d' }}>Verifying Sigil...</p>
              )}
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#888', padding: '10px 0', margin: 0 }}>Point your camera at the sigil (QR code)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}