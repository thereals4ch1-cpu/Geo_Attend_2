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
          <div className="signup-brand-mark">
            <span>G</span>
          </div>
          <div>
            <h1>Geo Attend</h1>
            <p>Secure and simple employee onboarding with geofenced attendance.</p>
          </div>
        </div>

        <div className="signup-form-panel">
          <div className="signup-form-header">
            <div>
              <p className="signup-label">Create account</p>
              <h2>Start tracking attendance today</h2>
            </div>
          </div>

          {error && <div className="signup-alert signup-alert-error">{error}</div>}
          {success && <div className="signup-alert signup-alert-success">{success}</div>}

          <form onSubmit={handleSignup} className="signup-form">
            <label className="signup-field">
              <span>Full name</span>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="signup-input"
                required
              />
            </label>
            <label className="signup-field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="signup-input"
                required
              />
            </label>
            <label className="signup-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="signup-input"
                required
              />
            </label>

            <button type="submit" className="signup-button">Create account</button>
          </form>

          <div className="signup-divider">
            <span>Or continue with</span>
          </div>

          <button type="button" className="google-button" onClick={handleGoogleSignup}>
            <svg className="google-logo" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285f4" d="M21.35 11.1h-9.18v2.92h5.29c-.23 1.52-1.54 4.46-5.29 4.46-3.18 0-5.79-2.64-5.79-5.9s2.61-5.9 5.79-5.9c1.81 0 3.03.77 3.73 1.43l2.55-2.47C17.67 3.55 15.78 2.5 12.17 2.5 6.73 2.5 2.5 6.78 2.5 12.23s4.23 9.73 9.67 9.73c5.58 0 9.28-3.91 9.28-9.42 0-.64-.07-1.12-.1-1.44z"/>
            </svg>
            Continue with Google
          </button>

          <p className="signup-link">
            Already have an account? <Link to="/">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
