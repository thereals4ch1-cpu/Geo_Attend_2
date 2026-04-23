import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import '../css/UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadUsers();
  }, [navigate]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccess('');
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      setSuccess('User role updated successfully!');
      loadUsers();
    } catch (err) {
      setError('Failed to update user role: ' + err.message);
      console.error(err);
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      setError('');
      setSuccess('');
      try {
        await deleteDoc(doc(db, 'users', userId));
        setSuccess('User deleted successfully!');
        loadUsers();
      } catch (err) {
        setError('Failed to delete user: ' + err.message);
        console.error(err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h1>User Management</h1>
        <div className="user-management-buttons">
          <button onClick={() => navigate('/admin')} className="user-management-back-button">
            Back to Dashboard
          </button>
          <button onClick={handleLogout} className="user-management-logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="user-management-error">{error}</div>}
      {success && <div className="user-management-success">{success}</div>}

      <div className="user-management-content">
        {loading ? (
          <div className="user-management-loading">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="user-management-empty">No users found</div>
        ) : (
          <div className="user-management-table-container">
            <table className="user-management-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Change Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name || 'N/A'}</td>
                    <td>{user.email || 'N/A'}</td>
                    <td>
                      <span className={`user-management-role-badge role-${user.role || 'user'}`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={user.role || 'employee'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="user-management-role-select"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <div className="user-management-actions">
                        <button
                          onClick={() => handleViewProfile(user.id)}
                          className="user-management-view-button"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                          className="user-management-delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
