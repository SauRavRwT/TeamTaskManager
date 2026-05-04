import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      // Save user to RTDB
      await set(ref(db, `users/${userCredential.user.uid}`), {
        name,
        email,
        role
      });

      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create an account');
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
              <h2 className="text-center mb-4" style={{ color: 'var(--text-primary)' }}>Create an Account</h2>
              <p className="text-center text-muted mb-4">Join your team and start managing tasks.</p>
              
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-danger border-0 bg-danger text-white bg-opacity-25">
                  {error}
                </motion.div>
              )}
              
              <form onSubmit={handleSignup}>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">FULL NAME</label>
                  <input type="text" className="form-control" required
                    value={name} onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. John Doe" />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">EMAIL ADDRESS</label>
                  <input type="email" className="form-control" required 
                    value={email} onChange={(e) => setEmail(e.target.value)} 
                    placeholder="name@company.com" />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">PASSWORD</label>
                  <input type="password" className="form-control" required minLength="6"
                    value={password} onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" />
                </div>
                <div className="mb-4">
                  <label className="form-label text-muted small fw-bold">ACCOUNT ROLE</label>
                  <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="MEMBER">Team Member</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  <small className="text-muted mt-2 d-block">For demo purposes, you can choose your role.</small>
                </div>
                
                <button type="submit" className="btn btn-primary w-100 py-2" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>
              
              <div className="mt-4 text-center">
                <span className="text-muted">Already have an account? </span>
                <Link to="/login" className="text-decoration-none fw-bold">Log In</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
