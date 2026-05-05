import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import axios from 'axios';
import { db } from '../firebase';
import { API_BASE_URL } from '../config';
import '../css/AdminDashboard.css';

function EmployeeSchedule() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [scheduledTrips, setScheduledTrips] = useState([]);
  const [historyEmployeeId, setHistoryEmployeeId] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [destination, setDestination] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [messageTemplate, setMessageTemplate] = useState(
    'Hello {{employeeName}}, you are scheduled at {{destination}} on {{scheduledAt}}. Stay there for {{durationMinutes}} minutes (until {{expectedEndTime}}).'
  );

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      querySnapshot.forEach((userDoc) => {
        usersData.push({ id: userDoc.id, ...userDoc.data() });
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'geoFences'));
      const locationsData = [];
      querySnapshot.forEach((locationDoc) => {
        locationsData.push({ id: locationDoc.id, ...locationDoc.data() });
      });
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadScheduledTrips = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/schedules/all`);
      setScheduledTrips(response.data);
    } catch (error) {
      console.error('Error loading scheduled trips:', error);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'string') return new Date(value).toLocaleString();
    if (value?.seconds) return new Date(value.seconds * 1000).toLocaleString();
    if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString();
    return 'N/A';
  };

  const formatDateForInput = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  };

  const formatTimeForInput = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleEditSchedule = (trip) => {
    setEditingScheduleId(trip.id);
    setSelectedUser(trip.employeeId || '');
    setDestination(trip.destination || '');
    setScheduledDate(formatDateForInput(trip.scheduledTime));
    setScheduledTime(formatTimeForInput(trip.scheduledTime));
    setDurationMinutes(String(trip.durationMinutes || 60));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingScheduleId('');
    setSelectedUser('');
    setDestination('');
    setScheduledDate('');
    setScheduledTime('');
    setDurationMinutes('60');
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!scheduleId || scheduleId === 'undefined') {
      alert('❌ Missing schedule ID. Reload the page and try again.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this schedule history?')) {
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/schedules/delete/${encodeURIComponent(scheduleId)}`
      );

      if (editingScheduleId === scheduleId) {
        handleCancelEdit();
      }

      alert('✅ Schedule history deleted successfully.');
      loadScheduledTrips();
    } catch (apiError) {
      try {
        await deleteDoc(doc(db, 'schedules', scheduleId));
        if (editingScheduleId === scheduleId) {
          handleCancelEdit();
        }
        alert('✅ Schedule history deleted successfully.');
        loadScheduledTrips();
      } catch (firestoreError) {
        console.error('Error deleting schedule history:', apiError, firestoreError);
        alert(
          `❌ Failed to delete schedule history: ${apiError.response?.data?.error || apiError.message}${
            firestoreError.code ? ` (${firestoreError.code})` : ''
          }`
        );
      }
    }
  };

  const handleScheduleEmployee = async (e) => {
    e.preventDefault();

    if (!selectedUser || !destination || !scheduledDate || !scheduledTime || !durationMinutes) {
      alert('Please fill in all schedule fields');
      return;
    }

    try {
      const payload = {
        employeeId: selectedUser,
        destination: destination.trim(),
        scheduledTime: `${scheduledDate}T${scheduledTime}`,
        durationMinutes: Number(durationMinutes),
        messageTemplate: messageTemplate.trim()
      };

      const response = editingScheduleId
        ? await axios.put(`${API_BASE_URL}/api/schedules/${editingScheduleId}`, payload)
        : await axios.post(`${API_BASE_URL}/api/schedules`, payload);

      if (editingScheduleId) {
        alert('✅ Schedule updated successfully.');
      } else if (response.data?.messageSent) {
        alert('✅ Schedule applied and employee message sent.');
      } else if (response.data?.messageError) {
        alert(`✅ Schedule applied, but message failed: ${response.data.messageError}`);
      } else {
        alert('✅ Schedule applied successfully.');
      }

      setEditingScheduleId('');
      setSelectedUser('');
      setDestination('');
      setScheduledDate('');
      setScheduledTime('');
      setDurationMinutes('60');
      loadScheduledTrips();
    } catch (error) {
      console.error('Error applying schedule:', error);
      alert(`❌ Failed to apply schedule: ${error.response?.data?.error || error.message}`);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadUsers();
    loadLocations();
    loadScheduledTrips();
  }, [navigate]);

  const employeeUsers = users.filter((user) => user.role === 'employee');
  const historyTrips = historyEmployeeId
    ? scheduledTrips.filter((trip) => trip.employeeId === historyEmployeeId)
    : [];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🗓️ Employee Schedule</h1>
        <div>
          <button onClick={() => navigate('/admin')} className="admin-user-management-button">
            ⬅️ Back to Dashboard
          </button>
          <button onClick={() => navigate('/user-management')} className="admin-user-management-button">
            👥 User Management
          </button>
          <button onClick={() => navigate('/attendance-history')} className="admin-attendance-button">
            📊 Attendance History
          </button>
          <button onClick={() => navigate('/profile')} className="admin-profile-button">
            👤 My Profile
          </button>
        </div>
      </div>

      <div className="admin-schedule-section">
        <h2>{editingScheduleId ? '✏️ Edit Employee Schedule' : '🗓️ Schedule Employee'}</h2>
        <form onSubmit={handleScheduleEmployee}>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="admin-input"
            required
          >
            <option value="">Select Employee</option>
            {employeeUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>

          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="admin-input"
            required
          >
            <option value="">Select Location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.name}>
                {location.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="admin-input"
            required
          />

          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="admin-input"
            required
          />

          <input
            type="number"
            min="1"
            placeholder="Duration at location (minutes)"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="admin-input"
            required
          />

          <textarea
            rows="3"
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            className="admin-input"
            placeholder="Employee message template"
          />
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#666' }}>
            Use: {'{{employeeName}}'}, {'{{destination}}'}, {'{{scheduledAt}}'}, {'{{durationMinutes}}'}, {'{{expectedEndTime}}'}
          </p>

          <button type="submit" className="admin-create-button">
            {editingScheduleId ? '✓ Update Schedule' : '✓ Apply Schedule'}
          </button>
          {editingScheduleId && (
            <button type="button" className="admin-delete-button" onClick={handleCancelEdit}>
              Cancel Edit
            </button>
          )}
        </form>

        <div className="admin-schedules-list">
          <h3 style={{ color: '#1e3c72' }}>📜 Employee Schedule History</h3>
          <select
            value={historyEmployeeId}
            onChange={(e) => setHistoryEmployeeId(e.target.value)}
            className="admin-input"
          >
            <option value="">Select employee to view history</option>
            {employeeUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>

          {!historyEmployeeId ? (
            <p>Select an employee to view schedule history.</p>
          ) : historyTrips.length === 0 ? (
            <p>No schedule history for this employee.</p>
          ) : (
            historyTrips.map((trip) => (
              <div key={trip.id} className="admin-schedule-card">
                <p><strong>Employee:</strong> {trip.employeeName || trip.employeeId}</p>
                <p><strong>Location:</strong> {trip.destination}</p>
                <p><strong>Scheduled:</strong> {formatDateTime(trip.scheduledTime)}</p>
                <p><strong>Duration:</strong> {trip.durationMinutes || 'N/A'} minutes</p>
                <button
                  type="button"
                  className="admin-view-button"
                  onClick={() => handleEditSchedule(trip)}
                >
                  ✏️ Edit History
                </button>
                <button
                  type="button"
                  className="admin-delete-button"
                  onClick={() => handleDeleteSchedule(trip.id)}
                >
                  🗑️ Delete History
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeSchedule;
