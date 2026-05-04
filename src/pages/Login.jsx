import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="auth-form-card"
        >
          <motion.div 
            className="auth-svg-container"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="auth-svg">
              <circle cx="100" cy="80" r="35" fill="none" stroke="var(--accent-color)" strokeWidth="2" />
              <path d="M 60 140 Q 60 120 100 120 Q 140 120 140 140 L 140 160 Q 140 165 135 165 L 65 165 Q 60 165 60 160 Z" 
                fill="none" stroke="var(--accent-color)" strokeWidth="2" />
              <circle cx="140" cy="170" r="8" fill="var(--accent-color)" opacity="0.6" />
              <path d="M 140 162 L 140 178" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" />
              <path d="M 132 170 L 148 170" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>

          <div className="card shadow-sm border-0 auth-card"
            style={{ background: 'var(--bg-color-secondary)' }}
          >
            <div className="card-body auth-card-body">
              <h2 className="text-center mb-2" style={{ color: 'var(--text-primary)' }}>Welcome Back</h2>
              <p className="text-center text-muted mb-5">Log in to continue to Team Task Manager.</p>
              
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-danger border-0 bg-danger text-white bg-opacity-25 mb-4">
                  {error}
                </motion.div>
              )}
              
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">EMAIL ADDRESS</label>
                  <input type="email" className="form-control" required 
                    value={email} onChange={(e) => setEmail(e.target.value)} 
                    placeholder="name@company.com" />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">PASSWORD</label>
                  <input type="password" className="form-control" required
                    value={password} onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" />
                </div>
                <button type="submit" className="btn btn-primary w-100 py-2" disabled={isLoading}>
                  {isLoading ? 'Logging In...' : 'Log In'}
                </button>
              </form>
              
              <div className="mt-4 text-center">
                <span className="text-muted">Need an account? </span>
                <Link to="/signup" className="text-decoration-none fw-bold">Sign Up</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
