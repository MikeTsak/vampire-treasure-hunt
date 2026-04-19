// src/pages/ActiveHunt.jsx
import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../api';

export default function ActiveHunt() {
  const [activeHunts, setActiveHunts] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [charName, setCharName] = useState('Kindred');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    try {
      const [huntRes, charRes] = await Promise.all([
        api.get('/hunts/active'),
        api.get('/characters/me').catch(() => ({ data: { character: null } }))
      ]);

      setActiveHunts(huntRes.data.activeHunts || []);
      
      if (charRes.data?.character?.name) {
        setCharName(charRes.data.character.name);
      }
    } catch (err) {
      setError('Failed to sync chronicles.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (payload) => {
    setError('');
    setIsSubmitting(true);
    const currentStep = activeHunts[selectedIdx]?.step;
    try {
      await api.post('/hunts/submit', {
        step_id: currentStep.id,
        ...payload
      });
      
      setTextAnswer('');
      await loadAll(); 
    } catch (err) {
      setError(err.response?.data?.error || 'Validation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return setError("GPS is disabled.");
    setIsSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => submitAnswer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { setIsSubmitting(false); setError("Signal lost."); },
      { enableHighAccuracy: true }
    );
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/chat/upload', fd);
      await submitAnswer({ media_id: res.data.id });
    } catch (err) {
      setIsSubmitting(false);
      setError("Upload failed.");
    }
  };

  if (loading) return <p style={{textAlign: 'center', marginTop: '50px', color: '#666', letterSpacing: '2px', textTransform: 'uppercase'}}>Syncing the shadows...</p>;

  if (activeHunts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0a0a0a', borderRadius: '2px', border: '1px solid #1a1a1a', borderTop: '2px solid #b01423' }}>
        <h2 style={{ fontFamily: '"Cinzel", serif', color: '#444', letterSpacing: '2px' }}>NO ACTIVE TASKS</h2>
        <p style={{ color: '#888' }}>The streets of Athens are quiet tonight.</p>
      </div>
    );
  }

  // SAFETY NET
  const currentHuntData = activeHunts[selectedIdx] || activeHunts[0];
  if (!activeHunts[selectedIdx] && selectedIdx !== 0) setSelectedIdx(0);
  const { hunt, step, progress } = currentHuntData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      <h2 style={{ fontFamily: '"Cinzel", serif', textAlign: 'center', margin: 0, fontSize: '1.8rem', letterSpacing: '2px' }}>
        Welcome, <span style={{ color: '#b01423', textShadow: '0 0 15px rgba(176,20,35,0.4)' }}>{charName}</span>
      </h2>

      {/* CHRONICLE SELECTOR */}
      <div style={{ background: '#0a0a0a', padding: '20px', borderRadius: '2px', border: '1px solid #1a1a1a', borderTop: '2px solid #b01423', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <label style={{ fontSize: '0.8rem', color: '#c5a059', fontWeight: 'bold', letterSpacing: '1px' }}>SELECT CHRONICLE:</label>
        <select 
          value={selectedIdx} 
          onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
          style={{ width: '100%', padding: '14px', background: '#050505', color: '#d4d4d4', border: '1px solid #222', borderRadius: '2px', marginTop: '10px', fontSize: '0.95rem', outline: 'none' }}
        >
          {activeHunts.map((h, i) => (
            <option key={h.hunt.id} value={i}>
              {h.hunt.title} ({h.progress.percent}%) {h.progress.isGloballyFinished ? '[CLAIMED]' : ''}
            </option>
          ))}
        </select>

        {/* PROGRESS BAR */}
        <div style={{ height: '4px', background: '#111', borderRadius: '0px', marginTop: '20px', overflow: 'hidden' }}>
          <div style={{ width: `${progress.percent}%`, height: '100%', background: '#b01423', boxShadow: '0 0 10px #b01423', transition: 'width 0.8s ease' }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right', marginTop: '8px', letterSpacing: '1px' }}>{progress.percent}% COMPLETED</p>
      </div>

      {/* HUNTER COUNT ALERT */}
      {progress.otherHunters > 0 && !progress.isGloballyFinished && !progress.completed && (
        <div style={{ background: 'rgba(197, 160, 89, 0.05)', border: '1px solid #3a2e18', borderLeft: '3px solid #c5a059', padding: '15px', borderRadius: '2px', textAlign: 'center', fontSize: '0.9rem', color: '#c5a059', letterSpacing: '0.5px' }}>
          ⚠️ <strong>{progress.otherHunters}</strong> other kindred are currently hunting this treasure!
        </div>
      )}

      {/* CLUE CONTENT */}
      <div style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: '2px', padding: '30px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
        {progress.isGloballyFinished && !progress.completed ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <h3 style={{ color: '#666', fontFamily: '"Cinzel", serif', letterSpacing: '2px' }}>CHRONICLE ENDED</h3>
            <p style={{ color: '#444' }}>Another kindred has already secured this prize. You were too slow.</p>
          </div>
        ) : progress.completed ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <h2 style={{ color: '#c5a059', fontFamily: '"Cinzel", serif', letterSpacing: '3px', textShadow: '0 0 15px rgba(197, 160, 89, 0.3)' }}>VICTORY ACHIEVED</h2>
            <p style={{ color: '#aaa', marginTop: '15px' }}>You have successfully claimed the treasure and ended this hunt.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '15px' }}>
              <h3 style={{ color: '#c5a059', margin: 0, fontSize: '1.4rem', fontFamily: '"Cinzel", serif', letterSpacing: '1px' }}>{hunt.title}</h3>
              <span style={{ fontSize: '0.75rem', color: '#666', letterSpacing: '1px', textTransform: 'uppercase' }}>Step {step.step_order}</span>
            </div>
            
            <p style={{ fontSize: '1.1rem', margin: '25px 0', lineHeight: '1.7', color: '#d4d4d4' }}>{step.prompt}</p>

            {error && <p style={{ color: '#ffb8b8', background: 'rgba(176, 20, 35, 0.1)', padding: '15px', borderLeft: '3px solid #b01423', borderRadius: '2px', fontSize: '0.9rem' }}>{error}</p>}

            {/* --- INPUT HANDLERS --- */}
            {step.task_type === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="text" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Your answer..." disabled={isSubmitting}
                  style={{ width: '100%', padding: '16px', background: '#050505', color: '#fff', border: '1px solid #222', borderRadius: '2px', boxSizing: 'border-box', outline: 'none' }}
                />
                <button onClick={() => submitAnswer({ text_answer: textAnswer })} disabled={isSubmitting || !textAnswer.trim()}
                  style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #8a0303 0%, #4a0000 100%)', color: '#fff', border: '1px solid #b01423', borderRadius: '2px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                  {isSubmitting ? 'VERIFYING...' : 'SUBMIT'}
                </button>
              </div>
            )}
            
            {step.task_type === 'gps' && (
              <button onClick={handleGPS} disabled={isSubmitting}
                style={{ width: '100%', padding: '18px', background: '#0a0a0a', color: '#c5a059', border: '1px solid #c5a059', borderRadius: '2px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                {isSubmitting ? 'ACQUIRING SIGNAL...' : '📍 CHECK-IN AT LOCATION'}
              </button>
            )}

            {step.task_type === 'qr' && (
              <div style={{ border: '1px solid #2a0a0a', borderRadius: '2px', overflow: 'hidden', background: '#050505', padding: '10px' }}>
                {!isSubmitting ? (
                  <Scanner onResult={(text) => submitAnswer({ text_answer: text })} />
                ) : (
                  <p style={{textAlign:'center', padding:'40px', color: '#c5a059', letterSpacing: '2px'}}>VERIFYING SIGIL...</p>
                )}
              </div>
            )}

            {['photo', 'draw', 'audio'].includes(step.task_type) && (
              <div style={{ textAlign: 'center' }}>
                <label style={{ background: '#0a0a0a', border: '1px solid #333', color: '#d4d4d4', padding: '18px', borderRadius: '2px', cursor: 'pointer', display: 'block', fontWeight: 'bold', letterSpacing: '2px', transition: 'border 0.3s' }}>
                  {step.task_type === 'photo' ? '📷 TAKE PHOTO' : step.task_type === 'draw' ? '🎨 UPLOAD DRAWING' : '🎤 UPLOAD AUDIO'}
                  <input 
                    type="file" 
                    accept={step.task_type === 'audio' ? 'audio/*' : 'image/*'} 
                    capture={step.task_type === 'photo' ? 'environment' : undefined}
                    onChange={handleMediaUpload} 
                    style={{ display: 'none' }} 
                    disabled={isSubmitting}
                  />
                </label>
                {isSubmitting && <p style={{color:'#c5a059', marginTop:'15px', fontSize: '0.8rem', letterSpacing: '1px'}}>UPLOADING TO THE NETWORK...</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}