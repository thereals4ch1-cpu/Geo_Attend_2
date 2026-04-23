import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import axios from 'axios';
import { auth, provider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
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
      localStorage.setItem('user', JSON.stringify(userData));
      navigate('/employee');
    } catch (err) {
      setError(err.message || 'Google sign in failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-container">
        <h2>Login to Geo Attend</h2>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
          />
          <button type="submit" className="login-button">Login</button>
        </form>
        <button type="button" className="google-button" onClick={handleGoogleLogin}>
          <svg className="google-logo" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="10" fill="#4285f4"/>
            <circle cx="12" cy="12" r="9" fill="white"/>
            <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm3.5 8h-2.5v2.5h-2v-2.5H8v-2h2.5V8.5h2v2.5h2.5v2z" fill="#4285f4"/>
          </svg>
          Continue with Google
        </button>
        <p className="login-link">
          Don't have an account? <Link to="/signup">Signup here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

