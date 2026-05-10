import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError("");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, { displayName: name });

      // Save user to RTDB
      await set(ref(db, `users/${userCredential.user.uid}`), {
        name,
        email,
        role,
      });

      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create an account");
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
            <svg
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
              className="auth-svg"
            >
              <circle
                cx="100"
                cy="70"
                r="30"
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="2"
              />
              <path
                d="M 60 130 Q 60 115 100 115 Q 140 115 140 130 L 140 155 Q 140 160 135 160 L 65 160 Q 60 160 60 155 Z"
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="2"
              />
              <circle
                cx="140"
                cy="50"
                r="18"
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="2"
                opacity="0.7"
              />
              <path
                d="M 140 42 L 140 58 M 132 50 L 148 50"
                stroke="var(--accent-color)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>
          </motion.div>

          <div
            className="card shadow-sm border-0 auth-card"
            style={{ background: "var(--bg-color-secondary)" }}
          >
            <div className="card-body auth-card-body">
              <h2
                className="text-center mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Create an Account
              </h2>
              <p className="text-center text-muted mb-5">
                Join your team and start managing tasks.
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="alert alert-danger border-0 bg-danger text-white bg-opacity-25 mb-4"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSignup}>
                <div className="mb-3">
                  <label
                    className="form-label text-muted small fw-bold"
                    htmlFor="name_id"
                  >
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    id="name_id"
                  />
                </div>
                <div className="mb-3">
                  <label
                    className="form-label text-muted small fw-bold"
                    htmlFor="email_id"
                  >
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    id="email_id"
                  />
                </div>
                <div className="mb-4">
                  <label
                    className="form-label text-muted small fw-bold"
                    htmlFor="password_id"
                  >
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    minLength="6"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    id="password_id"
                  />
                </div>
                <div className="mb-4">
                  <label
                    className="form-label text-muted small fw-bold"
                    htmlFor="role_id"
                  >
                    ACCOUNT ROLE
                  </label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    id="role_id"
                  >
                    <option value="MEMBER">Team Member</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  <small className="text-muted mt-2 d-block">
                    For demo purposes, you can choose your role.
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-muted">Already have an account? </span>
                <Link to="/login" className="text-decoration-none fw-bold">
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
