import { useState, useEffect } from 'react';
import api from '../api';

export default function HuntAdmin() {
  const [hunts, setHunts] = useState([]);
  const [selectedHunt, setSelectedHunt] = useState(null);
  const [steps, setSteps] = useState([]);
  
  const [newHuntTitle, setNewHuntTitle] = useState('');
  const [stepForm, setStepForm] = useState({
    task_type: 'text', prompt: '', target_data_1: '', target_data_2: ''
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
      await api.post('/admin/hunts', { title: newHuntTitle, description: 'Mobile ST Creation' });
      setNewHuntTitle('');
      fetchHunts();
    } catch (err) {
      alert("Failed to create hunt.");
    }
  };

  const handleAddStep = async (e) => {
    e.preventDefault();
    let targetData = {};
    if (stepForm.task_type === 'text') targetData = { answer: stepForm.target_data_1.toLowerCase().trim() };
    else if (stepForm.task_type === 'qr') targetData = { qr_string: stepForm.target_data_1.trim() };
    else if (stepForm.task_type === 'gps') targetData = { lat: parseFloat(stepForm.target_data_1), lng: parseFloat(stepForm.target_data_2), radius_meters: 50 };
    else if (['photo', 'draw', 'audio'].includes(stepForm.task_type)) targetData = { manual_review: true };

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
      alert("Failed to append step.");
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontFamily: 'Cinzel, serif', color: '#a18a4d', margin: '0 0 10px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        ST Dashboard
      </h2>

      {/* --- MANAGE HUNTS --- */}
      <div style={{ background: '#121212', padding: '15px', borderRadius: '8px', border: '1px solid #222' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Chronicles</h3>
        
        <form onSubmit={handleCreateHunt} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" placeholder="New Hunt Name..." value={newHuntTitle} onChange={e => setNewHuntTitle(e.target.value)}
            style={{ flex: 1, padding: '10px', background: '#000', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }} required 
          />
          <button type="submit" style={{ background: '#b01423', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '4px' }}>Add</button>
        </form>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {hunts.map(hunt => (
            <li key={hunt.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: selectedHunt === hunt.id ? 'rgba(176,20,35,0.1)' : '#000', border: selectedHunt === hunt.id ? '1px solid #b01423' : '1px solid #333', padding: '12px', marginBottom: '10px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong onClick={() => loadHuntSteps(hunt.id)} style={{ cursor: 'pointer', flex: 1, fontSize: '1.1rem' }}>{hunt.title}</strong>
                <button onClick={() => toggleHuntActive(hunt)} style={{ background: hunt.is_active ? '#b01423' : '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>
                  {hunt.is_active ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              {selectedHunt === hunt.id && <span style={{ fontSize: '0.8rem', color: '#a18a4d' }}>Viewing Steps Below 👇</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* --- MANAGE STEPS --- */}
      {selectedHunt && (
        <div style={{ background: '#121212', padding: '15px', borderRadius: '8px', border: '1px solid #222' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Steps & Clues</h3>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
            {steps.map(step => (
              <li key={step.id} style={{ background: '#000', border: '1px solid #333', padding: '12px', marginBottom: '10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '8px', marginBottom: '8px' }}>
                  <strong style={{ color: '#a18a4d' }}>Step {step.step_order}</strong>
                  <span style={{ fontSize: '0.75rem', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>{step.task_type.toUpperCase()}</span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>{step.prompt}</p>
                <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  Target: {step.target_data}
                </div>
              </li>
            ))}
            {steps.length === 0 && <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>No steps added yet.</p>}
          </ul>

          <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '6px', border: '1px dashed #444' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Add Step</h4>
            <form onSubmit={handleAddStep} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select value={stepForm.task_type} onChange={e => setStepForm({...stepForm, task_type: e.target.value})} style={{ padding: '10px', background: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}>
                <option value="text">Text Password</option>
                <option value="gps">GPS Check-in</option>
                <option value="qr">Scan QR Code</option>
                <option value="photo">Upload Photo</option>
              </select>

              <textarea placeholder="Storyteller Prompt..." value={stepForm.prompt} onChange={e => setStepForm({...stepForm, prompt: e.target.value})} style={{ padding: '10px', background: '#000', color: '#fff', border: '1px solid #555', minHeight: '60px', borderRadius: '4px', boxSizing: 'border-box' }} required />

              {stepForm.task_type === 'text' && <input type="text" placeholder="Correct Answer..." required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} style={{ padding: '10px', background: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box' }} />}
              {stepForm.task_type === 'qr' && <input type="text" placeholder="QR String..." required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} style={{ padding: '10px', background: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box' }} />}
              {stepForm.task_type === 'gps' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="number" step="any" placeholder="Latitude" required value={stepForm.target_data_1} onChange={e => setStepForm({...stepForm, target_data_1: e.target.value})} style={{ flex: 1, padding: '10px', background: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box', minWidth: '0' }} />
                  <input type="number" step="any" placeholder="Longitude" required value={stepForm.target_data_2} onChange={e => setStepForm({...stepForm, target_data_2: e.target.value})} style={{ flex: 1, padding: '10px', background: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box', minWidth: '0' }} />
                </div>
              )}
              <button type="submit" style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '12px', marginTop: '5px', borderRadius: '4px', fontWeight: 'bold' }}>Save Step</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}