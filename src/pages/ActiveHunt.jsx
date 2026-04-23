// src/pages/ActiveHunt.jsx
import { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../api';
import styles from '../styles/ActiveHunt.module.css';

export default function ActiveHunt() {
  const [activeHunts, setActiveHunts] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [charName, setCharName] = useState('Kindred');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastScannedQR, setLastScannedQR] = useState('');
  const [successStatus, setSuccessStatus] = useState('');

  // Team States
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormCode, setTeamFormCode] = useState('');
  const [showTeamMenu, setShowTeamMenu] = useState(false);

  // Canvas & Audio Refs
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedIdx !== null && !activeHunts[selectedIdx]) {
      setSelectedIdx(null);
    }
  }, [activeHunts, selectedIdx]);

  const loadAll = async () => {
    try {
      const [huntRes, charRes] = await Promise.all([
        api.get('/hunts/active'),
        api.get('/characters/me').catch(() => ({ data: { character: null } }))
      ]);

      setActiveHunts(huntRes.data.activeHunts || []);
      if (charRes.data?.character?.name) setCharName(charRes.data.character.name);
    } catch (err) {
      setError('Failed to sync the shadows.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (payload) => {
    setError('');
    setIsSubmitting(true);

    const currentStep = activeHunts[selectedIdx]?.step;
    if (!currentStep?.id) {
      setError('This chronicle is not ready yet. No active step has been published.');
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/hunts/submit', { step_id: currentStep.id, ...payload });
      setTextAnswer('');
      setLastScannedQR('');

      setSuccessStatus('SIGIL ACCEPTED. ADVANCING...');
      setTimeout(async () => {
        setSuccessStatus('');
        setCanvasHistory([]);
        await loadAll();
        setIsSubmitting(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Validation failed. The Court expects better.');
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

  const handleGPS = () => {
    if (!navigator.geolocation) {
      return setError('GPS is disabled. The network cannot find you.');
    }

    setIsSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => submitAnswer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        setIsSubmitting(false);
        setError(`Signal lost (${err.message}). Ensure Location Services are enabled.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
      setError('Transfer failed.');
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
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
          setError('Failed to upload recording.');
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied.');
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

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext('2d');
    setCanvasHistory(prev => [
      ...prev,
      ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
    ]);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#b01423';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    canvasRef.current.getContext('2d').closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHistory([]);
  };

  const undoDrawing = () => {
    if (canvasHistory.length === 0) {
      clearCanvas();
      return;
    }

    const lastState = canvasHistory[canvasHistory.length - 1];
    canvasRef.current.getContext('2d').putImageData(lastState, 0, 0);
    setCanvasHistory(prev => prev.slice(0, -1));
  };

  const submitDrawing = () => {
    if (!canvasRef.current) return;

    setIsSubmitting(true);
    canvasRef.current.toBlob(async (blob) => {
      const file = new File([blob], 'sigil.png', { type: 'image/png' });
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/chat/upload', fd);
        await submitAnswer({ media_id: res.data.id });
      } catch (err) {
        setIsSubmitting(false);
        setError('Failed to bind sigil.');
      }
    }, 'image/png');
  };

  if (loading) {
    return <p className={styles.loadingText}>Syncing the shadows...</p>;
  }

  if (activeHunts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2 className={styles.emptyTitle}>NO ACTIVE PREY</h2>
        <p className={styles.emptySubtitle}>The streets of Athens are quiet tonight.</p>
      </div>
    );
  }

  if (selectedIdx === null) {
    return (
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <div className={styles.dashboardHeader}>
          <p className={styles.greeting}>Good Evening,</p>
          <h2 className={styles.charName}>{charName}</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 className={styles.listTitle}>Available Chronicles</h3>

          {activeHunts.map((h, i) => {
            const isCompleted = h.progress.completed;
            const isLost = h.progress.isGloballyFinished && !isCompleted;
            const isReady = h.isReady !== false;

            const cardClass = isCompleted ? styles.cardCompleted : isLost ? styles.cardLost : '';
            const titleClass = isCompleted
              ? styles.cardTitleCompleted
              : isLost
                ? styles.cardTitleLost
                : styles.cardTitleActive;

            return (
              <div
                key={h.hunt.id}
                className={`${styles.huntCard} ${cardClass}`}
                onClick={() => isReady && setSelectedIdx(i)}
                style={{
                  opacity: isReady ? 1 : 0.65,
                  cursor: isReady ? 'pointer' : 'not-allowed'
                }}
              >
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} ${titleClass}`}>{h.hunt.title}</h3>

                  {!isReady && <span className={styles.badgeLost}>NOT READY</span>}
                  {isCompleted && <span className={styles.badgeCompleted}>🏆 CLAIMED</span>}
                  {isLost && isReady && <span className={styles.badgeLost}>💀 LOST</span>}
                  {!isCompleted && !isLost && isReady && (
                    <span className={styles.badgeActive}>{h.progress.percent}% DONE</span>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <span
                    className={styles.coterieStatus}
                    style={{ color: h.team ? '#c5a059' : '#666' }}
                  >
                    {h.team ? `🛡️ ${h.team.name}` : '👤 Solo Hunt'}
                  </span>

                  {h.progress.otherHunters > 0 && !isCompleted && !isLost && isReady && (
                    <span className={styles.rivalAlert}>
                      <span className={styles.pulseDot}></span>
                      {h.progress.otherHunters} Rivals
                    </span>
                  )}
                </div>

                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressFill} ${isCompleted ? styles.progressFillCompleted : ''}`}
                    style={{ width: `${h.progress.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentHunt = activeHunts[selectedIdx];
  const { hunt, step, team, progress } = currentHunt;
  const isReady = currentHunt.isReady !== false;

  return (
    <div className={`${styles.container} ${styles.fadeIn}`}>
      <button
        onClick={() => {
          setSelectedIdx(null);
          setSuccessStatus('');
          setError('');
          setIsSubmitting(false);
        }}
        className={styles.backBtn}
      >
        <span style={{ fontSize: '1.2rem' }}>←</span> Return to Board
      </button>

      <div className={styles.focusHeader}>
        <h2 className={styles.focusTitle}>{hunt.title}</h2>

        <div className={styles.teamSection}>
          {team ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className={styles.flexBetween}>
                <strong className={styles.teamName}>🛡️ Coterie: {team.name}</strong>
                <span className={styles.teamCodeBox}>
                  CODE: <strong style={{ color: '#d4d4d4' }}>{team.invite_code}</strong>
                </span>
              </div>
              <p className={styles.teamMembers}>Active Members: {team.members.join(', ')}</p>
            </div>
          ) : (
            <div>
              {!showTeamMenu ? (
                <div className={styles.flexBetween}>
                  <span style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    You are hunting alone.
                  </span>
                  <button onClick={() => setShowTeamMenu(true)} className={styles.btnOutlineSmall}>
                    Form Coterie
                  </button>
                </div>
              ) : (
                <div className={styles.teamFormBox}>
                  <div className={styles.flexBetween}>
                    <strong
                      style={{
                        color: '#c5a059',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}
                    >
                      Establish Coterie
                    </strong>
                    <button onClick={() => setShowTeamMenu(false)} className={styles.btnGhost}>
                      ✕ Cancel
                    </button>
                  </div>

                  <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="New Team Name..."
                      value={teamFormName}
                      onChange={(e) => setTeamFormName(e.target.value)}
                      disabled={isSubmitting}
                      className={styles.input}
                    />
                    <button type="submit" disabled={isSubmitting} className={styles.btnPrimary}>
                      CREATE
                    </button>
                  </form>

                  <div style={{ textAlign: 'center', color: '#333', fontSize: '0.7rem', letterSpacing: '2px' }}>
                    — OR —
                  </div>

                  <form onSubmit={handleJoinTeam} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Invite Code (e.g. A1B2C3)"
                      value={teamFormCode}
                      onChange={(e) => setTeamFormCode(e.target.value)}
                      disabled={isSubmitting}
                      className={styles.input}
                    />
                    <button type="submit" disabled={isSubmitting} className={styles.btnSecondary}>
                      JOIN
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.clueBox}>
        {successStatus ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#3ecf8e',
              letterSpacing: '3px',
              fontWeight: 'bold'
            }}
          >
            <h2
              style={{
                fontSize: '1.5rem',
                textShadow: '0 0 15px rgba(62, 207, 142, 0.4)'
              }}
            >
              {successStatus}
            </h2>
          </div>
        ) : !isReady ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h3
              style={{
                color: '#666',
                fontFamily: '"Cinzel", serif',
                letterSpacing: '2px',
                fontSize: '1.5rem'
              }}
            >
              CHRONICLE NOT READY
            </h3>
            <p style={{ color: '#444', lineHeight: '1.6' }}>
              This hunt is active, but no playable step is available yet. Await the Storyteller.
            </p>
          </div>
        ) : progress.isGloballyFinished && !progress.completed ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h3
              style={{
                color: '#666',
                fontFamily: '"Cinzel", serif',
                letterSpacing: '2px',
                fontSize: '1.5rem'
              }}
            >
              CHRONICLE ENDED
            </h3>
            <p style={{ color: '#444', lineHeight: '1.6' }}>
              Another kindred has already secured this prize. You were too slow. The Court remembers failures.
            </p>
          </div>
        ) : progress.completed ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h2
              style={{
                color: '#c5a059',
                fontFamily: '"Cinzel", serif',
                letterSpacing: '3px',
                textShadow: '0 0 20px rgba(197, 160, 89, 0.2)',
                fontSize: '1.8rem'
              }}
            >
              VICTORY ACHIEVED
            </h2>
            <p style={{ color: '#888', marginTop: '15px', lineHeight: '1.6' }}>
              You have successfully claimed the treasure. Your Coterie's name grows in the shadows.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.clueHeader}>
              <span className={styles.stepTag}>Step {step.step_order}</span>
              <span className={styles.percentTag}>{progress.percent}% Complete</span>
            </div>

            <p className={styles.promptText}>"{step.prompt}"</p>

            {error && <div className={styles.errorBox}>{error}</div>}

            {step.task_type === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Speak the answer..."
                  disabled={isSubmitting}
                  className={styles.inputLarge}
                />
                <button
                  onClick={() => submitAnswer({ text_answer: textAnswer })}
                  disabled={isSubmitting || !textAnswer.trim()}
                  className={`${styles.btnPrimary} ${styles.btnPrimaryLarge}`}
                >
                  {isSubmitting ? 'VERIFYING...' : 'SUBMIT'}
                </button>
              </div>
            )}

            {step.task_type === 'gps' && (
              <button onClick={handleGPS} disabled={isSubmitting} className={styles.btnOutlineGold}>
                {isSubmitting ? 'ACQUIRING SATELLITE LOCK...' : '📍 REVEAL LOCATION TO THE COURT'}
              </button>
            )}

            {step.task_type === 'qr' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className={styles.qrContainer}>
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
                    <p
                      style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#c5a059',
                        letterSpacing: '2px',
                        margin: 0
                      }}
                    >
                      VERIFYING SIGIL...
                    </p>
                  )}
                </div>

                {lastScannedQR && (
                  <div className={styles.debugBox}>
                    <strong style={{ color: '#b01423' }}>SCANNED:</strong> {lastScannedQR}
                  </div>
                )}
              </div>
            )}

            {step.task_type === 'draw' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className={styles.canvasContainer}>
                  {!isDrawing && canvasHistory.length === 0 && (
                    <div className={styles.canvasPlaceholder}>DRAW HERE</div>
                  )}
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={undoDrawing}
                    disabled={isSubmitting || canvasHistory.length === 0}
                    style={{
                      flex: 1,
                      padding: '15px',
                      background: 'transparent',
                      color: '#aaa',
                      border: '1px solid #333',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    ↩ Undo
                  </button>

                  <button
                    onClick={clearCanvas}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '15px',
                      background: 'transparent',
                      color: '#666',
                      border: '1px solid #333',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    Clear
                  </button>

                  <button
                    onClick={submitDrawing}
                    disabled={isSubmitting}
                    className={styles.btnPrimary}
                    style={{ flex: 2, padding: '15px' }}
                  >
                    {isSubmitting ? 'BINDING...' : 'SUBMIT SIGIL'}
                  </button>
                </div>
              </div>
            )}

            {step.task_type === 'photo' && (
              <div className={styles.mediaGrid}>
                <label className={`${styles.mediaLabel} ${styles.mediaLabelPrimary}`}>
                  <span style={{ fontSize: '1.5rem' }}>📷</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>TAKE PHOTO</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleMediaUpload}
                    style={{ display: 'none' }}
                    disabled={isSubmitting}
                  />
                </label>

                <label className={`${styles.mediaLabel} ${styles.mediaLabelSecondary}`}>
                  <span style={{ fontSize: '1.5rem' }}>📂</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>UPLOAD</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMediaUpload}
                    style={{ display: 'none' }}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            )}

            {step.task_type === 'audio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {!isRecording ? (
                  <button onClick={startRecording} disabled={isSubmitting} className={styles.btnOutlineGold}>
                    🎤 BEGIN INCANTATION
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className={`${styles.btnPrimary} ${styles.btnPrimaryLarge}`}
                    style={{ animation: 'pulse 1.5s infinite' }}
                  >
                    ⏹️ END & SUBMIT
                  </button>
                )}

                <div
                  style={{
                    textAlign: 'center',
                    color: '#333',
                    fontSize: '0.7rem',
                    letterSpacing: '3px',
                    margin: '10px 0'
                  }}
                >
                  — OR —
                </div>

                <label
                  className={`${styles.mediaLabel} ${styles.mediaLabelSecondary}`}
                  style={{ flexDirection: 'row' }}
                >
                  📂 UPLOAD AUDIO FILE
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleMediaUpload}
                    style={{ display: 'none' }}
                    disabled={isSubmitting || isRecording}
                  />
                </label>
              </div>
            )}

            {isSubmitting && ['photo', 'audio'].includes(step.task_type) && (
              <p
                style={{
                  color: '#c5a059',
                  textAlign: 'center',
                  marginTop: '20px',
                  fontSize: '0.75rem',
                  letterSpacing: '2px'
                }}
              >
                UPLOADING TO THE COURT...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}