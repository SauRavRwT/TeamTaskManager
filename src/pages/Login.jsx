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
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="card shadow-sm border-0"
            style={{ background: 'var(--bg-color-secondary)' }}
          >
            <div className="card-body p-5">
              <h2 className="text-center mb-4" style={{ color: 'var(--text-primary)' }}>Welcome Back</h2>
              <p className="text-center text-muted mb-4">Log in to continue to Team Task Manager.</p>
              
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-danger border-0 bg-danger text-white bg-opacity-25">
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
