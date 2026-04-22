import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

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
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

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
      
      const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', userData.id),
        where('date', '==', today)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const attendance = querySnapshot.docs[0].data();
        setAttendanceStatus({
          checkIn: attendance.checkInTime,
          checkOut: attendance.checkOutTime || null,
          recordId: querySnapshot.docs[0].id
        });
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const response = await axios.get(`http://localhost:5000/api/attendance/employee/${userData.id}`);
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
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const time = now.toLocaleTimeString();
      const dateString = now.toLocaleDateString();

      if (type === 'in') {
        if (attendanceStatus?.checkIn) {
          setMessage('❌ You have already checked in today!');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        
        const attendanceRecord = {
          employeeId: userData.id,
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
        
        setAttendanceStatus({ 
          checkIn: time, 
          checkOut: null,
          recordId: docRef.id 
        });
        setMessage(`✅ Check-in successful at ${result.fence.name}! (${result.distance.toFixed(2)}m from center)`);
      } 
      else if (type === 'out') {
        if (!attendanceStatus?.checkIn) {
          setMessage('❌ You haven\'t checked in yet!');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        
        if (attendanceStatus?.checkOut) {
          setMessage('❌ You have already checked out today!');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        
        const q = query(
          collection(db, 'attendance'),
          where('employeeId', '==', userData.id),
          where('date', '==', today)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docRef = querySnapshot.docs[0].ref;
          
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
          
          await axios.post('http://localhost:5000/api/attendance/update', {
            docId: docRef.id,
            ...updateData
          });
          
          console.log('✅ Check-out saved!');
          console.log('Employee:', userData.name);
          console.log('Time:', time);
          
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
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Employee Dashboard</h1>
        <div>
          <button 
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) loadAttendanceHistory();
            }} 
            style={styles.historyButton}
          >
            {showHistory ? 'Hide History' : 'My Attendance History'}
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </div>
      
      <div style={styles.content}>
        <div style={styles.leftPanel}>
          <div style={styles.userInfo}>
            <h2>Welcome, {user?.name}!</h2>
            <p>📧 {user?.email}</p>
          </div>
          
          {location && (
            <div style={styles.locationInfo}>
              <p>📍 Current Location:</p>
              <p>Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
              <p>🎯 Accuracy: ±{location.accuracy?.toFixed(1)}m</p>
              {currentDistance && currentFence && (
                <p>📏 Distance to {currentFence.name}: {currentDistance.toFixed(2)}m (Radius: {currentFence.radius}m)</p>
              )}
            </div>
          )}
          
          <div style={styles.fenceStatus}>
            {insideFence ? (
              <div style={styles.insideFence}>
                <h3>✅ Inside Geo-Fence: {currentFence?.name}</h3>
                <p>You are {currentDistance?.toFixed(2)}m from the center (Radius: {currentFence?.radius}m)</p>
                <p>You can mark your attendance!</p>
              </div>
            ) : (
              <div style={styles.outsideFence}>
                <h3>❌ Outside Geo-Fence</h3>
                <p>Please move to the designated area to mark attendance</p>
              </div>
            )}
          </div>
          
          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}
          
          <div style={styles.attendanceButtons}>
            <button 
              onClick={() => markAttendance('in')}
              disabled={attendanceStatus?.checkIn}
              style={{
                ...styles.checkInButton,
                opacity: attendanceStatus?.checkIn ? 0.5 : 1,
                backgroundColor: insideFence && !attendanceStatus?.checkIn ? '#28a745' : '#6c757d'
              }}
            >
              {attendanceStatus?.checkIn ? '✓ Checked In' : 'Check In'}
            </button>
            
            <button 
              onClick={() => markAttendance('out')}
              disabled={!attendanceStatus?.checkIn || attendanceStatus?.checkOut}
              style={{
                ...styles.checkOutButton,
                opacity: (!attendanceStatus?.checkIn || attendanceStatus?.checkOut) ? 0.5 : 1,
                backgroundColor: insideFence && attendanceStatus?.checkIn && !attendanceStatus?.checkOut ? '#dc3545' : '#6c757d'
              }}
            >
              {attendanceStatus?.checkOut ? '✓ Checked Out' : 'Check Out'}
            </button>
          </div>
          
          {attendanceStatus && (
            <div style={styles.attendanceInfo}>
              <h3>Today's Attendance</h3>
              <p>🕐 Check-in: {attendanceStatus.checkIn || 'Not checked in'}</p>
              <p>🕐 Check-out: {attendanceStatus.checkOut || 'Not checked out'}</p>
            </div>
          )}
        </div>
        
        <div style={styles.rightPanel}>
          <div style={styles.mapContainer}>
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
            
            <div style={styles.mapLegend}>
              <div><span style={styles.greenDot}></span> Your Location</div>
              <div><span style={styles.redDot}></span> Geo-Fence Center</div>
              <div><span style={styles.redCircle}></span> Geo-Fence Area</div>
              {insideFence && <div><span style={styles.greenCircle}></span> You are inside this fence</div>}
            </div>
          </div>
          
          <div style={styles.fencesList}>
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
                    ...styles.fenceCard,
                    backgroundColor: isInside ? '#d4edda' : '#f9f9f9',
                    border: isInside ? '2px solid #28a745' : '1px solid #ddd'
                  }}
                >
                  <strong>{fence.name}</strong>
                  <p>📍 Distance: {distance.toFixed(2)}m (Radius: {fence.radius}m)</p>
                  {isInside && <p style={styles.insideText}>✅ You are inside this fence!</p>}
                  {!isInside && distance > 0 && (
                    <p style={styles.outsideText}>❌ Need to move {Math.abs(distance - fence.radius).toFixed(2)}m closer</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attendance History Section */}
      {showHistory && (
        <div style={styles.historySection}>
          <h3>My Attendance History</h3>
          <div style={styles.historyList}>
            {attendanceHistory.length === 0 ? (
              <p>No attendance records found.</p>
            ) : (
              attendanceHistory.map((record) => (
                <div key={record.id} style={styles.historyCard}>
                  <div style={styles.historyDate}>
                    <strong>{record.date} ({record.dateString})</strong>
                  </div>
                  <div style={styles.historyTimes}>
                    <span>✅ Check In: {record.checkInTime}</span>
                    {record.checkOutTime && (
                      <span>❌ Check Out: {record.checkOutTime}</span>
                    )}
                  </div>
                  <div style={styles.historyLocation}>
                    📍 Fence: {record.fenceLocation?.name || 'N/A'}
                    {record.fenceLocation?.distance && (
                      <span> (Distance: {record.fenceLocation.distance.toFixed(2)}m)</span>
                    )}
                  </div>
                  <div style={styles.historyStatus}>
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f0f0'
  },
  header: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  historyButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px'
  },
  content: {
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '20px'
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  userInfo: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  locationInfo: {
    backgroundColor: '#e9ecef',
    padding: '15px',
    borderRadius: '8px'
  },
  fenceStatus: {
    marginBottom: '0'
  },
  insideFence: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  outsideFence: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  message: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  attendanceButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center'
  },
  checkInButton: {
    flex: 1,
    padding: '15px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  checkOutButton: {
    flex: 1,
    padding: '15px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  attendanceInfo: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  mapContainer: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  fencesList: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  fenceCard: {
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  insideText: {
    color: '#28a745',
    fontWeight: 'bold',
    marginTop: '5px'
  },
  outsideText: {
    color: '#dc3545',
    fontSize: '12px',
    marginTop: '5px'
  },
  mapLegend: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    display: 'flex',
    gap: '20px',
    fontSize: '12px',
    flexWrap: 'wrap'
  },
  greenDot: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    backgroundColor: '#00ff00',
    borderRadius: '50%',
    marginRight: '5px'
  },
  redDot: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    backgroundColor: '#ff0000',
    borderRadius: '50%',
    marginRight: '5px'
  },
  redCircle: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid #ff0000',
    borderRadius: '50%',
    marginRight: '5px',
    backgroundColor: 'rgba(255,0,0,0.2)'
  },
  greenCircle: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid #00ff00',
    borderRadius: '50%',
    marginRight: '5px',
    backgroundColor: 'rgba(0,255,0,0.2)'
  },
  historySection: {
    margin: '20px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  historyList: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  historyCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '10px',
    backgroundColor: '#f9f9f9'
  },
  historyDate: {
    fontSize: '16px',
    marginBottom: '10px',
    color: '#007bff'
  },
  historyTimes: {
    display: 'flex',
    gap: '20px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  historyLocation: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px'
  },
  historyStatus: {
    fontSize: '14px',
    fontWeight: 'bold'
  }
};

export default EmployeeDashboard;