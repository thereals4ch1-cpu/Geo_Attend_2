import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import UserManagement from './components/UserManagement';
import UserProfile from './components/UserProfile';
import AttendanceHistory from './components/AttendanceHistory';

function App() {
  // Listen for FCM messages
  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    // Show notification
    if (Notification.permission === 'granted') {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/vite.svg' // or your icon
      });
    }
  });

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/attendance-history" element={<AttendanceHistory />} />
        <Route path="/attendance-history/:userId" element={<AttendanceHistory />} />
      </Routes>
    </Router>
  );
}

export default App;
