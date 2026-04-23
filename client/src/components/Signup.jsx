import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; //ABC
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await axios.post('http://localhost:5000/api/auth/signup', {
        name,
        email,
        password,
        role
      });
      
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="signup-select"
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="signup-button">Signup</button>
        </form>
        <p className="signup-link">
          Already have an account? <Link to="/">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
