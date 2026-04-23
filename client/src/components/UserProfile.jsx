import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import '../css/UserProfile.css';

function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: ''
  });
  const navigate = useNavigate();
  const { userId } = useParams();
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    loadProfile();
  }, [userId, navigate]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      if (!userId) {
        // If no userId in params, load current user profile
        if (currentUser.uid) {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setProfile({ id: currentUser.uid, ...userData });
            setFormData({
              name: userData.name || currentUser.name || '',
              email: userData.email || currentUser.email || '',
              phone: userData.phone || '',
              department: userData.department || ''
            });
          } else {
            setProfile(currentUser);
            setFormData({
              name: currentUser.name || '',
              email: currentUser.email || '',
              phone: '',
              department: ''
            });
          }
        } else {
          setProfile(currentUser);
          setFormData({
            name: currentUser.name || '',
            email: currentUser.email || '',
            phone: '',
            department: ''
          });
        }
      } else {
        // Load specific user profile
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setProfile({ id: userId, ...userData });
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            department: userData.department || ''
          });
        } else {
          setError('User not found');
        }
      }
    } catch (err) {
      setError('Failed to load profile: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    try {
      const userId = profile?.id || currentUser.uid;
      if (!userId) {
        setError('Cannot identify user');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department
      });

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      loadProfile();

      // Update localStorage if it's the current user
      if (userId === currentUser.uid) {
        const updatedUser = {
          ...currentUser,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const goBack = () => {
    if (currentUser?.role === 'admin' && userId && userId !== currentUser.uid) {
      navigate('/user-management');
    } else {
      navigate(currentUser?.role === 'admin' ? '/admin' : '/employee');
    }
  };

  if (loading) {
    return (
      <div className="user-profile-container">
        <div className="user-profile-loading">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="user-profile-container">
        <div className="user-profile-error">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <h1>User Profile</h1>
        <div className="user-profile-buttons">
          <button onClick={goBack} className="user-profile-back-button">
            Back
          </button>
          <button onClick={handleLogout} className="user-profile-logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="user-profile-error">{error}</div>}
      {success && <div className="user-profile-success">{success}</div>}

      <div className="user-profile-content">
        <div className="user-profile-card">
          <div className="user-profile-avatar">
            <div className="user-profile-avatar-placeholder">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>

          <div className="user-profile-info">
            {!isEditing ? (
              <>
                <div className="user-profile-detail">
                  <label>Name:</label>
                  <p>{formData.name || 'N/A'}</p>
                </div>
                <div className="user-profile-detail">
                  <label>Email:</label>
                  <p>{formData.email || 'N/A'}</p>
                </div>
                <div className="user-profile-detail">
                  <label>Phone:</label>
                  <p>{formData.phone || 'Not provided'}</p>
                </div>
                <div className="user-profile-detail">
                  <label>Department:</label>
                  <p>{formData.department || 'Not assigned'}</p>
                </div>
                <div className="user-profile-detail">
                  <label>Role:</label>
                  <p>
                    <span className={`user-profile-role-badge role-${profile.role || 'user'}`}>
                      {profile.role || 'user'}
                    </span>
                  </p>
                </div>

                {(profile.id === currentUser.uid || currentUser.role === 'admin') && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="user-profile-edit-button"
                  >
                    Edit Profile
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="user-profile-form-group">
                  <label htmlFor="name">Name:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="user-profile-input"
                  />
                </div>
                <div className="user-profile-form-group">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="user-profile-input"
                  />
                </div>
                <div className="user-profile-form-group">
                  <label htmlFor="phone">Phone:</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="user-profile-input"
                  />
                </div>
                <div className="user-profile-form-group">
                  <label htmlFor="department">Department:</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="user-profile-input"
                  />
                </div>

                <div className="user-profile-edit-buttons">
                  <button
                    onClick={handleSaveProfile}
                    className="user-profile-save-button"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="user-profile-cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
