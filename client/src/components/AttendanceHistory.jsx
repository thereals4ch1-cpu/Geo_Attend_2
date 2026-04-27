import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import '../css/AttendanceHistory.css';

function AttendanceHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [filterLocation, setFilterLocation] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const navigate = useNavigate();
  const { userId } = useParams();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isAdmin = currentUser?.role === 'admin';

  const getUserId = (user) => user?.uid || user?.id || user?.userId || null;

  const parseTimestamp = (value) => {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (typeof value === 'object' && value._seconds != null) {
      return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000));
    }
    return new Date(value);
  };

  const parseTimeString = (date, time) => {
    if (!date || !time) return null;
    const parts = time.split(' ');
    const timePart = parts[0];
    const ampm = parts[1]?.toUpperCase();
    const [hours, minutes, seconds = '0'] = timePart.split(':').map(Number);
    if ([hours, minutes, seconds].some((n) => Number.isNaN(n))) return null;

    let hour = hours;
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    const currentUserId = getUserId(currentUser);

    // If viewing another user's attendance, must be admin
    if (userId && userId !== currentUserId && !isAdmin) {
      navigate('/');
      return;
    }

    loadAttendanceHistory();
    loadLocationOptions();
  }, [userId, navigate, isAdmin]);

  const loadLocationOptions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'geoFences'));
      const locations = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data?.name) {
          locations.push(data.name);
        }
      });
      setLocationOptions(Array.from(new Set(locations)).sort());
    } catch (error) {
      console.error('Error loading location options:', error);
    }
  };

  const loadAttendanceHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const targetUserId = userId || getUserId(currentUser);
      const url = isAdmin && !userId
        ? 'http://localhost:5000/api/attendance/all'
        : `http://localhost:5000/api/attendance/user/${targetUserId}`;
      const response = await axios.get(url);
      setRecords(response.data || []);

      if (isAdmin && !userId) {
        setUserInfo({
          name: 'All Employees',
          email: 'All attendance records'
        });
      } else if (userId && userId !== getUserId(currentUser)) {
        if (response.data && response.data.length > 0) {
          setUserInfo({
            name: response.data[0].employeeName,
            email: response.data[0].employeeEmail
          });
        }
      } else {
        setUserInfo({
          name: currentUser?.name,
          email: currentUser?.email
        });
      }
    } catch (err) {
      setError('Failed to load attendance history: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(locationOptions)).sort();
  }, [locationOptions]);

  const filteredRecords = useMemo(() => {
    const searchTerm = filterLocation.trim().toLowerCase();
    
    let filtered = records.filter((record) => {
      if (isAdmin && employeeFilter) {
        if (!record.employeeName?.toLowerCase().includes(employeeFilter.toLowerCase()) &&
            !record.employeeEmail?.toLowerCase().includes(employeeFilter.toLowerCase())) {
          return false;
        }
      }

      if (startDate && record.date < startDate) return false;
      if (endDate && record.date > endDate) return false;
      
      if (filterLocation && record.fenceLocation?.name !== filterLocation) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const fenceName = record.fenceLocation?.name?.toLowerCase() || '';
      const checkInLoc = record.checkInLocation?.name?.toLowerCase?.() || '';
      const checkOutLoc = record.checkOutLocation?.name?.toLowerCase?.() || '';
      const coords = `${record.checkInLocation?.lat || ''} ${record.checkInLocation?.lng || ''} ${record.checkOutLocation?.lat || ''} ${record.checkOutLocation?.lng || ''}`;

      return (
        fenceName.includes(searchTerm) ||
        checkInLoc.includes(searchTerm) ||
        checkOutLoc.includes(searchTerm) ||
        coords.includes(searchTerm)
      );
    });
    
    return filtered.sort((a, b) => {
      if (a.date === b.date) {
        const aTime = a.checkInTimestamp
          ? a.checkInTimestamp.toDate
            ? a.checkInTimestamp.toDate()
            : new Date(a.checkInTimestamp)
          : new Date(0);
        const bTime = b.checkInTimestamp
          ? b.checkInTimestamp.toDate
            ? b.checkInTimestamp.toDate()
            : new Date(b.checkInTimestamp)
          : new Date(0);
        return bTime - aTime;
      }
      return b.date.localeCompare(a.date);
    });
  }, [records, filterLocation, employeeFilter, startDate, endDate, isAdmin]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const goBack = () => {
    if (userId && userId !== getUserId(currentUser) && currentUser.role === 'admin') {
      navigate('/user-management');
    } else {
      navigate(currentUser?.role === 'admin' ? '/admin' : '/employee');
    }
  };

  const downloadCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records to download');
      return;
    }

    const headers = isAdmin 
      ? ['Employee Name', 'Employee Email', 'Date', 'Check In Time', 'Check Out Time', 'Fence Location', 'Status', 'Duration']
      : ['Date', 'Check In Time', 'Check Out Time', 'Fence Location', 'Status', 'Duration'];

    const csvContent = [
      headers.join(','),
      ...filteredRecords.map((record) => {
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

        const status = record.status === 'completed' ? 'Completed' : 'Active';
        
        if (isAdmin) {
          return [
            `"${record.employeeName || 'Unknown'}"`,
            `"${record.employeeEmail || 'N/A'}"`,
            record.date,
            record.checkInTime || 'N/A',
            record.checkOutTime || 'N/A',
            `"${record.fenceLocation?.name || 'N/A'}"`,
            status,
            duration
          ].join(',');
        } else {
          return [
            record.date,
            record.checkInTime || 'N/A',
            record.checkOutTime || 'N/A',
            `"${record.fenceLocation?.name || 'N/A'}"`,
            status,
            duration
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = isAdmin && !userId 
      ? `All_Attendance_${new Date().toISOString().split('T')[0]}.csv`
      : `Attendance_${userInfo?.name || 'History'}_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setEmployeeFilter('');
    setStartDate('');
    setEndDate('');
    setFilterLocation('');
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
          <button onClick={downloadCSV} className="attendance-history-download-button">
            ⬇ Download CSV
          </button>
          <button onClick={goBack} className="attendance-history-back-button">
            Back
          </button>
          <button onClick={handleLogout} className="attendance-history-logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="attendance-history-filters">
        <div className="attendance-history-filter-heading">Filter attendance records</div>
        
        <div className="attendance-history-filter-row">
          {isAdmin && (
            <div className="attendance-history-filter-group">
              <label htmlFor="employee-filter">Employee:</label>
              <input
                id="employee-filter"
                type="text"
                placeholder="Search by name or email"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="attendance-history-filter-input"
              />
            </div>
          )}
          <div className="attendance-history-filter-group">
            <label htmlFor="start-date">Start Date:</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="attendance-history-filter-input"
            />
          </div>
          <div className="attendance-history-filter-group">
            <label htmlFor="end-date">End Date:</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="attendance-history-filter-input"
            />
          </div>
        </div>

        <div className="attendance-history-filter-row" style={{ marginTop: '10px' }}>
          <div className="attendance-history-filter-group">
            <label htmlFor="filter-location">Location:</label>
            <select
              id="filter-location"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="attendance-history-filter-input"
            >
              <option value="">All locations</option>
              {uniqueLocations.map((locationName) => (
                <option key={locationName} value={locationName}>
                  {locationName}
                </option>
              ))}
            </select>
          </div>
          <div className="attendance-history-filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={clearFilters} className="attendance-history-clear-button">
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="attendance-history-filter-info" style={{ marginTop: '10px' }}>
          Showing {filteredRecords.length} of {records.length} records
        </div>
      </div>

      {error && <div className="attendance-history-error">{error}</div>}

      <div className="attendance-history-content">
        {loading ? (
          <div className="attendance-history-loading">Loading attendance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="attendance-history-empty">
            {records.length === 0 ? 'No attendance records found' : 'No records match your filters'}
          </div>
        ) : (
          <div className="attendance-history-table-container">
            <table className="attendance-history-table">
              <thead>
                <tr>
                  {isAdmin && <th>Employee</th>}
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Fence Location</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => {
                  let duration = 'N/A';
                  if (record.checkInTime && record.checkOutTime) {
                    const checkIn = parseTimestamp(record.checkInTimestamp) || parseTimeString(record.date, record.checkInTime);
                    const checkOut = parseTimestamp(record.checkOutTimestamp) || parseTimeString(record.date, record.checkOutTime);
                    if (checkIn && checkOut && !Number.isNaN(checkIn) && !Number.isNaN(checkOut)) {
                      const diffMs = checkOut - checkIn;
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      duration = `${hours}h ${minutes}m`;
                    }
                  }

                  const isExpanded = expandedRecord === index;

                  return (
                    <React.Fragment key={record.id || index}>
                      <tr className={isExpanded ? 'expanded' : ''}>
                        {isAdmin && (
                          <td>
                            {record.employeeName ? record.employeeName : 'Unknown'}
                            {record.employeeEmail ? <div className="attendance-history-employee-email" style={{fontSize: '0.8em', color: '#666'}}>{record.employeeEmail}</div> : null}
                          </td>
                        )}
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
                        <td>{duration}</td>
                        <td>
                          <span
                            className={`attendance-history-status ${
                              record.status === 'completed' ? 'completed' : 'active'
                            }`}
                          >
                            {record.status === 'completed' ? '✅ Completed' : '🟡 Active'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="attendance-history-expand-button"
                            onClick={() => setExpandedRecord(isExpanded ? null : index)}
                            title="View location details"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="attendance-history-details-row">
                          <td colSpan={isAdmin ? "8" : "7"}>
                            <div className="attendance-history-details">
                              <div className="attendance-history-details-grid">
                                <div className="details-section">
                                  <h4>Check-In Details</h4>
                                  <div className="detail-item">
                                    <label>Time:</label>
                                    <span>{record.checkInTime || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <label>Location:</label>
                                    <span>{record.checkInLocation?.lat?.toFixed(6) || 'N/A'}, {record.checkInLocation?.lng?.toFixed(6) || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <label>Accuracy:</label>
                                    <span>±{record.checkInLocation?.accuracy?.toFixed(1) || 'N/A'}m</span>
                                  </div>
                                </div>
                                <div className="details-section">
                                  <h4>Check-Out Details</h4>
                                  <div className="detail-item">
                                    <label>Time:</label>
                                    <span>{record.checkOutTime || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <label>Location:</label>
                                    <span>{record.checkOutLocation?.lat?.toFixed(6) || 'N/A'}, {record.checkOutLocation?.lng?.toFixed(6) || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <label>Accuracy:</label>
                                    <span>±{record.checkOutLocation?.accuracy?.toFixed(1) || 'N/A'}m</span>
                                  </div>
                                </div>
                                <div className="details-section">
                                  <h4>Geo-Fence Information</h4>
                                  <div className="detail-item">
                                    <label>Fence Name:</label>
                                    <span>{record.fenceLocation?.name || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <label>Fence Location:</label>
                                    <span>{record.fenceLocation?.lat?.toFixed(6) || 'N/A'}, {record.fenceLocation?.lng?.toFixed(6) || 'N/A'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <label>Fence Radius:</label>
                                    <span>{record.fenceLocation?.radius || 'N/A'}m</span>
                                  </div>
                                  <div className="detail-item">
                                    <label>Distance from Center:</label>
                                    <span>{record.fenceLocation?.distance?.toFixed(2) || 'N/A'}m</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
