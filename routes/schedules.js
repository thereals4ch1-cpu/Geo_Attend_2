const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');

const DEFAULT_TEMPLATE = 'Hello {{employeeName}}, you are scheduled at {{destination}} on {{scheduledAt}}. Stay there for {{durationMinutes}} minutes (until {{expectedEndTime}}).';

function fillTemplate(template, values) {
    let content = template;
    Object.entries(values).forEach(([key, value]) => {
        const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(pattern, String(value ?? ''));
    });
    return content;
}

// Create a schedule
router.post('/', async (req, res) => {
    try {
        const { employeeId, destination, scheduledTime, durationMinutes, messageTemplate } = req.body;

        if (!employeeId || !destination || !scheduledTime || !durationMinutes) {
            return res.status(400).json({ error: 'employeeId, destination, scheduledTime and durationMinutes are required' });
        }

        const duration = Number(durationMinutes);
        if (!Number.isFinite(duration) || duration <= 0) {
            return res.status(400).json({ error: 'durationMinutes must be a positive number' });
        }

        const scheduledAt = new Date(scheduledTime);
        if (Number.isNaN(scheduledAt.getTime())) {
            return res.status(400).json({ error: 'Invalid scheduledTime value' });
        }

        const expectedEndTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);
        const employeeDoc = await db.collection('users').doc(employeeId).get();
        const employee = employeeDoc.exists ? employeeDoc.data() : {};

        const docRef = await db.collection('schedules').add({
            employeeId,
            employeeName: employee.name || employee.email || employeeId,
            destination,
            scheduledTime: scheduledAt,
            durationMinutes: duration,
            expectedEndTime,
            createdAt: new Date()
        });

        let messageSent = false;
        let messageError = null;

        try {
            const token = process.env.TEXTIT_AUTH_TOKEN;
            const employeePhone = employee.phone || employee.mobile || employee.phoneNumber;

            if (!token) {
                messageError = 'TEXTIT_AUTH_TOKEN is not configured on backend.';
            } else if (!employeePhone) {
                messageError = 'Employee phone number missing. Save phone/mobile/phoneNumber in users collection.';
            } else {
                const template = (messageTemplate && String(messageTemplate).trim())
                    || process.env.TEXTIT_SCHEDULE_TEMPLATE
                    || DEFAULT_TEMPLATE;

                const messageText = fillTemplate(template, {
                    employeeName: employee.name || 'Employee',
                    destination,
                    scheduledAt: scheduledAt.toLocaleString(),
                    durationMinutes: duration,
                    expectedEndTime: expectedEndTime.toLocaleString()
                });

                const apiUrl = process.env.TEXTIT_API_URL || 'https://api.textit.biz';
                const response = await fetch(`${apiUrl}/api/v2/broadcasts.json`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: messageText,
                        urns: [`tel:${employeePhone}`]
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`TextIt error ${response.status}: ${errorText}`);
                }

                messageSent = true;
            }
        } catch (notifyError) {
            messageError = notifyError.message;
        }

        res.status(201).json({
            message: 'Schedule created successfully',
            id: docRef.id,
            messageSent,
            messageError
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get schedules for an employee
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const schedulesSnapshot = await db.collection('schedules')
            .where('employeeId', '==', employeeId)
            .orderBy('scheduledTime', 'desc')
            .get();
        
        const schedules = [];
        schedulesSnapshot.forEach((docSnap) => {
            schedules.push({ ...docSnap.data(), id: docSnap.id });
        });
        
        res.json(schedules);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all schedules (for admin)
router.get('/all', async (req, res) => {
    try {
        const schedulesSnapshot = await db.collection('schedules')
            .orderBy('scheduledTime', 'desc')
            .get();
        
        const schedules = [];
        schedulesSnapshot.forEach((docSnap) => {
            schedules.push({ ...docSnap.data(), id: docSnap.id });
        });
        
        res.json(schedules);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a schedule using POST — works everywhere (some setups block DELETE and return 404)
router.post('/delete/:scheduleId', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        if (!scheduleId) {
            return res.status(400).json({ error: 'scheduleId is required' });
        }

        await db.collection('schedules').doc(scheduleId).delete();
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update a schedule (for admin)
router.put('/:scheduleId', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { employeeId, destination, scheduledTime, durationMinutes } = req.body;

        if (!employeeId || !destination || !scheduledTime || !durationMinutes) {
            return res.status(400).json({ error: 'employeeId, destination, scheduledTime and durationMinutes are required' });
        }

        const duration = Number(durationMinutes);
        if (!Number.isFinite(duration) || duration <= 0) {
            return res.status(400).json({ error: 'durationMinutes must be a positive number' });
        }

        const scheduledAt = new Date(scheduledTime);
        if (Number.isNaN(scheduledAt.getTime())) {
            return res.status(400).json({ error: 'Invalid scheduledTime value' });
        }

        const expectedEndTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);
        const employeeDoc = await db.collection('users').doc(employeeId).get();
        const employee = employeeDoc.exists ? employeeDoc.data() : {};

        await db.collection('schedules').doc(scheduleId).update({
            employeeId,
            employeeName: employee.name || employee.email || employeeId,
            destination,
            scheduledTime: scheduledAt,
            durationMinutes: duration,
            expectedEndTime,
            updatedAt: new Date()
        });

        res.json({ message: 'Schedule updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a schedule (for admin)
router.delete('/:scheduleId', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        await db.collection('schedules').doc(scheduleId).delete();
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
