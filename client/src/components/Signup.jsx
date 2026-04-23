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
      localStorage.setItem('user', JSON.stringify(userData));
      setSuccess('Signed in with Google. Redirecting...');
      setTimeout(() => navigate('/employee'), 1000);
    } catch (err) {
      setError(err.message || 'Google signup failed');
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-form-container">
        <h2>Signup for Geo Attend</h2>
        {error && <div className="signup-error">{error}</div>}
        {success && <div className="signup-success">{success}</div>}
        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="signup-input"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="signup-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="signup-input"
            required
          />
          <button type="submit" className="signup-button">Signup</button>
        </form>
        <button type="button" className="google-button" onClick={handleGoogleSignup}>
          <svg className="google-logo" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="10" fill="#4285f4"/>
            <circle cx="12" cy="12" r="9" fill="white"/>
            <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm3.5 8h-2.5v2.5h-2v-2.5H8v-2h2.5V8.5h2v2.5h2.5v2z" fill="#4285f4"/>
          </svg>
          Continue with Google
        </button>
        <p className="signup-link">
          Already have an account? <Link to="/">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
