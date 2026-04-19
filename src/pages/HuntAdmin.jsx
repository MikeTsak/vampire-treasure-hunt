// src/pages/HuntAdmin.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import styles from '../styles/HuntAdmin.module.css'; 

export default function HuntAdmin() {
  const [hunts, setHunts] = useState([]);
  const [selectedHunt, setSelectedHunt] = useState(null);
  
  // Tab Data
  const [steps, setSteps] = useState([]);
  const [playerProgress, setPlayerProgress] = useState([]); 
  const [reviews, setReviews] = useState([]); 
  const [activeTab, setActiveTab] = useState('steps'); 
  
  const [newHuntTitle, setNewHuntTitle] = useState('');
  const [editingStepId, setEditingStepId] = useState(null);
  
  const formRef = useRef(null); 

  const [stepForm, setStepForm] = useState({
    task_type: 'text',
    prompt: '',
    target_data_1: '', 
    target_data_2: ''  
  });

  useEffect(() => {
    fetchHunts();
  }, []);

  const fetchHunts = async () => {
    try {
      const res = await api.get('/admin/hunts');
      setHunts(res.data.hunts);
    } catch (err) {
      console.error("Failed to load hunts");
    }
  };

  const loadHuntData = async (huntId) => {
    try {
      const resSteps = await api.get(`/admin/hunts/${huntId}/steps`);
      const resProg = await api.get(`/admin/hunts/${huntId}/progress`);
      const resReviews = await api.get(`/admin/hunts/${huntId}/reviews`).catch(() => ({ data: { reviews: [] } }));
      
      setSteps(resSteps.data.steps);
      setPlayerProgress(resProg.data.progress);
      setReviews(resReviews.data.reviews || []);
      setSelectedHunt(huntId);
      cancelEdit(); 
    } catch (err) {
      console.error("Failed to load hunt data");
    }
  };

  const handleCreateHunt = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/hunts', { title: newHuntTitle, description: 'Created via ST panel' });
      setNewHuntTitle('');
      fetchHunts();
    } catch (err) {
      alert("Failed to create hunt.");
    }
  };

  const toggleHuntActive = async (hunt) => {
    try {
      await api.patch(`/admin/hunts/${hunt.id}/toggle`);
      fetchHunts();
    } catch (err) {
      alert("Failed to toggle hunt.");
    }
  };

  const handleDeleteHunt = async (huntId) => {
    if (!window.confirm("Are you sure you want to destroy this chronicle? This will permanently wipe all clues, player progress, and submitted evidence.")) return;
    
    try {
      await api.delete(`/admin/hunts/${huntId}`);
      
      // If the admin deleted the hunt they are currently looking at, clear the right panel
      if (selectedHunt === huntId) {
        setSelectedHunt(null);
        setSteps([]);
        setPlayerProgress([]);
        setReviews([]);
      }
      
      fetchHunts();
    } catch (err) {
      alert("Failed to destroy chronicle.");
    }
  };

  const handleSaveStep = async (e) => {
    e.preventDefault();
    
    let targetData = {};
    if (stepForm.task_type === 'text') {
      targetData = { answer: stepForm.target_data_1.toLowerCase().trim() };
    } else if (stepForm.task_type === 'qr') {
      targetData = { qr_string: stepForm.target_data_1.trim() };
    } else if (stepForm.task_type === 'gps') {
      targetData = { 
        lat: parseFloat(stepForm.target_data_1), 
        lng: parseFloat(stepForm.target_data_2),
        radius_meters: 50 
      };
    } else if (['photo', 'draw', 'audio'].includes(stepForm.task_type)) {
      targetData = { manual_review: true };
    }

    try {
      if (editingStepId) {
        await api.put(`/admin/hunts/${selectedHunt}/steps/${editingStepId}`, {
          task_type: stepForm.task_type,
          prompt: stepForm.prompt,
          target_data: targetData
        });
      } else {
        await api.post(`/admin/hunts/${selectedHunt}/steps`, {
          task_type: stepForm.task_type,
          prompt: stepForm.prompt,
          target_data: targetData,
          step_order: steps.length + 1
        });
      }
      
      cancelEdit();
      loadHuntData(selectedHunt);
    } catch (err) {
      alert("Failed to save the challenge.");
    }
  };

  const startEditStep = (step) => {
    setEditingStepId(step.id);
    let t1 = '';
    let t2 = '';
    
    try {
      const parsed = typeof step.target_data === 'string' ? JSON.parse(step.target_data) : step.target_data;
      if (parsed) {
        if (step.task_type === 'text') t1 = parsed.answer || '';
        if (step.task_type === 'qr') t1 = parsed.qr_string || '';
        if (step.task_type === 'gps') {
          t1 = parsed.lat || '';
          t2 = parsed.lng || '';
        }
      }
    } catch (err) { console.error("Parse error", err); }

    setStepForm({
      task_type: step.task_type,
      prompt: step.prompt,
      target_data_1: t1,
      target_data_2: t2
    });

    setActiveTab('steps');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingStepId(null);
    setStepForm({ task_type: 'text', prompt: '', target_data_1: '', target_data_2: '' });
  };

  const handleDeleteStep = async (stepId) => {
    if (!window.confirm("Delete this step? This could break the chronicle for players currently on it.")) return;
    try {
      await api.delete(`/admin/hunts/${selectedHunt}/steps/${stepId}`);
      loadHuntData(selectedHunt);
    } catch (err) {
      alert("Failed to delete step.");
    }
  };

  const handleReviewAction = async (submissionId, action) => {
    try {
      await api.post(`/admin/reviews/${submissionId}/${action}`);
      loadHuntData(selectedHunt);
    } catch (err) {
      alert("Failed to process evidence.");
    }
  };

  const renderTargetData = (data) => {
    if (!data) return "None";
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return JSON.stringify(parsed);
    } catch (err) { return String(data); }
  };

  return (
    <div className={styles.adminContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #2a0a0a', paddingBottom: '15px', marginBottom: '30px' }}>
        <h1 className={styles.header} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>🦇 Grand Hunt Master</h1>
        
        {/* REFRESH BUTTON */}
        {selectedHunt && (activeTab === 'progress' || activeTab === 'reviews') && (
          <button onClick={() => loadHuntData(selectedHunt)} className={styles.actionBtn} style={{ padding: '8px 15px' }}>
            🔄 Refresh Data
          </button>
        )}
      </div>
      
      <div className={styles.layoutGrid}>
        
        {/* LEFT COLUMN: Manage Campaigns */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Active Chronicles</h2>
          
          <form onSubmit={handleCreateHunt} className={styles.formGroup}>
            <input 
              type="text" 
              placeholder="New Hunt Title..." 
              value={newHuntTitle}
              onChange={e => setNewHuntTitle(e.target.value)}
              className={styles.input}
              required 
            />
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Add</button>
          </form>

          <ul className={styles.huntList}>
            {hunts.map(hunt => (
              <li key={hunt.id} className={`${styles.huntItem} ${selectedHunt === hunt.id ? styles.activeSelection : ''}`}>
                <div className={styles.huntName} onClick={() => loadHuntData(hunt.id)}>
                  {hunt.title}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    onClick={() => toggleHuntActive(hunt)}
                    className={`${styles.btn} ${hunt.is_active ? styles.btnPrimary : ''}`}
                    style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                  >
                    {hunt.is_active ? 'ACTIVE' : 'OFF'}
                  </button>
                  <button 
                    onClick={() => handleDeleteHunt(hunt.id)}
                    className={styles.deleteBtn}
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    title="Destroy Chronicle"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
            {hunts.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>No hunts created yet.</p>}
          </ul>
        </div>

        {/* RIGHT COLUMN: Tabs for Steps, Progress & Reviews */}
        <div className={styles.panel}>
          {!selectedHunt ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#888' }}>
              <p style={{letterSpacing: '1px'}}>Select a chronicle from the left to manage it.</p>
            </div>
          ) : (
            <>
              {/* TAB NAVIGATION */}
              <div className={styles.tabContainer}>
                <button className={`${styles.tabBtn} ${activeTab === 'steps' ? styles.tabActive : ''}`} onClick={() => setActiveTab('steps')}>
                  Edit Clues
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'progress' ? styles.tabActive : ''}`} onClick={() => setActiveTab('progress')}>
                  Player Tracker
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'reviews' ? styles.tabActive : ''}`} onClick={() => setActiveTab('reviews')}>
                  Evidence Review {reviews.length > 0 && <span className={styles.badge}>{reviews.length}</span>}
                </button>
              </div>
              
              {/* TAB 1: EDIT STEPS */}
              {activeTab === 'steps' && (
                <div>
                  <div ref={formRef} style={{ background: editingStepId ? '#1a0a0a' : '#080808', padding: '20px', borderRadius: '2px', marginBottom: '30px', border: editingStepId ? '1px solid #b01423' : '1px solid #1a1a1a', transition: 'all 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: editingStepId ? '#b01423' : '#c5a059', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {editingStepId ? 'Editing Challenge' : 'Add a Challenge'}
                      </h3>
                      {editingStepId && (
                        <button onClick={cancelEdit} className={styles.cancelBtn}>Cancel Edit</button>
                      )}
                    </div>

                    <form onSubmit={handleSaveStep} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <select value={stepForm.task_type} onChange={e => setStepForm({...stepForm, task_type: e.target.value})} className={styles.input}>
                        <option value="text">Input: Text Password / Riddle Answer</option>
                        <option value="gps">Location: GPS Check-in</option>
                        <option value="qr">Scan: Find & Scan QR Code</option>
                        <option value="photo">Upload: Take Photo / Evidence</option>
                        <option value="draw">Create: Draw Sigil</option>
                        <option value="audio">Record: Capture Audio</option>
                      </select>

                      <textarea placeholder="Storyteller Prompt (What the player reads...)" value={stepForm.prompt} onChange={e => setStepForm({...stepForm, prompt: e.target.value})} className={styles.input} style={{ minHeight: '80px', resize: 'vertical' }} required />

                      {stepForm.task_type === 'text' && ( <input type="text" placeholder="The Exact Correct Answer (e.g. 'caine')" required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} className={styles.input} /> )}
                      {stepForm.task_type === 'qr' && ( <input type="text" placeholder="Expected QR Code String (e.g. 'elysium_door_1')" required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} className={styles.input} /> )}
                      {stepForm.task_type === 'gps' && (
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <input type="number" step="any" placeholder="Latitude" required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} className={styles.input} />
                          <input type="number" step="any" placeholder="Longitude" required value={stepForm.target_data_2} onChange={e => setStepForm({...stepForm, target_data_2: e.target.value})} className={styles.input} />
                        </div>
                      )}

                      <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                        {editingStepId ? 'Save Changes' : 'Append Step'}
                      </button>
                    </form>
                  </div>

                  <ul className={styles.stepList}>
                    {steps.map(step => (
                      <li key={step.id} className={`${styles.stepItem} ${editingStepId === step.id ? styles.editingHighlight : ''}`}>
                        <div className={styles.stepHeader}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <strong style={{ color: '#d4d4d4', fontSize: '1.2rem', fontFamily: '"Cinzel", serif' }}>Step {step.step_order}</strong>
                            <span className={styles.stepTag}>{step.task_type.toUpperCase()}</span>
                          </div>
                          <div className={styles.stepActions}>
                            <button onClick={() => startEditStep(step)} className={styles.actionBtn}>Edit</button>
                            <button onClick={() => handleDeleteStep(step.id)} className={styles.deleteBtn}>Delete</button>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '1rem', lineHeight: '1.5', color: '#bbb' }}>{step.prompt}</p>
                        <div className={styles.targetDataBox}>Expected Target: {renderTargetData(step.target_data)}</div>
                      </li>
                    ))}
                    {steps.length === 0 && <p style={{ color: '#666', textAlign: 'center' }}>No steps added yet.</p>}
                  </ul>
                </div>
              )}

              {/* TAB 2: PLAYER PROGRESS */}
              {activeTab === 'progress' && (
                <div className={styles.progressContainer}>
                  {playerProgress.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', marginTop: '40px', letterSpacing: '1px' }}>No kindred have begun this chronicle yet.</p>
                  ) : (
                    <ul className={styles.progressList}>
                      {playerProgress.sort((a,b) => b.percent - a.percent).map(player => (
                        <li key={player.user_id} className={styles.progressItem}>
                          <div className={styles.progressHeader}>
                            <strong style={{ color: player.completed ? '#c5a059' : '#d4d4d4', fontSize: '1.1rem' }}>
                              {player.character_name}
                            </strong>
                            <span style={{ fontSize: '0.85rem', color: '#888' }}>
                              {player.completed ? 'FINISHED' : `On Step ${player.current_step || 1}`}
                            </span>
                          </div>
                          
                          <div className={styles.progressBarBg}>
                            <div className={styles.progressBarFill} style={{ width: `${player.percent}%`, background: player.completed ? '#c5a059' : '#b01423', boxShadow: player.completed ? '0 0 10px #c5a059' : '0 0 10px #b01423' }} />
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>{player.percent}% Completed</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* TAB 3: EVIDENCE REVIEW */}
              {activeTab === 'reviews' && (
                <div className={styles.progressContainer}>
                  {reviews.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', marginTop: '40px', letterSpacing: '1px' }}>No pending evidence requires the Court's attention.</p>
                  ) : (
                    <div className={styles.reviewGrid}>
                      {reviews.map(rev => (
                        <div key={rev.submission_id} className={styles.reviewCard}>
                          <div className={styles.reviewHeader}>
                            <strong style={{ color: '#c5a059', fontSize: '1.1rem' }}>{rev.character_name}</strong>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Step {rev.step_order}</span>
                          </div>
                          
                          <p style={{ fontSize: '0.9rem', color: '#aaa', margin: '10px 0', fontStyle: 'italic' }}>
                            "{rev.prompt}"
                          </p>

                          <div className={styles.mediaBox}>
                            {rev.task_type === 'audio' ? (
                              <audio controls src={`${import.meta.env.VITE_API_URL}/chat/media/${rev.media_id}?token=${localStorage.getItem('token')}`} style={{ width: '100%' }} />
                            ) : (
                              <img src={`${import.meta.env.VITE_API_URL}/chat/media/${rev.media_id}?token=${localStorage.getItem('token')}`} alt="Evidence" style={{ width: '100%', borderRadius: '2px', border: '1px solid #333' }} />
                            )}
                          </div>

                          <div className={styles.reviewActions}>
                            <button onClick={() => handleReviewAction(rev.submission_id, 'approve')} className={styles.approveBtn}>✔️ APPROVE</button>
                            <button onClick={() => handleReviewAction(rev.submission_id, 'reject')} className={styles.rejectBtn}>❌ REJECT</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}