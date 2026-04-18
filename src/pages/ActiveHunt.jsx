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
    // Refresh the hunt list every 30 seconds to update Hunter Counts
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
      
      // Update Greeting with actual Character Name
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
      await loadAll(); // Refresh to see updated progress percent
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

  if (loading) return <p style={{textAlign: 'center', marginTop: '50px', color: '#666'}}>Syncing chronicles...</p>;

  if (activeHunts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', background: '#111', borderRadius: '8px', border: '1px solid #222' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#888' }}>No Active Tasks</h2>
        <p>The streets of Athens are quiet tonight.</p>
      </div>
    );
  }

  const { hunt, step, progress } = activeHunts[selectedIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <h2 style={{ fontFamily: 'Cinzel, serif', textAlign: 'center', margin: 0 }}>
        Welcome, <span style={{ color: '#b01423' }}>{charName}</span>
      </h2>

      {/* CHRONICLE SELECTOR WITH PROGRESS & COMPETITION ALERTS */}
      <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
        <label style={{ fontSize: '0.75rem', color: '#a18a4d', fontWeight: 'bold' }}>SELECT CHRONICLE:</label>
        <select 
          value={selectedIdx} 
          onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
          style={{ width: '100%', padding: '12px', background: '#000', color: '#fff', border: '1px solid #b01423', borderRadius: '4px', marginTop: '5px' }}
        >
          {activeHunts.map((h, i) => (
            <option key={h.hunt.id} value={i}>
              {h.hunt.title} ({h.progress.percent}%) {h.progress.isGloballyFinished ? '[CLAIMED]' : ''}
            </option>
          ))}
        </select>

        {/* PROGRESS BAR */}
        <div style={{ height: '6px', background: '#000', borderRadius: '3px', marginTop: '15px', overflow: 'hidden' }}>
          <div style={{ width: `${progress.percent}%`, height: '100%', background: '#b01423', transition: 'width 0.5s ease' }} />
        </div>
        <p style={{ fontSize: '0.7rem', color: '#666', textAlign: 'right', marginTop: '4px' }}>{progress.percent}% Completed</p>
      </div>

      {/* HUNTER COUNT ALERT */}
      {progress.otherHunters > 0 && !progress.isGloballyFinished && !progress.completed && (
        <div style={{ background: 'rgba(161, 138, 77, 0.1)', border: '1px solid #a18a4d', padding: '10px', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem', color: '#a18a4d' }}>
          ⚠️ <strong>{progress.otherHunters}</strong> other kindred are currently hunting this treasure!
        </div>
      )}

      {/* CLUE CONTENT WITH EXCLUSIVE WINNER LOCK */}
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        {progress.isGloballyFinished && !progress.completed ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h3 style={{ color: '#666' }}>Chronicle Ended</h3>
            <p style={{ color: '#444' }}>Another kindred has already secured this prize. You were too slow.</p>
          </div>
        ) : progress.completed ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h2 style={{ color: '#a18a4d', fontFamily: 'Cinzel, serif' }}>Victory Achieved</h2>
            <p>You have successfully claimed the treasure and ended this hunt.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#a18a4d', margin: 0 }}>{hunt.title}</h3>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Step {step.step_order}</span>
            </div>
            
            <p style={{ fontSize: '1.2rem', margin: '20px 0', lineHeight: '1.6' }}>{step.prompt}</p>

            {error && <p style={{ color: '#ffaaaa', background: 'rgba(50,0,0,0.5)', padding: '12px', border: '1px solid red', borderRadius: '4px' }}>{error}</p>}

            {/* --- INPUT HANDLERS --- */}
            {step.task_type === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Your answer..." disabled={isSubmitting}
                  style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box' }}
                />
                <button onClick={() => submitAnswer({ text_answer: textAnswer })} disabled={isSubmitting || !textAnswer.trim()}
                  style={{ width: '100%', padding: '14px', background: '#b01423', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  {isSubmitting ? 'VERIFYING...' : 'SUBMIT'}
                </button>
              </div>
            )}
            
            {step.task_type === 'gps' && (
              <button onClick={handleGPS} disabled={isSubmitting}
                style={{ width: '100%', padding: '18px', background: '#222', color: '#a18a4d', border: '1px solid #a18a4d', borderRadius: '4px', fontWeight: 'bold' }}>
                {isSubmitting ? 'ACQUIRING SIGNAL...' : '📍 CHECK-IN AT LOCATION'}
              </button>
            )}

            {step.task_type === 'qr' && (
              <div style={{ border: '2px solid #b01423', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                {!isSubmitting ? (
                  <Scanner onResult={(text) => submitAnswer({ text_answer: text })} />
                ) : (
                  <p style={{textAlign:'center', padding:'40px', color: '#a18a4d'}}>Verifying Sigil...</p>
                )}
              </div>
            )}

            {['photo', 'draw', 'audio'].includes(step.task_type) && (
              <div style={{ textAlign: 'center' }}>
                <label style={{ background: '#222', border: '1px solid #fff', color: '#fff', padding: '15px', borderRadius: '4px', cursor: 'pointer', display: 'block', fontWeight: 'bold' }}>
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
                {isSubmitting && <p style={{color:'#a18a4d', marginTop:'10px', fontSize: '0.8rem'}}>Uploading to the network...</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}