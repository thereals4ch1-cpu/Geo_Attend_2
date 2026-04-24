import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import '../css/AdminDashboard.css';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBje4_Uub9kYDf4H237qQ1xmNktwmBMMuM';

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
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [destination, setDestination] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [schedules, setSchedules] = useState([]);
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

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/schedules/all');
      setSchedules(response.data);
    } catch (error) {
      console.error('Error loading schedules:', error);
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

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !destination || !scheduledTime) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      await axios.post('http://localhost:5000/api/schedules', {
        employeeId: selectedUser,
        destination,
        scheduledTime
      });
      
      alert('✅ Schedule created successfully!');
      setSelectedUser('');
      setDestination('');
      setScheduledTime('');
      loadSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('❌ Error creating schedule: ' + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  function MapClickHandler() {
    useMapEvent('click', handleMapClick);
    return null;
  }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadFences();
    loadUsers();
    loadSchedules();
    getCurrentLocation();
  }, [navigate]);

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard - Geo-Fence Manager</h1>
        <div>
          <button 
            onClick={() => navigate('/user-management')} 
            className="admin-user-management-button"
          >
            User Management
          </button>
          <button 
            onClick={() => navigate('/profile')} 
            className="admin-profile-button"
          >
            My Profile
          </button>
              <button onClick={handleLogout} className="admin-logout-button">Logout</button>
        </div>
      </div>
      
      <div className="admin-content">
        <div className="admin-create-fence">
          <h2>Create Geo-Fence</h2>
          <form onSubmit={handleCreateFence}>
            <input
              type="text"
              placeholder="Fence Name (e.g., Office, Warehouse)"
              value={fenceName}
              onChange={(e) => setFenceName(e.target.value)}
              className="admin-input"
              required
            />
            <input
              type="number"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="admin-input"
              required
              step="any"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="admin-input"
              required
              step="any"
            />
            <input
              type="number"
              placeholder="Radius (meters) - Recommend 100-200m"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="admin-input"
              required
            />
            <button type="button" onClick={useCurrentLocation} className="admin-use-location-button">
              📍 Use My Current Location
            </button>
            <button type="submit" className="admin-create-button">Create Geo-Fence</button>
          </form>
          
          {userLocation && (
            <div className="admin-location-info">
              <p>📍 Your Current Location:</p>
              <p>Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}</p>
            </div>
          )}
        </div>
        
        <div className="admin-map-container">
          <h2>Map View</h2>
          <div style={{ height: '400px', width: '100%' }}>
            <MapContainer
              center={mapCenter}
              zoom={15}
              style={{ height: '100%', width: '100%', borderRadius: '8px' }}
            >
              <TileLayer
                url={`https://mt{s}.google.com/vt/lyrs=r&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_API_KEY}`}
                subdomains={['0', '1', '2', '3']}
                attribution='Map data ©2026 Google'
              />
              <MapClickHandler />
              
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
                          className="admin-popup-button"
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
          
          <div className="admin-map-legend">
            <div><span className="admin-green-dot"></span> Your Location</div>
            <div><span className="admin-red-dot"></span> Geo-Fence Center</div>
            <div><span className="admin-red-circle"></span> Geo-Fence Area</div>
            <div>💡 Click on map to select location</div>
          </div>
        </div>
      </div>
      
      <div className="admin-schedule-section">
        <h2>Schedule Destinations</h2>
        <form onSubmit={handleCreateSchedule}>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="admin-input"
            required
          >
            <option value="">Select Employee</option>
            {users.filter(user => user.role === 'employee').map(user => (
              <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Destination (e.g., Katunayake Airport)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="admin-input"
            required
          />
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="admin-input"
            required
          />
          <button type="submit" className="admin-create-button">Schedule Trip</button>
        </form>
        
        <div className="admin-schedules-list">
          <h3>Scheduled Trips</h3>
          {schedules.length === 0 ? (
            <p>No schedules yet.</p>
          ) : (
            schedules.map(schedule => (
              <div key={schedule.id} className="admin-schedule-card">
                <p><strong>Employee:</strong> {users.find(u => u.id === schedule.employeeId)?.name || schedule.employeeId}</p>
                <p><strong>Destination:</strong> {schedule.destination}</p>
                <p><strong>Time:</strong> {new Date(schedule.scheduledTime).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="admin-fences-list">
        <h2>Existing Geo-Fences</h2>
        <div className="admin-fences-grid">
          {fences.length === 0 ? (
            <p>No geo-fences created yet. Create one above!</p>
          ) : (
            fences.map((fence) => (
              <div key={fence.id} className="admin-fence-card">
                <h3>{fence.name}</h3>
                <p>📍 {fence.latitude.toFixed(6)}, {fence.longitude.toFixed(6)}</p>
                <p>📏 Radius: {fence.radius} meters</p>
                <p>👤 Created by: {fence.createdBy}</p>
                <button 
                  onClick={() => {
                    setMapCenter([fence.latitude, fence.longitude]);
                    setSelectedFence(fence);
                  }}
                  className="admin-view-button"
                >
                  View on Map
                </button>
                <button 
                  onClick={() => handleDeleteFence(fence.id)}
                  className="admin-delete-button"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;