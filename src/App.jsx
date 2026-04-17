// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import HuntAdmin from './pages/HuntAdmin';
import ActiveHunt from './pages/ActiveHunt';
import Footer from './components/Footer';
import './index.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function AdminOnly({ children }) {
  const { user } = useContext(AuthCtx);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      {/* THE MOBILE WRAPPER */}
      <div style={{ 
        maxWidth: '430px',
        margin: '0 auto',
        minHeight: '100vh',     // Forces wrapper to be at least the height of the screen
        display: 'flex',        // Enables flexbox
        flexDirection: 'column',// Stacks elements vertically (Header -> Main -> Footer)
        backgroundColor: '#050505',
        color: '#e0e0e0',
        position: 'relative',
        borderLeft: '1px solid #222',
        borderRight: '1px solid #222',
        boxShadow: '0 0 50px rgba(176, 20, 35, 0.08)',
        overflowX: 'hidden'
      }}>
        
        {/* App Header */}
        <header style={{ 
          padding: '15px 20px', 
          borderBottom: '1px solid #333', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: '#111',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          {/* Left side: Animated Logo (Hamburger) + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="/img/animated.gif" 
              alt="Erebus Link" 
              style={{ 
                width: '35px', 
                height: '35px', 
                objectFit: 'contain', 
                cursor: 'pointer',
                borderRadius: '4px' // Optional: smooths out square gifs
              }} 
              onClick={() => {
                // If you want it to act as a menu later, you can add a toggle state here
                console.log("Menu clicked");
              }}
            />
            <h1 style={{ fontFamily: 'Cinzel, serif', color: '#b01423', margin: 0, fontSize: '1.4rem' }}>
              The Hunt
            </h1>
          </div>

          {localStorage.getItem('token') && (
            <button 
              onClick={handleLogout} 
              style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Logout
            </button>
          )}
        </header>
        
        {/* App Content */}
        {/* flex: 1 tells this section to grow and fill all available empty space, pushing the footer down */}
        <main style={{ padding: '20px', flex: 1 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><ActiveHunt /></PrivateRoute>} />
            <Route path="/admin/hunts" element={<AdminOnly><HuntAdmin/></AdminOnly>} />
          </Routes>
        </main>

        {/* Footer */}
        <Footer />
        
      </div>
    </BrowserRouter>
  );
}