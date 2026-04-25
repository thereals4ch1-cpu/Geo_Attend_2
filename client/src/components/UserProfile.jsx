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
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = React.useRef(null);
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
        const currentUserId = getUserId(currentUser);
        if (currentUserId) {
          const userRef = doc(db, 'users', currentUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setProfile({ id: currentUserId, ...userData });
            setFormData({
              name: userData.name || currentUser.name || '',
              email: userData.email || currentUser.email || '',
              phone: userData.phone || '',
              department: userData.department || ''
            });
          } else {
            setProfile({ id: currentUserId, ...currentUser });
            setFormData({
              name: currentUser.name || '',
              email: currentUser.email || '',
              phone: currentUser.phone || '',
              department: currentUser.department || ''
            });
          }
        } else {
          setProfile(currentUser);
          setFormData({
            name: currentUser.name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            department: currentUser.department || ''
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
    
    // Phone validation: only 10 digits, no alphabetical characters
    if (name === 'phone') {
      // Remove any non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      // Limit to 10 characters
      if (digitsOnly.length > 10) {
        setError('Phone number must be exactly 10 digits');
        return;
      }
      if (digitsOnly !== value && value.length > 0) {
        setError('Phone number can only contain digits');
        return;
      }
      setError('');
      setFormData({
        ...formData,
        [name]: digitsOnly
      });
    } else {
      setError('');
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setProfilePhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    
    // Validate phone number
    if (formData.phone && formData.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }
    
    try {
      const userId = profile?.id || getUserId(currentUser);
      if (!userId) {
        setError('Cannot identify user');
        return;
      }

      const userRef = doc(db, 'users', userId);
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department
      };

      // If a new photo was selected, add it to the update
      if (photoPreview && photoPreview !== profile.photoUrl) {
        updateData.photoUrl = photoPreview;
      }

      await updateDoc(userRef, updateData);

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setProfilePhoto(null);
      loadProfile();

      // Update localStorage if it's the current user
      if (userId === getUserId(currentUser)) {
        const updatedUser = {
          ...currentUser,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department
        };
        if (photoPreview && photoPreview !== profile.photoUrl) {
          updatedUser.photoUrl = photoPreview;
        }
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
            <div 
              className={`user-profile-avatar-container ${isEditing ? 'editing' : ''}`}
              onClick={isEditing ? handlePhotoClick : undefined}
            >
              {photoPreview || profile.photoUrl ? (
                <>
                  <img 
                    src={photoPreview || profile.photoUrl} 
                    alt="Profile"
                    className="user-profile-avatar-image"
                  />
                  {isEditing && (
                    <div className="user-profile-photo-overlay">
                      <svg className="user-profile-camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <span>Change photo</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="user-profile-avatar-placeholder">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  {isEditing && (
                    <div className="user-profile-photo-overlay">
                      <svg className="user-profile-camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <span>Add photo</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="user-profile-file-input"
            />
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

                {(profile.id === getUserId(currentUser) || currentUser.role === 'admin') && (
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
                    placeholder="10 digit phone number"
                    maxLength="10"
                    className="user-profile-input"
                  />
                  <small className="user-profile-phone-hint">
                    {formData.phone.length}/10 digits
                  </small>
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
