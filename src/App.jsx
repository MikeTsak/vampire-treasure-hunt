import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import ActiveHunt from './pages/ActiveHunt';
import HuntAdmin from './pages/HuntAdmin';
import Footer from './components/Footer';
import './index.css';

// Helper to instantly read the JWT token without an API call
function getUserFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

// Blocks non-logged-in users
function PrivateRoute({ children }) {
  const user = getUserFromToken();
  return user ? children : <Navigate to="/login" replace />;
}

// Blocks non-admins from the ST Dashboard
function AdminOnly({ children }) {
  const user = getUserFromToken();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const user = getUserFromToken();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      {/* THE MOBILE WRAPPER */}
      <div style={{ 
        maxWidth: '430px', margin: '0 auto', minHeight: '100vh', 
        display: 'flex', flexDirection: 'column', 
        backgroundColor: '#050505', color: '#e0e0e0', 
        position: 'relative', borderLeft: '1px solid #222', 
        borderRight: '1px solid #222', boxShadow: '0 0 50px rgba(176, 20, 35, 0.08)',
        overflowX: 'hidden'
      }}>
        
        {/* APP HEADER */}
        <header style={{ 
          padding: '15px 20px', borderBottom: '1px solid #333', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          background: '#111', position: 'sticky', top: 0, zIndex: 10
        }}>
          {/* Left: Logo & Title */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none' }}>
            <img src="/img/animated.gif" alt="Erebus" style={{ width: '35px', height: '35px', objectFit: 'contain', borderRadius: '4px' }} />
            <h1 style={{ fontFamily: 'Cinzel, serif', color: '#b01423', margin: 0, fontSize: '1.4rem' }}>
              The Hunt
            </h1>
          </Link>

          {/* Right: Admin Link & Logout */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {user.role === 'admin' && (
                <Link to="/admin" style={{ color: '#a18a4d', textDecoration: 'none', fontSize: '1.2rem' }} title="ST Dashboard">
                  ⚙️
                </Link>
              )}
              <button onClick={handleLogout} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
                Logout
              </button>
            </div>
          )}
        </header>
        
        {/* APP CONTENT */}
        <main style={{ padding: '20px', flex: 1 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><ActiveHunt /></PrivateRoute>} />
            <Route path="/admin" element={<AdminOnly><HuntAdmin /></AdminOnly>} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}