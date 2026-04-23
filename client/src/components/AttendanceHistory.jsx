import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../css/AttendanceHistory.css';

function AttendanceHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const { userId } = useParams();
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    // If viewing another user's attendance, must be admin
    if (userId && userId !== currentUser.uid && currentUser.role !== 'admin') {
      navigate('/');
      return;
    }

    loadAttendanceHistory();
  }, [userId, navigate]);

  const loadAttendanceHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const targetUserId = userId || currentUser.uid;
      const response = await axios.get(`http://localhost:5000/api/attendance/user/${targetUserId}`);
      setRecords(response.data || []);

      // Set user info from current user or from records
      if (userId && userId !== currentUser.uid) {
        // Admin viewing another user - try to get from Firebase or records
        if (response.data && response.data.length > 0) {
          setUserInfo({
            name: response.data[0].employeeName,
            email: response.data[0].employeeEmail
          });
        }
      } else {
        // User viewing their own history
        setUserInfo({
          name: currentUser.name,
          email: currentUser.email
        });
      }
    } catch (err) {
      setError('Failed to load attendance history: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const goBack = () => {
    if (userId && userId !== currentUser.uid && currentUser.role === 'admin') {
      navigate('/user-management');
    } else {
      navigate(currentUser?.role === 'admin' ? '/admin' : '/employee');
    }
  };

  return (
    <div className="attendance-history-container">
      <div className="attendance-history-header">
        <div>
          <h1>Attendance History</h1>
          {userInfo && (
            <p className="attendance-history-user-info">
              {userInfo.name} ({userInfo.email})
            </p>
          )}
        </div>
        <div className="attendance-history-buttons">
          <button onClick={goBack} className="attendance-history-back-button">
            Back
          </button>
          <button onClick={handleLogout} className="attendance-history-logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="attendance-history-error">{error}</div>}

      <div className="attendance-history-content">
        {loading ? (
          <div className="attendance-history-loading">Loading attendance records...</div>
        ) : records.length === 0 ? (
          <div className="attendance-history-empty">No attendance records found</div>
        ) : (
          <div className="attendance-history-table-container">
            <table className="attendance-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In Time</th>
                  <th>Check Out Time</th>
                  <th>Fence Location</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  let duration = 'N/A';
                  if (record.checkInTime && record.checkOutTime) {
                    try {
                      const checkIn = new Date(`${record.date}T${record.checkInTime}`);
                      const checkOut = new Date(`${record.date}T${record.checkOutTime}`);
                      const diffMs = checkOut - checkIn;
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      duration = `${hours}h ${minutes}m`;
                    } catch (e) {
                      duration = 'N/A';
                    }
                  }

                  return (
                    <tr key={index}>
                      <td>{record.date}</td>
                      <td>
                        {record.checkInTime ? (
                          <span className="attendance-history-check-in">✅ {record.checkInTime}</span>
                        ) : (
                          <span className="attendance-history-not-checked">—</span>
                        )}
                      </td>
                      <td>
                        {record.checkOutTime ? (
                          <span className="attendance-history-check-out">✅ {record.checkOutTime}</span>
                        ) : (
                          <span className="attendance-history-not-checked">—</span>
                        )}
                      </td>
                      <td>{record.fenceLocation?.name || 'N/A'}</td>
                      <td>
                        <span
                          className={`attendance-history-status ${
                            record.status === 'completed' ? 'completed' : 'active'
                          }`}
                        >
                          {record.status === 'completed' ? '✅ Completed' : '🟡 Active'}
                        </span>
                      </td>
                      <td>{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceHistory;
