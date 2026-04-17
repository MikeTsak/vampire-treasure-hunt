import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../api';

export default function ActiveHunt() {
  const [activeHunts, setActiveHunts] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
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
      // Fetch all active hunts not completed by user and character info
      const [huntRes, authRes, charRes] = await Promise.all([
        api.get('/hunts/active'),
        api.get('/auth/me'),
        api.get('/characters/me').catch(() => ({ data: { character: null } }))
      ]);

      setActiveHunts(huntRes.data.activeHunts || []);
      
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
    const currentHunt = activeHunts[selectedIdx];
    
    try {
      const res = await api.post('/hunts/submit', {
        step_id: currentHunt.step.id,
        ...payload
      });
      
      // Reload everything to filter out the completed hunt or move to next step
      await loadData();
      setTextAnswer('');
      // Reset selection index if the list shortened
      if (selectedIdx >= activeHunts.length - 1) setSelectedIdx(0);

    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect. The shadows reject your answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Specialized Handlers ---

  const handleGPS = () => {
    if (!navigator.geolocation) return setError("GPS not supported.");
    setIsSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => submitAnswer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setIsSubmitting(false);
        setError("Location signal lost.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Upload to your existing media system
      const uploadRes = await api.post('/chat/upload', formData);
      await submitAnswer({ media_id: uploadRes.data.id });
    } catch (err) {
      setIsSubmitting(false);
      setError("Evidence upload failed.");
    }
  };

  if (loading) return <p style={{textAlign: 'center', marginTop: '50px'}}>Syncing chronicles...</p>;

  // If no hunts are returned from the filtered API
  if (activeHunts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', background: '#121212', borderRadius: '8px', border: '1px solid #333' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#888' }}>No Active Tasks</h2>
        <p>All paths are currently walked.</p>
      </div>
    );
  }

  const { hunt, step } = activeHunts[selectedIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#e0e0e0', margin: '0' }}>
          Welcome, <span style={{ color: '#b01423' }}>{player?.name}</span>
        </h2>
      </div>

      {/* Hunt Selector (Only shows if > 1 hunt active) */}
      {activeHunts.length > 1 && (
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.8rem', color: '#a18a4d', display: 'block', marginBottom: '5px' }}>SWITCH CHRONICLE:</label>
          <select 
            value={selectedIdx} 
            onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
            style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: '1px solid #b01423', borderRadius: '4px' }}
          >
            {activeHunts.map((h, i) => (
              <option key={h.hunt.id} value={i}>{h.hunt.title}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ background: '#121212', border: '1px solid #333', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ color: '#a18a4d', marginTop: 0 }}>{hunt.title}</h3>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Step {step.step_order}</p>
        <p style={{ fontSize: '1.2rem', margin: '20px 0', lineHeight: '1.5' }}>{step.prompt}</p>

        {error && <p style={{ color: '#ffaaaa', background: 'rgba(50,0,0,0.5)', padding: '12px', border: '1px solid red', borderRadius: '4px' }}>{error}</p>}

        {/* --- DYNAMIC TASK RENDERING --- */}
        
        {step.task_type === 'text' && (
          <div>
            <input 
              type="text" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Enter answer..." disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', background: '#000', color: '#fff', border: '1px solid #555', marginBottom: '10px', borderRadius: '4px' }}
            />
            <button onClick={() => submitAnswer({ text_answer: textAnswer })} disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', background: '#b01423', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              {isSubmitting ? 'Verifying...' : 'Submit'}
            </button>
          </div>
        )}

        {step.task_type === 'gps' && (
          <button onClick={handleGPS} disabled={isSubmitting}
            style={{ width: '100%', padding: '15px', background: '#222', color: '#a18a4d', border: '1px solid #a18a4d', borderRadius: '4px', fontWeight: 'bold' }}>
            {isSubmitting ? 'Pinpointing...' : '📍 Check-in at Location'}
          </button>
        )}

        {step.task_type === 'qr' && (
          <div style={{ border: '2px solid #b01423', borderRadius: '8px', overflow: 'hidden' }}>
            {!isSubmitting ? <Scanner onResult={(text) => submitAnswer({ text_answer: text })} /> : <p style={{textAlign:'center', padding:'20px'}}>Reading Sigil...</p>}
          </div>
        )}

        {['photo', 'draw', 'audio'].includes(step.task_type) && (
          <div style={{ textAlign: 'center' }}>
            <label style={{ background: '#222', border: '1px solid #fff', color: '#fff', padding: '15px 20px', borderRadius: '4px', cursor: 'pointer', display: 'block' }}>
              {step.task_type === 'photo' && '📷 Take Photo'}
              {step.task_type === 'draw' && '🎨 Upload Drawing'}
              {step.task_type === 'audio' && '🎤 Record/Upload Audio'}
              <input 
                type="file" 
                accept={step.task_type === 'audio' ? 'audio/*' : 'image/*'} 
                capture={step.task_type === 'photo' ? 'environment' : undefined}
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                disabled={isSubmitting}
              />
            </label>
            {isSubmitting && <p style={{color:'#a18a4d', marginTop:'10px'}}>Uploading evidence...</p>}
          </div>
        )}
      </div>
    </div>
  );
}