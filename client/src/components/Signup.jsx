import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/Signup.css';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
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
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/auth/signup',
        { name, email, password, role },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSuccess('User created successfully. Redirecting to user management...');
      setTimeout(() => navigate('/user-management'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'User creation failed');
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-brand-panel">
          <div className="signup-brand-mark">GA</div>
          <div>
            <h1>Create New User</h1>
            <p>Only admins can add new users to the system. Enter a user email, password, and role.</p>
          </div>
        </div>

        <div className="signup-form-panel">
          <div className="signup-form-header">
            <p className="signup-label">Admin Only</p>
            <h2>Add User</h2>
          </div>

          {error && <div className="signup-alert signup-alert-error">{error}</div>}
          {success && <div className="signup-alert signup-alert-success">{success}</div>}

          <form onSubmit={handleSignup} className="signup-form">
            <div className="signup-field">
              <span>Full Name</span>
              <input
                type="text"
                placeholder="Enter user's full name"
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
                placeholder="Enter user's email"
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
                placeholder="Set a password for the user"
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
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button type="submit" className="signup-button">Create User</button>
          </form>

          <p className="signup-link">
            <button type="button" className="signup-link-button" onClick={() => navigate('/user-management')}>
              Back to User Management
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
