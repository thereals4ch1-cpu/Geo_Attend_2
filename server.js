const dotenv = require('dotenv');
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { admin, db } = require('./firebaseAdmin');

const app = express();

app.use(cors({
    origin: [
        'https://geoattend-92415.web.app',
        'https://geoattend-92415.firebaseapp.com',
        'http://localhost:5173',
        'http://localhost:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const schedulesRoutes = require('./routes/schedules');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schedules', schedulesRoutes);

// Schedule notifications
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        const schedulesSnapshot = await db.collection('schedules')
            .where('scheduledTime', '>=', now)
            .where('scheduledTime', '<=', oneHourLater)
            .get();
        
        for (const doc of schedulesSnapshot.docs) {
            const schedule = doc.data();
            const scheduledTime = schedule.scheduledTime.toDate();
            const diff = (scheduledTime - now) / (1000 * 60);
            
            if (Math.abs(diff - 60) <= 1) {
                const tokenDoc = await db.collection('userTokens').doc(schedule.employeeId).get();
                if (tokenDoc.exists) {
                    const token = tokenDoc.data().token;
                    
                    const message = {
                        notification: {
                            title: 'Scheduled Departure Reminder',
                            body: `You have a scheduled trip to ${schedule.destination} at ${scheduledTime.toLocaleTimeString()}.`
                        },
                        token: token
                    };
                    
                    await admin.messaging().send(message);
                    console.log('Notification sent to', schedule.employeeId);
                }
            }
        }
    } catch (error) {
        console.error('Error in notification scheduler:', error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});