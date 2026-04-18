import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import ActiveHunt from './pages/ActiveHunt';
import HuntAdmin from './pages/HuntAdmin';
import Footer from './components/Footer';

// Helper to decode user role and ID from JWT
function getLocalUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) { return null; }
}

function Layout() {
  const location = useLocation();
  const [user, setUser] = useState(getLocalUser());

  // Refresh user state on every navigation to catch logins/logouts
  useEffect(() => {
    setUser(getLocalUser());
  }, [location]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const appMaxWidth = isAdminRoute ? '100%' : '430px';

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div style={{ 
      maxWidth: appMaxWidth, margin: '0 auto', minHeight: '100vh', 
      display: 'flex', flexDirection: 'column', 
      backgroundColor: '#050505', position: 'relative',
      borderLeft: isAdminRoute ? 'none' : '1px solid #222', 
      borderRight: isAdminRoute ? 'none' : '1px solid #222',
      transition: 'max-width 0.4s ease-in-out'
    }}>
      
      {/* HEADER */}
      <header style={{ 
        padding: '15px 20px', borderBottom: '1px solid #333', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: '#111', position: 'sticky', top: 0, zIndex: 100
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img src="/img/animated.gif" alt="Erebus" style={{ width: '32px' }} />
          <h1 style={{ color: '#b01423', margin: 0, fontSize: '1.3rem', letterSpacing: '1px' }}>The Hunt</h1>
        </Link>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* ST View Toggle: Only visible to Admins */}
            {user.role === 'admin' && (
              <Link 
                to={isAdminRoute ? "/" : "/admin"} 
                style={{ 
                  color: isAdminRoute ? '#fff' : '#a18a4d', 
                  textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold',
                  padding: '6px 12px', border: '1px solid', borderRadius: '4px',
                  borderColor: isAdminRoute ? '#555' : '#a18a4d',
                  background: isAdminRoute ? '#222' : 'transparent'
                }}
              >
                {isAdminRoute ? '🩸 PLAYER VIEW' : '⚙️ ST PANEL'}
              </Link>
            )}
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.8rem' }}>Logout</button>
          </div>
        )}
      </header>
      
      {/* MAIN CONTENT AREA */}
      <main style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={user ? <ActiveHunt /> : <Navigate to="/login" />} />
          {/* Strict Admin Guard for the ST Panel */}
          <Route path="/admin" element={user?.role === 'admin' ? <HuntAdmin /> : <Navigate to="/" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}