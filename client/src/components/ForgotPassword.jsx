import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import '../css/Login.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent successfully. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Unable to send reset email.');
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
          <h2>Forgot Password</h2>
          <p>Enter your registered email to receive a password reset link.</p>
        </div>

        {message && <div className="login-success">{message}</div>}
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleReset} className="login-form">
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
          <button type="submit" className="login-button">Send Reset Link</button>
        </form>

        <p className="login-signup">
          Remembered your password? <Link to="/">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
