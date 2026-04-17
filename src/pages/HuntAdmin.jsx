// src/pages/HuntAdmin.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from '../styles/HuntAdmin.module.css'; // Adjust path if needed

export default function HuntAdmin() {
  const [hunts, setHunts] = useState([]);
  const [selectedHunt, setSelectedHunt] = useState(null);
  const [steps, setSteps] = useState([]);
  
  const [newHuntTitle, setNewHuntTitle] = useState('');
  const [stepForm, setStepForm] = useState({
    task_type: 'text',
    prompt: '',
    target_data_1: '', // Used for text answers, QR codes, or Latitude
    target_data_2: ''  // Used for Longitude
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

  const loadHuntSteps = async (huntId) => {
    try {
      const res = await api.get(`/admin/hunts/${huntId}/steps`);
      setSteps(res.data.steps);
      setSelectedHunt(huntId);
    } catch (err) {
      console.error("Failed to load steps");
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

  const handleAddStep = async (e) => {
    e.preventDefault();
    
    // Package the target requirements based on the type
    let targetData = {};
    if (stepForm.task_type === 'text') {
      targetData = { answer: stepForm.target_data_1.toLowerCase().trim() };
    } else if (stepForm.task_type === 'qr') {
      targetData = { qr_string: stepForm.target_data_1.trim() };
    } else if (stepForm.task_type === 'gps') {
      targetData = { 
        lat: parseFloat(stepForm.target_data_1), 
        lng: parseFloat(stepForm.target_data_2),
        radius_meters: 50 // A generous 50m radius for urban GPS drift
      };
    } else if (['photo', 'draw', 'audio'].includes(stepForm.task_type)) {
      targetData = { manual_review: true };
    }

    try {
      await api.post(`/admin/hunts/${selectedHunt}/steps`, {
        task_type: stepForm.task_type,
        prompt: stepForm.prompt,
        target_data: targetData,
        step_order: steps.length + 1
      });
      
      setStepForm({ ...stepForm, prompt: '', target_data_1: '', target_data_2: '' });
      loadHuntSteps(selectedHunt);
    } catch (err) {
      alert("Failed to append step to the chronicle.");
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

  return (
    <div className={styles.adminContainer}>
      <h1 className={styles.header}>🦇 Grand Hunt Master</h1>
      
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
                <div className={styles.huntName} onClick={() => loadHuntSteps(hunt.id)}>
                  {hunt.title}
                </div>
                <button 
                  onClick={() => toggleHuntActive(hunt)}
                  className={`${styles.btn} ${hunt.is_active ? styles.btnPrimary : ''}`}
                >
                  {hunt.is_active ? 'ACTIVE' : 'OFF'}
                </button>
              </li>
            ))}
            {hunts.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>No hunts created yet.</p>}
          </ul>
        </div>

        {/* RIGHT COLUMN: Manage Steps for Selected Hunt */}
        <div className={styles.panel}>
          {!selectedHunt ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#888' }}>
              <p>Select a chronicle from the left to manage its clues and steps.</p>
            </div>
          ) : (
            <>
              <h2 className={styles.panelTitle}>Chronicle Steps</h2>
              
              {/* Add New Step Form */}
              <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '6px', marginBottom: '30px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Add a Challenge</h3>
                <form onSubmit={handleAddStep} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  <select 
                    value={stepForm.task_type} 
                    onChange={e => setStepForm({...stepForm, task_type: e.target.value})}
                    className={styles.input}
                  >
                    <option value="text">Input: Text Password / Riddle Answer</option>
                    <option value="gps">Location: GPS Check-in</option>
                    <option value="qr">Scan: Find & Scan QR Code</option>
                    <option value="photo">Upload: Take Photo / Evidence</option>
                    <option value="draw">Create: Draw Sigil</option>
                    <option value="audio">Record: Capture Audio</option>
                  </select>

                  <textarea 
                    placeholder="Storyteller Prompt (What the player reads...)"
                    value={stepForm.prompt}
                    onChange={e => setStepForm({...stepForm, prompt: e.target.value})}
                    className={styles.input}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    required
                  />

                  {/* DYNAMIC TARGET INPUTS BASED ON SELECT */}
                  {stepForm.task_type === 'text' && (
                    <input type="text" placeholder="The Exact Correct Answer (e.g. 'caine')" required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} className={styles.input} />
                  )}
                  {stepForm.task_type === 'qr' && (
                    <input type="text" placeholder="Expected QR Code String (e.g. 'elysium_door_1')" required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} className={styles.input} />
                  )}
                  {stepForm.task_type === 'gps' && (
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <input type="number" step="any" placeholder="Latitude (e.g. 37.9838)" required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} className={styles.input} />
                      <input type="number" step="any" placeholder="Longitude (e.g. 23.7275)" required value={stepForm.target_data_2} onChange={e => setStepForm({...stepForm, target_data_2: e.target.value})} className={styles.input} />
                    </div>
                  )}

                  {['photo', 'draw', 'audio'].includes(stepForm.task_type) && (
                    <p style={{ fontSize: '0.85rem', color: '#a18a4d', margin: 0 }}>
                      * This task type requires manual verification. The player will automatically progress to the next step upon uploading the file, and STs can review the evidence later.
                    </p>
                  )}

                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Append Step to Chronicle</button>
                </form>
              </div>

              {/* List Current Steps */}
              <ul className={styles.stepList}>
                {steps.map(step => (
                  <li key={step.id} className={styles.stepItem}>
                    <div className={styles.stepHeader}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '1.2rem' }}>Step {step.step_order}</strong>
                      <span className={styles.stepTag}>{step.task_type.toUpperCase()}</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '1rem', lineHeight: '1.5' }}>{step.prompt}</p>
                    <div className={styles.targetDataBox}>
                      Expected Target: {JSON.stringify(JSON.parse(step.target_data))}
                    </div>
                  </li>
                ))}
                {steps.length === 0 && <p style={{ color: '#666', textAlign: 'center' }}>No steps added yet.</p>}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}