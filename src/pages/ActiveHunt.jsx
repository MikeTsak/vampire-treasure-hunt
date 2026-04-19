// src/pages/ActiveHunt.jsx
import { useState, useEffect, useRef } from 'react';
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
  const [lastScannedQR, setLastScannedQR] = useState('');

  // Team States
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormCode, setTeamFormCode] = useState('');
  const [showTeamMenu, setShowTeamMenu] = useState(false);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
      setLastScannedQR(''); 
      await loadAll(); 
    } catch (err) {
      setError(err.response?.data?.error || 'Validation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamFormName) return;
    setIsSubmitting(true);
    try {
      await api.post(`/hunts/${activeHunts[selectedIdx].hunt.id}/groups`, { name: teamFormName });
      setShowTeamMenu(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to form coterie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!teamFormCode) return;
    setIsSubmitting(true);
    try {
      await api.post(`/hunts/${activeHunts[selectedIdx].hunt.id}/groups/join`, { code: teamFormCode });
      setShowTeamMenu(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid invite code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... (Keep existing GPS, MediaUpload, Audio, and Canvas functions exactly the same) ...
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

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setIsSubmitting(true);
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await api.post('/chat/upload', fd);
          await submitAnswer({ media_id: res.data.id });
        } catch (err) {
          setIsSubmitting(false);
          setError("Failed to upload recording.");
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX = e.clientX, clientY = e.clientY;
    if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y); ctx.strokeStyle = '#b01423'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    canvasRef.current.getContext('2d').closePath(); setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitDrawing = () => {
    if (!canvasRef.current) return;
    setIsSubmitting(true);
    canvasRef.current.toBlob(async (blob) => {
      const file = new File([blob], 'sigil.png', { type: 'image/png' });
      try {
        const fd = new FormData(); fd.append('file', file);
        const res = await api.post('/chat/upload', fd);
        await submitAnswer({ media_id: res.data.id });
      } catch (err) {
        setIsSubmitting(false); setError("Failed to transfer sigil.");
      }
    }, 'image/png');
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

  const currentHuntData = activeHunts[selectedIdx] || activeHunts[0];
  if (!activeHunts[selectedIdx] && selectedIdx !== 0) setSelectedIdx(0);
  const { hunt, step, team, progress } = currentHuntData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      <h2 style={{ fontFamily: '"Cinzel", serif', textAlign: 'center', margin: 0, fontSize: '1.8rem', letterSpacing: '2px' }}>
        Welcome, <span style={{ color: '#b01423', textShadow: '0 0 15px rgba(176,20,35,0.4)' }}>{charName}</span>
      </h2>

      {/* --- CHRONICLE & TEAM SELECTOR --- */}
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

        {/* TEAM DASHBOARD */}
        <div style={{ marginTop: '20px', padding: '15px', background: '#050505', border: '1px dashed #333', borderRadius: '2px' }}>
          {team ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ color: '#c5a059', fontSize: '1rem', letterSpacing: '1px' }}>🛡️ {team.name}</strong>
                <span style={{ fontSize: '0.75rem', background: '#222', padding: '4px 8px', borderRadius: '4px', color: '#fff', letterSpacing: '2px' }}>
                  CODE: <strong style={{ color: '#b01423' }}>{team.invite_code}</strong>
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>
                Members: {team.members.join(', ')}
              </p>
              <p style={{ margin: '10px 0 0 0', fontSize: '0.75rem', color: '#555', fontStyle: 'italic' }}>
                * Progress is shared. When anyone solves a clue, the whole coterie advances.
              </p>
            </div>
          ) : (
            <div>
              {!showTeamMenu ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>Hunting Solo</span>
                  <button onClick={() => setShowTeamMenu(true)} style={{ background: 'transparent', border: '1px solid #c5a059', color: '#c5a059', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '2px', fontWeight: 'bold' }}>
                    FORM COTERIE
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: '#c5a059', fontSize: '0.9rem' }}>Establish Coterie</strong>
                    <button onClick={() => setShowTeamMenu(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Cancel</button>
                  </div>
                  
                  {/* Create */}
                  <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Team Name..." value={teamFormName} onChange={e => setTeamFormName(e.target.value)} disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#000', border: '1px solid #333', color: '#fff' }} />
                    <button type="submit" disabled={isSubmitting} style={{ background: '#222', border: '1px solid #b01423', color: '#fff', padding: '0 15px', cursor: 'pointer' }}>Create</button>
                  </form>
                  
                  <div style={{ textAlign: 'center', color: '#444', fontSize: '0.75rem' }}>- OR JOIN EXISTING -</div>
                  
                  {/* Join */}
                  <form onSubmit={handleJoinTeam} style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Invite Code (e.g. A1B2C3)" value={teamFormCode} onChange={e => setTeamFormCode(e.target.value)} disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#000', border: '1px solid #333', color: '#fff' }} />
                    <button type="submit" disabled={isSubmitting} style={{ background: '#222', border: '1px solid #c5a059', color: '#fff', padding: '0 15px', cursor: 'pointer' }}>Join</button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

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

            {error && <p style={{ color: '#ffb8b8', background: 'rgba(176, 20, 35, 0.1)', padding: '15px', borderLeft: '3px solid #b01423', borderRadius: '2px', fontSize: '0.9rem', marginBottom: '20px' }}>{error}</p>}

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ border: '1px solid #2a0a0a', borderRadius: '2px', overflow: 'hidden', background: '#050505', padding: '10px' }}>
                  {!isSubmitting ? (
                    <Scanner 
                      onScan={(result) => {
                        if (isSubmitting) return;
                        const text = Array.isArray(result) ? result[0]?.rawValue : result;
                        if (!text) return;
                        setLastScannedQR(text);
                        submitAnswer({ text_answer: text });
                      }}
                      onResult={(text) => {
                        if (isSubmitting || !text) return;
                        setLastScannedQR(text);
                        submitAnswer({ text_answer: text });
                      }} 
                    />
                  ) : (
                    <p style={{textAlign:'center', padding:'40px', color: '#c5a059', letterSpacing: '2px'}}>VERIFYING SIGIL...</p>
                  )}
                </div>
                {lastScannedQR && (
                  <div style={{ background: '#050505', border: '1px dashed #333', padding: '12px', borderRadius: '2px', textAlign: 'center', fontFamily: 'monospace', color: '#d4d4d4', fontSize: '0.85rem' }}>
                    <strong style={{color: '#b01423', marginRight: '8px'}}>DEBUG SCAN:</strong> {lastScannedQR}
                  </div>
                )}
              </div>
            )}

            {step.task_type === 'draw' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ border: '1px solid #333', borderRadius: '2px', background: '#050505', touchAction: 'none' }}>
                  <canvas 
                    ref={canvasRef}
                    width={400} height={400} 
                    style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={clearCanvas} disabled={isSubmitting} style={{ flex: 1, padding: '15px', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '2px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>Clear</button>
                  <button onClick={submitDrawing} disabled={isSubmitting} style={{ flex: 2, padding: '15px', background: 'linear-gradient(135deg, #8a0303 0%, #4a0000 100%)', color: '#fff', border: '1px solid #b01423', borderRadius: '2px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {isSubmitting ? 'BINDING...' : 'SUBMIT SIGIL'}
                  </button>
                </div>
              </div>
            )}

            {step.task_type === 'photo' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{ flex: 1, textAlign: 'center', background: '#0a0a0a', border: '1px solid #333', color: '#d4d4d4', padding: '18px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px', transition: 'border 0.3s' }}>
                  📷 TAKE
                  <input type="file" accept="image/*" capture="environment" onChange={handleMediaUpload} style={{ display: 'none' }} disabled={isSubmitting} />
                </label>
                <label style={{ flex: 1, textAlign: 'center', background: '#050505', border: '1px dashed #333', color: '#888', padding: '18px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px', transition: 'border 0.3s' }}>
                  📂 UPLOAD
                  <input type="file" accept="image/*" onChange={handleMediaUpload} style={{ display: 'none' }} disabled={isSubmitting} />
                </label>
              </div>
            )}

            {step.task_type === 'audio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {!isRecording ? (
                  <button onClick={startRecording} disabled={isSubmitting} style={{ width: '100%', padding: '18px', background: '#0a0a0a', color: '#c5a059', border: '1px solid #c5a059', borderRadius: '2px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                    🎤 START RECORDING
                  </button>
                ) : (
                  <button onClick={stopRecording} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #8a0303 0%, #4a0000 100%)', color: '#fff', border: '1px solid #b01423', borderRadius: '2px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', boxShadow: '0 0 15px rgba(176,20,35,0.6)' }}>
                    ⏹️ STOP & SEND
                  </button>
                )}
                <div style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', letterSpacing: '1px', margin: '5px 0' }}>- OR -</div>
                <label style={{ textAlign: 'center', background: '#050505', border: '1px dashed #333', color: '#888', padding: '15px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px', transition: 'border 0.3s' }}>
                  📂 UPLOAD AUDIO FILE
                  <input type="file" accept="audio/*" onChange={handleMediaUpload} style={{ display: 'none' }} disabled={isSubmitting || isRecording} />
                </label>
              </div>
            )}

            {isSubmitting && ['photo', 'audio'].includes(step.task_type) && (
              <p style={{color:'#c5a059', textAlign: 'center', marginTop:'15px', fontSize: '0.8rem', letterSpacing: '1px'}}>UPLOADING TO THE NETWORK...</p>
            )}

          </>
        )}
      </div>
    </div>
    
  );
}