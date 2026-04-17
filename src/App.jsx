// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ActiveHunt from './pages/ActiveHunt';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <div style={{ backgroundColor: '#050505', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <header style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#b01423', margin: 0 }}>The Hunt</h1>
          {localStorage.getItem('token') && (
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' }}>Logout</button>
          )}
        </header>
        
        <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><ActiveHunt /></PrivateRoute>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}