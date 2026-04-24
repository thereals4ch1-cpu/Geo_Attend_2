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
      <div className="signup-form-container">
        <h2>SignUp to Geo Attend</h2>
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
          <img
            className="google-logo"
            src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
            alt="Google"
          />
          Continue with Google
        </button>
        <p className="signup-link">
          Already have an account? <Link to="/">Login here</Link>
        </p>
        <p className="signup-link">
          Forgot your password? <Link to="/forgot-password">Reset it here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
