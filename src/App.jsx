// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import ActiveHunt from './pages/ActiveHunt';
import HuntAdmin from './pages/HuntAdmin';
// Make sure you have a simple Footer component, or remove this import if you don't use it anymore
import Footer from './components/Footer'; 

function getLocalUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) { return null; }
}

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(getLocalUser());

  useEffect(() => {
    setUser(getLocalUser());
  }, [location]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const appMaxWidth = isAdminRoute ? '100%' : '430px';

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login'); 
  };

  return (
    <div style={{ 
      maxWidth: appMaxWidth, margin: '0 auto', minHeight: '100vh', 
      display: 'flex', flexDirection: 'column', 
      backgroundColor: '#030303', 
      color: '#d4d4d4', 
      position: 'relative',
      borderLeft: isAdminRoute ? 'none' : '1px solid #1a0505', 
      borderRight: isAdminRoute ? 'none' : '1px solid #1a0505',
      boxShadow: isAdminRoute ? 'none' : '0 0 50px rgba(0,0,0,0.9)', 
      transition: 'max-width 0.4s ease-in-out',
      fontFamily: '"Inter", -apple-system, sans-serif'
    }}>
      
      <header style={{ 
        padding: '15px 25px', 
        borderBottom: '1px solid #2a0a0a', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'rgba(5, 5, 5, 0.95)', 
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none' }}>
          <img src="/img/animated.gif" alt="Erebus" style={{ width: '28px', filter: 'drop-shadow(0 0 5px rgba(176, 20, 35, 0.5))' }} />
          <h1 style={{ color: '#b01423', margin: 0, fontSize: '1.4rem', letterSpacing: '3px', fontFamily: '"Cinzel", serif', textTransform: 'uppercase' }}>
            The Hunt
          </h1>
        </Link>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {user.role === 'admin' && (
              <Link 
                to={isAdminRoute ? "/" : "/admin"} 
                style={{ 
                  color: isAdminRoute ? '#ccc' : '#c5a059', 
                  textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px',
                  padding: '6px 14px', border: '1px solid', borderRadius: '2px', 
                  borderColor: isAdminRoute ? '#333' : '#c5a059',
                  background: isAdminRoute ? '#111' : 'transparent',
                  transition: 'all 0.3s ease'
                }}
              >
                {isAdminRoute ? 'TO PLAYER VIEW' : 'ST PANEL'}
              </Link>
            )}
            <button onClick={handleLogout} style={{ 
              background: 'none', border: 'none', color: '#666', cursor: 'pointer', 
              fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = '#b01423'}
            onMouseOut={(e) => e.target.style.color = '#666'}
            >
              Logout
            </button>
          </div>
        )}
      </header>
      
      <main style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={user ? <ActiveHunt /> : <Navigate to="/login" />} />
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