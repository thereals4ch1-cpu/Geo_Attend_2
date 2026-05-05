import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

import { API_BASE_URL } from '../config';
import '../css/Signup.css';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        name,
        email,
        password,
        role,
        phoneNumber
      });
      
      setSuccess('Account created successfully! Redirecting to user management...');
      setTimeout(() => navigate('/user-management'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-brand-panel">
          <div className="signup-brand-mark">GA</div>
          <div>
            <h1>Add New User</h1>
            <p>Register a new employee for the attendance tracking system. They will use these credentials to log in.</p>
          </div>
        </div>

        <div className="signup-form-panel">
          <div className="signup-form-header">
            <p className="signup-label">User Management</p>
            <h2>Add Employee</h2>
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

            <div className="signup-field">
              <span>Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="signup-input"
                required
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="signup-field">
              <span>Phone Number</span>
              <input
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 10) {
                    setPhoneNumber(val);
                  }
                }}
                pattern="[0-9]{10}"
                title="Phone number must be exactly 10 digits"
                className="signup-input"
                required
              />
            </div>

            <button type="submit" className="signup-button">Add User</button>
            <button type="button" className="signup-button" style={{marginTop: '10px', backgroundColor: '#6c757d'}} onClick={() => navigate('/user-management')}>Cancel</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;