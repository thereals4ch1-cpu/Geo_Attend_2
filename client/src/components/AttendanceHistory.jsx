import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../css/AttendanceHistory.css';

function AttendanceHistory() {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const navigate = useNavigate();
  const { userId } = useParams();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    if (userId && userId !== currentUser.uid && !isAdmin) {
      navigate('/');
      return;
    }

    loadAttendanceHistory();
  }, [userId, navigate, isAdmin]);

  // Filter records based on employee and date range
  useEffect(() => {
    let filtered = [...records];

    // Filter by employee (admin only)
    if (isAdmin && employeeFilter) {
      filtered = filtered.filter(record =>
        record.employeeName?.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        record.employeeEmail?.toLowerCase().includes(employeeFilter.toLowerCase())
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(record => record.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(record => record.date <= endDate);
    }

    setFilteredRecords(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [records, employeeFilter, startDate, endDate, isAdmin]);

  const loadAttendanceHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const url = isAdmin && !userId
        ? `${API_BASE_URL}/api/attendance/all`
        : `${API_BASE_URL}/api/attendance/user/${userId || currentUser.uid}`;
      const response = await axios.get(url);
      setRecords(response.data || []);
      setFilteredRecords(response.data || []);

      if (isAdmin && !userId) {
        setUserInfo({
          name: 'All Employees',
          email: 'All attendance records'
        });
      } else if (userId && userId !== currentUser.uid) {
        if (response.data && response.data.length > 0) {
          setUserInfo({
            name: response.data[0].employeeName,
            email: response.data[0].employeeEmail
          });
        }
      } else {
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

  const downloadCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records to download');
      return;
    }

    const headers = isAdmin
      ? ['Employee Name', 'Employee Email', 'Date', 'Check In Time', 'Check Out Time', 'Fence Location', 'Status']
      : ['Date', 'Check In Time', 'Check Out Time', 'Fence Location', 'Status'];

    const csvContent = [
      headers.join(','),
      ...filteredRecords.map((record) => {
        const status = record.status === 'completed' ? 'Completed' : 'Active';

        if (isAdmin) {
          return [
            `"${record.employeeName || 'Unknown'}"`,
            `"${record.employeeEmail || 'N/A'}"`,
            record.date,
            record.checkInTime || 'N/A',
            record.checkOutTime || 'N/A',
            `"${record.fenceLocation?.name || 'N/A'}"`,
            status
          ].join(',');
        } else {
          return [
            record.date,
            record.checkInTime || 'N/A',
            record.checkOutTime || 'N/A',
            `"${record.fenceLocation?.name || 'N/A'}"`,
            status
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
  };

  // Get current page records
  const getCurrentPageRecords = () => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredRecords.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Handle previous page
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle next page
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
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

      {error && <div className="attendance-history-error">{error}</div>}

      {/* Filter Controls */}
      <div className="attendance-history-filters">
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
          <div className="attendance-history-filter-group">
            <button onClick={clearFilters} className="attendance-history-clear-button">
              Clear Filters
            </button>
          </div>
        </div>
        <div className="attendance-history-filter-info">
          Showing {getCurrentPageRecords().length} of {filteredRecords.length} records (Page {currentPage} of {totalPages})
        </div>
      </div>

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
                  <th>Check In Time</th>
                  <th>Check Out Time</th>
                  <th>Fence Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageRecords().map((record, index) => {
                  return (
                    <tr key={index}>
                      {isAdmin && (
                        <td>
                          {record.employeeName ? record.employeeName : 'Unknown'}
                          {record.employeeEmail ? <div className="attendance-history-employee-email">{record.employeeEmail}</div> : null}
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
                      <td>
                        <span
                          className={`attendance-history-status ${record.status === 'completed' ? 'completed' : 'active'
                            }`}
                        >
                          {record.status === 'completed' ? '✅ Completed' : '🟡 Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="attendance-history-pagination">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="attendance-history-pagination-button"
            >
              Previous
            </button>

            <div className="attendance-history-pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`attendance-history-pagination-page ${currentPage === page ? 'active' : ''
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="attendance-history-pagination-button"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceHistory;