// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import ActiveHunt from './pages/ActiveHunt';
import HuntAdmin from './pages/HuntAdmin';
import Footer from './components/Footer';
import './index.css';

function getUserFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

function PrivateRoute({ children }) {
  const user = getUserFromToken();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const user = getUserFromToken();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// Inner Layout component so we can use hooks like useLocation
function Layout() {
  const location = useLocation();
  const user = getUserFromToken();
  
  // Magic toggle: If on the admin page, use full width. Otherwise, lock to 430px (mobile).
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
      backgroundColor: '#050505', color: '#e0e0e0', 
      position: 'relative', borderLeft: '1px solid #222', 
      borderRight: '1px solid #222', boxShadow: '0 0 50px rgba(176, 20, 35, 0.08)',
      overflowX: 'hidden',
      transition: 'max-width 0.3s ease'
    }}>
      
      {/* APP HEADER */}
      <header style={{ 
        padding: '15px 20px', borderBottom: '1px solid #333', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: '#111', position: 'sticky', top: 0, zIndex: 10
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none' }}>
          <img src="/img/animated.gif" alt="Erebus" style={{ width: '35px', height: '35px', objectFit: 'contain', borderRadius: '4px' }} />
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#b01423', margin: 0, fontSize: '1.4rem' }}>
            The Hunt
          </h1>
        </Link>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {/* DYNAMIC ADMIN / PLAYER BUTTON TOGGLE */}
            {user.role === 'admin' && (
              isAdminRoute ? (
                <Link to="/" style={{ color: '#e0e0e0', textDecoration: 'none', fontSize: '1rem', border: '1px solid #555', padding: '6px 12px', borderRadius: '4px', background: '#222' }} title="Return to Player View">
                  🩸 Player View
                </Link>
              ) : (
                <Link to="/admin" style={{ color: '#a18a4d', textDecoration: 'none', fontSize: '1rem', border: '1px solid #a18a4d', padding: '6px 12px', borderRadius: '4px', background: 'rgba(161, 138, 77, 0.1)' }} title="ST Dashboard">
                  ⚙️ ST Panel
                </Link>
              )
            )}

            <button onClick={handleLogout} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
              Logout
            </button>
          </div>
        )}
      </header>
      
      {/* APP CONTENT */}
      <main style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><ActiveHunt /></PrivateRoute>} />
          <Route path="/admin" element={<AdminOnly><HuntAdmin /></AdminOnly>} />
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