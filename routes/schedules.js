const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');

// Create a schedule
router.post('/', async (req, res) => {
    try {
        const { employeeId, destination, scheduledTime } = req.body;
        
        const docRef = await db.collection('schedules').add({
            employeeId,
            destination,
            scheduledTime: new Date(scheduledTime),
            createdAt: new Date()
        });
        
        res.status(201).json({ message: 'Schedule created successfully', id: docRef.id });
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
        schedulesSnapshot.forEach((doc) => {
            schedules.push({ id: doc.id, ...doc.data() });
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
        schedulesSnapshot.forEach((doc) => {
            schedules.push({ id: doc.id, ...doc.data() });
        });
        
        res.json(schedules);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;