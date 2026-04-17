import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import styles from './../styles/Login.module.css'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      nav('/');
    } catch (err) {
      setError('Invalid credentials. The Court does not recognize you.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <img src="/img/ATT-logo(1).png" alt="Erebus Sigil" className={styles.logo} />
      
      <div className={styles.formBox}>
        <h2 className={styles.title}>The Hunt</h2>
        <p className={styles.subtitle}>Present Your Credentials</p>
        
        {error && <div className={styles.errorMsg}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={styles.inputField}
              required 
              disabled={isLoading}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className={styles.inputField}
              required 
              disabled={isLoading}
            />
          </div>
          
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Enter the Night'}
          </button>
        </form>
      </div>
    </div>
  );
}