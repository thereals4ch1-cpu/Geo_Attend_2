const dotenv = require('dotenv');
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { admin, db } = require('./firebaseAdmin');

const DEFAULT_TEMPLATE = 'Hello {{employeeName}}, you are scheduled at {{destination}} on {{scheduledAt}}. Stay there for {{durationMinutes}} minutes (until {{expectedEndTime}}).';
const TEXTIT_API_URL = process.env.TEXTIT_API_URL || 'https://api.textit.biz';
const TEXTIT_AUTH_TOKEN = process.env.TEXTIT_AUTH_TOKEN || '1684gkd1611346bc6dtd41cadh5764';

function fillTemplate(template, values) {
    let content = template;
    Object.entries(values).forEach(([key, value]) => {
        const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(pattern, String(value ?? ''));
    });
    return content;
}

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

// Schedule SMS notifications 24 hours before
cron.schedule('*/5 * * * *', async () => { // Run every 5 minutes
    try {
        const now = new Date();
        
        const schedulesSnapshot = await db.collection('schedules')
            .where('notificationSent', '==', false)
            .where('notificationTime', '<=', now)
            .get();
        
        for (const doc of schedulesSnapshot.docs) {
            const schedule = doc.data();
            const employeeDoc = await db.collection('users').doc(schedule.employeeId).get();
            const employee = employeeDoc.exists ? employeeDoc.data() : {};
            
            const employeePhone = employee.phone || employee.mobile || employee.phoneNumber;
            const token = process.env.TEXTIT_AUTH_TOKEN || '1684gkd1611346bc6dtd41cadh5764';
            
            if (employeePhone && token) {
                try {
                    const messageText = fillTemplate(DEFAULT_TEMPLATE, {
                        employeeName: schedule.employeeName || 'Employee',
                        destination: schedule.destination,
                        scheduledAt: schedule.scheduledTime.toDate().toLocaleString(),
                        durationMinutes: schedule.durationMinutes,
                        expectedEndTime: schedule.expectedEndTime.toDate().toLocaleString()
                    });
                    
                    const response = await fetch(`${TEXTIT_API_URL}/api/v2/broadcasts.json`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Token ${TEXTIT_AUTH_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            text: messageText,
                            urns: [`tel:${employeePhone}`]
                        })
                    });
                    
                    if (response.ok) {
                        await db.collection('schedules').doc(doc.id).update({
                            notificationSent: true,
                            notificationSentAt: new Date()
                        });
                        console.log('SMS sent to', employeePhone, 'for schedule', doc.id);
                    } else {
                        console.error('Failed to send SMS for schedule', doc.id, 'status:', response.status);
                    }
                } catch (error) {
                    console.error('Error sending SMS for schedule', doc.id, error);
                }
            } else {
                console.log('Missing phone or token for employee', schedule.employeeId);
            }
        }
    } catch (error) {
        console.error('Error in SMS scheduler:', error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});