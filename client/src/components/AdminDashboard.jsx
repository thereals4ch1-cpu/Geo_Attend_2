import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
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

// Custom green icon for user location
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function AdminDashboard() {
  const [fenceName, setFenceName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [fences, setFences] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]);
  const [selectedFence, setSelectedFence] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [showAttendance, setShowAttendance] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showEmployees, setShowEmployees] = useState(false);
  const navigate = useNavigate();

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

  const loadEmployees = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const employeesData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.role === 'employee') {
          employeesData.push({ id: doc.id, ...userData });
        }
      });
      setEmployees(employeesData);
      console.log('Loaded employees:', employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/attendance/all');
      setAttendanceRecords(response.data);
      console.log('Loaded attendance records:', response.data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setMapCenter([location.lat, location.lng]);
          setLatitude(location.lat.toString());
          setLongitude(location.lng.toString());
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please enable GPS.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    alert(`Location selected!\nLat: ${lat.toFixed(6)}\nLng: ${lng.toFixed(6)}`);
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          alert(`Location captured! Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location.');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleCreateFence = async (e) => {
    e.preventDefault();
    
    if (!fenceName || !latitude || !longitude || !radius) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await addDoc(collection(db, 'geoFences'), {
        name: fenceName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        createdBy: JSON.parse(localStorage.getItem('user')).name,
        createdAt: new Date()
      });
      
      alert('✅ Geo-fence created successfully!');
      setFenceName('');
      setLatitude('');
      setLongitude('');
      setRadius('100');
      loadFences();
    } catch (error) {
      console.error('Error creating fence:', error);
      alert('❌ Error creating geo-fence: ' + error.message);
    }
  };

  const handleDeleteFence = async (fenceId) => {
    if (window.confirm('Are you sure you want to delete this geo-fence?')) {
      try {
        await deleteDoc(doc(db, 'geoFences', fenceId));
        alert('✅ Geo-fence deleted successfully!');
        loadFences();
      } catch (error) {
        console.error('Error deleting fence:', error);
        alert('❌ Error deleting geo-fence');
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadFences();
    getCurrentLocation();
    loadEmployees();
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin Dashboard - Geo-Fence Manager</h1>
        <div>
          <button 
            onClick={() => {
              setShowEmployees(!showEmployees);
              if (!showEmployees) loadEmployees();
            }} 
            style={styles.employeesButton}
          >
            {showEmployees ? 'Hide Employees' : 'View Employees'}
          </button>
          <button 
            onClick={() => {
              setShowAttendance(!showAttendance);
              if (!showAttendance) loadAttendanceRecords();
            }} 
            style={styles.attendanceButton}
          >
            {showAttendance ? 'Hide Attendance' : 'View Attendance'}
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </div>
      
      <div style={styles.content}>
        <div style={styles.createFence}>
          <h2>Create Geo-Fence</h2>
          <form onSubmit={handleCreateFence}>
            <input
              type="text"
              placeholder="Fence Name (e.g., Office, Warehouse)"
              value={fenceName}
              onChange={(e) => setFenceName(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="number"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              style={styles.input}
              required
              step="any"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              style={styles.input}
              required
              step="any"
            />
            <input
              type="number"
              placeholder="Radius (meters) - Recommend 100-200m"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              style={styles.input}
              required
            />
            <button type="button" onClick={useCurrentLocation} style={styles.useLocationButton}>
              📍 Use My Current Location
            </button>
            <button type="submit" style={styles.createButton}>Create Geo-Fence</button>
          </form>
          
          {userLocation && (
            <div style={styles.locationInfo}>
              <p>📍 Your Current Location:</p>
              <p>Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}</p>
            </div>
          )}
        </div>
        
        <div style={styles.mapContainer}>
          <h2>Map View</h2>
          <div style={{ height: '400px', width: '100%' }}>
            <MapContainer
              center={mapCenter}
              zoom={15}
              style={{ height: '100%', width: '100%', borderRadius: '8px' }}
              onClick={handleMapClick}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={greenIcon}>
                  <Popup>Your Current Location</Popup>
                </Marker>
              )}
              
              {fences.map((fence) => (
                <React.Fragment key={fence.id}>
                  <Marker 
                    position={[fence.latitude, fence.longitude]}
                    eventHandlers={{
                      click: () => setSelectedFence(fence)
                    }}
                  >
                    <Popup>
                      <div>
                        <strong>{fence.name}</strong><br />
                        📍 {fence.latitude.toFixed(6)}, {fence.longitude.toFixed(6)}<br />
                        📏 Radius: {fence.radius}m<br />
                        <button 
                          onClick={() => handleDeleteFence(fence.id)}
                          style={styles.popupButton}
                        >
                          Delete
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[fence.latitude, fence.longitude]}
                    radius={fence.radius}
                    pathOptions={{
                      fillColor: '#ff0000',
                      fillOpacity: 0.2,
                      color: '#ff0000',
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
            <div>💡 Click on map to select location</div>
          </div>
        </div>
      </div>
      
      <div style={styles.fencesList}>
        <h2>Existing Geo-Fences</h2>
        <div style={styles.fencesGrid}>
          {fences.length === 0 ? (
            <p>No geo-fences created yet. Create one above!</p>
          ) : (
            fences.map((fence) => (
              <div key={fence.id} style={styles.fenceCard}>
                <h3>{fence.name}</h3>
                <p>📍 {fence.latitude.toFixed(6)}, {fence.longitude.toFixed(6)}</p>
                <p>📏 Radius: {fence.radius} meters</p>
                <p>👤 Created by: {fence.createdBy}</p>
                <button 
                  onClick={() => {
                    setMapCenter([fence.latitude, fence.longitude]);
                    setSelectedFence(fence);
                  }}
                  style={styles.viewButton}
                >
                  View on Map
                </button>
                <button 
                  onClick={() => handleDeleteFence(fence.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Employees Section */}
      {showEmployees && (
        <div style={styles.section}>
          <h2>Registered Employees</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.role}</td>
                    <td>{employee.createdAt?.toDate ? new Date(employee.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Records Section */}
      {showAttendance && (
        <div style={styles.section}>
          <h2>Attendance Records</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Email</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Fence Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.employeeName}</td>
                    <td>{record.employeeEmail}</td>
                    <td>{record.date}</td>
                    <td>{record.checkInTime}</td>
                    <td>{record.checkOutTime || 'Not checked out'}</td>
                    <td>{record.fenceLocation?.name || 'N/A'}</td>
                    <td style={{
                      color: record.status === 'completed' ? 'green' : 'orange',
                      fontWeight: 'bold'
                    }}>
                      {record.status === 'completed' ? '✅ Completed' : '🟡 Active'}
                    </td>
                  </tr>
                ))}
                {attendanceRecords.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No attendance records found</td>
                  </tr>
                )}
              </tbody>
            </table>
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
    backgroundColor: '#007bff',
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
    cursor: 'pointer',
    marginLeft: '10px'
  },
  attendanceButton: {
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px'
  },
  employeesButton: {
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
  createFence: {
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
    margin: '20px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  fencesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  input: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  createButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  useLocationButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  locationInfo: {
    marginTop: '20px',
    padding: '10px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px'
  },
  fenceCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#f9f9f9'
  },
  viewButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px'
  },
  deleteButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  popupButton: {
    marginTop: '8px',
    padding: '5px 10px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
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
  section: {
    margin: '20px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '15px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f2f2f2'
  }
};

export default AdminDashboard;