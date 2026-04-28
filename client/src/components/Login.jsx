import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { auth, provider, messaging } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { getToken } from 'firebase/messaging';
import '../css/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userData = {
        id: user.uid,
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
      
      // Register FCM token
      await registerFCMToken(userData.uid);
      
      navigate('/employee');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Google sign in failed');
    }
  const registerFCMToken = async (userId) => {
    try {
      const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' }); // Need to generate VAPID key
      await axios.post('http://localhost:5000/api/auth/register-token', {
        userId,
        token
      });
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">📍</div>
          <div>
            <h1>GeoAttend</h1>
            <p>Smart Attendance Management System</p>
          </div>
        </div>

        <div className="login-welcome">
          <h2>Welcome back</h2>
          <p>Sign in to your account</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <label>
            Email address
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
            />
          </label>
          <div className="login-form-footer">
            <Link to="/forgot-password" className="login-forgot-link">Forgot password?</Link>
          </div>
          <button type="submit" className="login-button">Sign in</button>
        </form>

        <div className="login-separator">
          <span>or</span>
        </div>

        <button type="button" className="google-button" onClick={handleGoogleLogin}>
          <svg className="google-logo" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M23.64 12.2c0-.78-.07-1.53-.2-2.26H12v4.28h6.38c-.28 1.5-1.13 2.77-2.4 3.62v3.02h3.88c2.28-2.1 3.6-5.2 3.6-8.66z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.05 7.94-2.86l-3.88-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.76-2.1-6.7-4.96H1.3v3.1C3.26 21.6 7.28 24 12 24z"/>
            <path fill="#FBBC05" d="M5.3 14.32a7.177 7.177 0 0 1 0-4.64V6.58H1.3a11.995 11.995 0 0 0 0 10.84l4-3.1z"/>
            <path fill="#EA4335" d="M12 4.8c1.76 0 3.34.6 4.6 1.77l3.45-3.45C17.95 1.22 15.24 0 12 0 7.28 0 3.26 2.4 1.3 6.58l4 3.1C6.24 6.9 8.88 4.8 12 4.8z"/>
          </svg>
          Continue with Google
        </button>

        <p className="login-note">
          Location access required for geo-verification
        </p>

        <p className="login-signup">
          Don't have an account? <Link to="/signup">Signup</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

