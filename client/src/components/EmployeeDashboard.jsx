import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../css/EmployeeDashboard.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom markers
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [fences, setFences] = useState([]);
  const [insideFence, setInsideFence] = useState(false);
  const [currentFence, setCurrentFence] = useState(null);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState('');
  const [watchId, setWatchId] = useState(null);
  const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  const getUserId = (userData) => userData?.id || userData?.uid || userData?.userId || null;

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const loadFences = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'geoFences'));
      const fencesData = [];
      querySnapshot.forEach((doc) => {
        fencesData.push({ id: doc.id, ...doc.data() });
      });
      setFences(fencesData);
      console.log('Loaded fences:', fencesData);
    } catch (error) {
      console.error('Error loading fences:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const userData = JSON.parse(localStorage.getItem('user'));
      const userId = getUserId(userData);
      if (!userId) {
        throw new Error('Missing user ID in localStorage');
      }
      
      const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', userId),
        where('date', '==', today)
      );
      
      const querySnapshot = await getDocs(q);
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });

      records.sort((a, b) => {
        const aTime = a.checkInTimestamp ? a.checkInTimestamp.toDate ? a.checkInTimestamp.toDate() : new Date(a.checkInTimestamp) : new Date(0);
        const bTime = b.checkInTimestamp ? b.checkInTimestamp.toDate ? b.checkInTimestamp.toDate() : new Date(b.checkInTimestamp) : new Date(0);
        return bTime - aTime;
      });

      setTodayAttendance(records);
      if (records.length > 0) {
        const latest = records[0];
        setAttendanceStatus({
          checkIn: latest.checkInTime,
          checkOut: latest.checkOutTime || null,
          location: latest.fenceLocation?.name || latest.checkInLocation?.name || null,
          recordId: latest.id
        });
      } else {
        setAttendanceStatus(null);
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
      setTodayAttendance([]);
      setAttendanceStatus(null);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const userId = getUserId(userData);
      if (!userId) {
        throw new Error('Missing user ID in localStorage');
      }
      const response = await axios.get(`${API_BASE_URL}/api/attendance/employee/${userId}`);
      setAttendanceHistory(response.data);
      console.log('Loaded history:', response.data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const checkIfInsideFence = (userLocation) => {
    console.log('Checking location:', userLocation);
    let inside = false;
    let fence = null;
    let minDistance = Infinity;

    for (const f of fences) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        f.latitude,
        f.longitude
      );
      
      console.log(`Fence: ${f.name}, Distance: ${distance.toFixed(2)}m, Radius: ${f.radius}m`);
      
      if (distance <= f.radius) {
        inside = true;
        fence = f;
        minDistance = distance;
        console.log(`✅ Inside ${f.name}!`);
        break;
      }
    }

    setInsideFence(inside);
    setCurrentFence(fence);
    setCurrentDistance(minDistance === Infinity ? null : minDistance);
    
    return { inside, fence, distance: minDistance };
  };

  const watchLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(userLocation);
        setMapCenter([userLocation.lat, userLocation.lng]);
        console.log(`Location accuracy: ±${userLocation.accuracy}m`);
        checkIfInsideFence(userLocation);
      },
      (error) => {
        console.error('Error getting location:', error);
        setMessage('Please enable high accuracy location');
      },
      options
    );
    
    setWatchId(id);
  };

  const markAttendance = async (type) => {
    if (!location) {
      setMessage('❌ Unable to get your location. Please wait...');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const result = checkIfInsideFence(location);
    
    if (!result.inside) {
      const nearestFence = fences.reduce((nearest, fence) => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          fence.latitude,
          fence.longitude
        );
        if (!nearest || distance < nearest.distance) {
          return { fence, distance };
        }
        return nearest;
      }, null);
      
      if (nearestFence) {
        setMessage(`❌ You are ${nearestFence.distance.toFixed(2)}m away from the nearest fence (${nearestFence.fence.name}). Radius is ${nearestFence.fence.radius}m.`);
      } else {
        setMessage('❌ You must be inside a geo-fence to mark attendance!');
      }
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const userId = getUserId(userData);
      if (!userId) {
        setMessage('❌ Unable to mark attendance: user ID missing. Please log in again.');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const time = now.toLocaleTimeString();
      const dateString = now.toLocaleDateString();

      if (type === 'in') {
        if (attendanceStatus?.checkIn && !attendanceStatus?.checkOut) {
          setMessage(`❌ You must check out from ${attendanceStatus.location || 'your current location'} before checking in again.`);
          setTimeout(() => setMessage(''), 5000);
          return;
        }
        
        const attendanceRecord = {
          employeeId: userId,
          employeeName: userData.name,
          employeeEmail: userData.email,
          date: today,
          dateString: dateString,
          checkInTime: time,
          checkInTimestamp: now,
          checkInLocation: {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy
          },
          fenceLocation: {
            name: result.fence.name,
            lat: result.fence.latitude,
            lng: result.fence.longitude,
            radius: result.fence.radius,
            distance: result.distance
          },
          status: 'checked_in',
          createdAt: now
        };
        
        const docRef = await addDoc(collection(db, 'attendance'), attendanceRecord);
        
        console.log('✅ Check-in saved!');
        console.log('Employee:', userData.name);
        console.log('Time:', time);
        console.log('Fence:', result.fence.name);
        
        const newRecord = {
          id: docRef.id,
          ...attendanceRecord
        };

        setTodayAttendance((prev) => [newRecord, ...prev]);
        setAttendanceStatus({ 
          checkIn: time, 
          checkOut: null,
          location: result.fence.name,
          recordId: docRef.id 
        });
        setMessage(`✅ Check-in successful at ${result.fence.name}! (${result.distance.toFixed(2)}m from center)`);
      } 
      else if (type === 'out') {
        if (!attendanceStatus?.checkIn || attendanceStatus?.checkOut) {
          setMessage('❌ You have no active check-in session to check out from.');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        
        let docRef = null;
        if (attendanceStatus?.recordId) {
          docRef = doc(db, 'attendance', attendanceStatus.recordId);
        } else {
          const q = query(
            collection(db, 'attendance'),
            where('employeeId', '==', userId),
            where('date', '==', today)
          );
          const querySnapshot = await getDocs(q);
          const todayRecords = [];
          querySnapshot.forEach((docItem) => {
            todayRecords.push({ id: docItem.id, ...docItem.data(), ref: docItem.ref });
          });

          const activeRecord = todayRecords
            .sort((a, b) => {
              const aTime = a.checkInTimestamp ? a.checkInTimestamp.toDate ? a.checkInTimestamp.toDate() : new Date(a.checkInTimestamp) : new Date(0);
              const bTime = b.checkInTimestamp ? b.checkInTimestamp.toDate ? b.checkInTimestamp.toDate() : new Date(b.checkInTimestamp) : new Date(0);
              return bTime - aTime;
            })
            .find((record) => !record.checkOutTime || record.status !== 'completed');

          if (activeRecord) {
            docRef = activeRecord.ref;
          }
        }

        if (docRef) {
          
          const updateData = {
            checkOutTime: time,
            checkOutTimestamp: now,
            checkOutLocation: {
              lat: location.lat,
              lng: location.lng,
              accuracy: location.accuracy
            },
            status: 'completed',
            updatedAt: now
          };
          
          await axios.post(`${API_BASE_URL}/api/attendance/update`, {
            docId: docRef.id,
            ...updateData
          });
          
          console.log('✅ Check-out saved!');
          console.log('Employee:', userData.name);
          console.log('Time:', time);
          
          setTodayAttendance((prev) => prev.map((record) =>
            record.id === docRef.id
              ? { ...record, ...updateData }
              : record
          ));
          setAttendanceStatus({ 
            ...attendanceStatus, 
            checkOut: time 
          });
          setMessage(`✅ Check-out successful at ${result.fence.name}!`);
        } else {
          setMessage('❌ No check-in record found for today!');
        }
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setMessage('❌ Error marking attendance: ' + error.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLogout = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    localStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'employee') {
      navigate('/');
      return;
    }
    setUser(userData);
    loadFences();
    checkTodayAttendance();
    watchLocation();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [navigate]);

  return (
    <div className="employee-container">
      <div className="employee-header">
        <h1>Employee Dashboard</h1>
        <div>
          <button 
            onClick={() => navigate('/profile')} 
            className="employee-profile-button"
          >
            My Profile
          </button>
          <button 
            onClick={() => navigate('/attendance-history')} 
            className="employee-attendance-history-button"
          >
            Attendance History
          </button>
          <button onClick={handleLogout} className="employee-logout-button">Logout</button>
        </div>
      </div>
      
      <div className="employee-content">
        <div className="employee-left-panel">
          <div className="employee-user-info">
            <h2>Welcome, {user?.name}!</h2>
            <p>📧 {user?.email}</p>
          </div>
          
          {location && (
            <div className="employee-location-info">
              <p>📍 Current Location:</p>
              <p>Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
              <p>🎯 Accuracy: ±{location.accuracy?.toFixed(1)}m</p>
              {currentDistance && currentFence && (
                <p>📏 Distance to {currentFence.name}: {currentDistance.toFixed(2)}m (Radius: {currentFence.radius}m)</p>
              )}
            </div>
          )}
          
          <div className="employee-fence-status">
            {insideFence ? (
              <div className="employee-inside-fence">
                <h3>✅ Inside Geo-Fence: {currentFence?.name}</h3>
                <p>You are {currentDistance?.toFixed(2)}m from the center (Radius: {currentFence?.radius}m)</p>
                <p>You can mark your attendance!</p>
              </div>
            ) : (
              <div className="employee-outside-fence">
                <h3>❌ Outside Geo-Fence</h3>
                <p>Please move to the designated area to mark attendance</p>
              </div>
            )}
          </div>
          
          {message && (
            <div className="employee-message">
              {message}
            </div>
          )}
          
          <div className="employee-attendance-buttons">
            <button 
              onClick={() => markAttendance('in')}
              disabled={attendanceStatus?.checkIn && !attendanceStatus?.checkOut}
              style={{
                opacity: attendanceStatus?.checkIn && !attendanceStatus?.checkOut ? 0.5 : 1,
                backgroundColor: insideFence && !(attendanceStatus?.checkIn && !attendanceStatus?.checkOut) ? '#28a745' : '#6c757d'
              }}
              className="employee-check-in-button"
            >
              {attendanceStatus?.checkIn && !attendanceStatus?.checkOut ? '✓ Checked In' : 'Check In'}
            </button>
            
            <button 
              onClick={() => markAttendance('out')}
              disabled={!attendanceStatus?.checkIn || attendanceStatus?.checkOut}
              style={{
                opacity: (!attendanceStatus?.checkIn || attendanceStatus?.checkOut) ? 0.5 : 1,
                backgroundColor: insideFence && attendanceStatus?.checkIn && !attendanceStatus?.checkOut ? '#dc3545' : '#6c757d'
              }}
              className="employee-check-out-button"
            >
              {attendanceStatus?.checkOut ? '✓ Checked Out' : 'Check Out'}
            </button>
          </div>
          
          <div className="employee-attendance-info">
            <h3>Today's Attendance</h3>
            {todayAttendance.length === 0 ? (
              <p>No attendance recorded today.</p>
            ) : (
              todayAttendance.map((record) => (
                <div key={record.id} className="employee-today-attendance-card">
                  <p>📍 Location: {record.fenceLocation?.name || record.checkInLocation?.name || 'Unknown'}</p>
                  <p>🕐 Check-in: {record.checkInTime}</p>
                  <p>🕐 Check-out: {record.checkOutTime || 'Still checked in'}</p>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="employee-right-panel">
          <div className="employee-map-container">
            <h2>Map View</h2>
            <div style={{ height: '400px', width: '100%' }}>
              <MapContainer
                center={mapCenter}
                zoom={18}
                style={{ height: '100%', width: '100%', borderRadius: '8px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {location && (
                  <Marker position={[location.lat, location.lng]} icon={greenIcon}>
                    <Popup>
                      Your Current Location<br/>
                      Accuracy: ±{location.accuracy?.toFixed(1)}m<br/>
                      {insideFence && currentFence && `Inside: ${currentFence.name}`}
                    </Popup>
                  </Marker>
                )}
                
                {fences.map((fence) => (
                  <React.Fragment key={fence.id}>
                    <Marker 
                      position={[fence.latitude, fence.longitude]}
                      icon={insideFence && currentFence?.id === fence.id ? greenIcon : redIcon}
                    >
                      <Popup>
                        <div>
                          <strong>{fence.name}</strong><br />
                          📍 {fence.latitude.toFixed(6)}, {fence.longitude.toFixed(6)}<br />
                          📏 Radius: {fence.radius}m<br />
                          {location && (
                            <span>
                              Distance: {calculateDistance(
                                location.lat,
                                location.lng,
                                fence.latitude,
                                fence.longitude
                              ).toFixed(2)}m
                            </span>
                          )}
                          {insideFence && currentFence?.id === fence.id && 
                            <span style={{color: 'green', display: 'block'}}>✅ You are inside this fence!</span>
                          }
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={[fence.latitude, fence.longitude]}
                      radius={fence.radius}
                      pathOptions={{
                        fillColor: insideFence && currentFence?.id === fence.id ? '#00ff00' : '#ff0000',
                        fillOpacity: 0.2,
                        color: insideFence && currentFence?.id === fence.id ? '#00ff00' : '#ff0000',
                        weight: 2
                      }}
                    />
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
            
            <div className="employee-map-legend">
              <div><span className="employee-green-dot"></span> Your Location</div>
              <div><span className="employee-red-dot"></span> Geo-Fence Center</div>
              <div><span className="employee-red-circle"></span> Geo-Fence Area</div>
              {insideFence && <div><span className="employee-green-circle"></span> You are inside this fence</div>}
            </div>
          </div>
          
          <div className="employee-fences-list">
            <h3>Nearby Geo-Fences</h3>
            {fences.map((fence) => {
              const distance = location ? calculateDistance(
                location.lat,
                location.lng,
                fence.latitude,
                fence.longitude
              ) : 0;
              const isInside = distance <= fence.radius;
              return (
                <div 
                  key={fence.id} 
                  style={{
                    backgroundColor: isInside ? '#d4edda' : '#f9f9f9',
                    border: isInside ? '2px solid #28a745' : '1px solid #ddd'
                  }}
                  className="employee-fence-card"
                >
                  <strong>{fence.name}</strong>
                  <p>📍 Distance: {distance.toFixed(2)}m (Radius: {fence.radius}m)</p>
                  {isInside && <p className="employee-inside-text">✅ You are inside this fence!</p>}
                  {!isInside && distance > 0 && (
                    <p className="employee-outside-text">❌ Need to move {Math.abs(distance - fence.radius).toFixed(2)}m closer</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attendance History Section */}
      {showHistory && (
        <div className="employee-history-section">
          <h3>My Attendance History</h3>
          <div className="employee-history-list">
            {attendanceHistory.length === 0 ? (
              <p>No attendance records found.</p>
            ) : (
              attendanceHistory.map((record) => (
                <div key={record.id} className="employee-history-card">
                  <div className="employee-history-date">
                    <strong>{record.date} ({record.dateString})</strong>
                  </div>
                  <div className="employee-history-times">
                    <span>✅ Check In: {record.checkInTime}</span>
                    {record.checkOutTime && (
                      <span>❌ Check Out: {record.checkOutTime}</span>
                    )}
                  </div>
                  <div className="employee-history-location">
                    📍 Fence: {record.fenceLocation?.name || 'N/A'}
                    {record.fenceLocation?.distance && (
                      <span> (Distance: {record.fenceLocation.distance.toFixed(2)}m)</span>
                    )}
                  </div>
                  <div className="employee-history-status">
                    Status: {record.status === 'completed' ? '✅ Completed' : '🟡 Active'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDashboard;