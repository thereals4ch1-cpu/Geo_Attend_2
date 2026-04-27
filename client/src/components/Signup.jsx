import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; //ABC
import axios from 'axios';
import { auth, provider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import '../css/Signup.css';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await axios.post('http://localhost:5000/api/auth/signup', {
        name,
        email,
        password,
        role: 'employee'
      });
      
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setSuccess('');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userData = {
        uid: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        role: 'employee'
      };

      await axios.post('http://localhost:5000/api/auth/google-signin', {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role
      });

      localStorage.setItem('user', JSON.stringify(userData));
      setSuccess('Signed in with Google. Redirecting...');
      setTimeout(() => navigate('/employee'), 1000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Google signup failed');
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-brand-panel">
          <div className="signup-brand-mark">GA</div>
          <div>
            <h1>Welcome to Geo Attend</h1>
            <p>Join our professional attendance tracking system. Sign up to get started with location-based check-ins and comprehensive employee management.</p>
          </div>
        </div>

        <div className="signup-form-panel">
          <div className="signup-form-header">
            <p className="signup-label">Create Account</p>
            <h2>Sign Up</h2>
          </div>

          {error && <div className="signup-alert signup-alert-error">{error}</div>}
          {success && <div className="signup-alert signup-alert-success">{success}</div>}

          <form onSubmit={handleSignup} className="signup-form">
            <div className="signup-field">
              <span>Full Name</span>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="signup-input"
                required
              />
            </div>

            <div className="signup-field">
              <span>Email Address</span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="signup-input"
                required
              />
            </div>

            <div className="signup-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="signup-input"
                required
              />
            </div>

            <button type="submit" className="signup-button">Create Account</button>
          </form>

          <div className="signup-divider">
            <span>or continue with</span>
          </div>

          <button type="button" className="google-button" onClick={handleGoogleSignup}>
            <img
              className="google-logo"
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
              alt="Google"
            />
            Continue with Google
          </button>

          <p className="signup-link">
            Already have an account? <Link to="/">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
