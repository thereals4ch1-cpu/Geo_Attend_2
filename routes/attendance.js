const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');

// Update attendance with check-out time
router.post('/update', async (req, res) => {
    try {
        const { docId, checkOutTime, checkOutLocation } = req.body;
        
        await db.collection('attendance').doc(docId).update({
            checkOutTime: checkOutTime,
            checkOutLocation: checkOutLocation,
            checkOutTimestamp: new Date(),
            updatedAt: new Date()
        });
        
        res.json({ 
            message: 'Check-out recorded successfully',
            docId: docId,
            checkOutTime: checkOutTime
        });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get attendance records for an employee
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const attendanceSnapshot = await db.collection('attendance')
            .where('employeeId', '==', employeeId)
            .get();
        
        const records = [];
        attendanceSnapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
        });

        records.sort((a, b) => {
            if (a.date === b.date) {
                const aTime = a.checkInTimestamp ? (a.checkInTimestamp.toDate ? a.checkInTimestamp.toDate() : new Date(a.checkInTimestamp)) : new Date(0);
                const bTime = b.checkInTimestamp ? (b.checkInTimestamp.toDate ? b.checkInTimestamp.toDate() : new Date(b.checkInTimestamp)) : new Date(0);
                return bTime - aTime;
            }
            return b.date.localeCompare(a.date);
        });
        
        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(400).json({ error: error.message });
    }
});

// Backwards-compatible alias for older frontend code
router.get('/user/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const attendanceSnapshot = await db.collection('attendance')
            .where('employeeId', '==', employeeId)
            .get();
        
        const records = [];
        attendanceSnapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
        });

        records.sort((a, b) => {
            if (a.date === b.date) {
                const aTime = a.checkInTimestamp ? (a.checkInTimestamp.toDate ? a.checkInTimestamp.toDate() : new Date(a.checkInTimestamp)) : new Date(0);
                const bTime = b.checkInTimestamp ? (b.checkInTimestamp.toDate ? b.checkInTimestamp.toDate() : new Date(b.checkInTimestamp)) : new Date(0);
                return bTime - aTime;
            }
            return b.date.localeCompare(a.date);
        });
        
        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get all attendance records (for admin)
router.get('/all', async (req, res) => {
    try {
        const attendanceSnapshot = await db.collection('attendance').get();
        
        const records = [];
        attendanceSnapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
        });

        records.sort((a, b) => {
            if (a.date === b.date) {
                const aTime = a.checkInTimestamp ? (a.checkInTimestamp.toDate ? a.checkInTimestamp.toDate() : new Date(a.checkInTimestamp)) : new Date(0);
                const bTime = b.checkInTimestamp ? (b.checkInTimestamp.toDate ? b.checkInTimestamp.toDate() : new Date(b.checkInTimestamp)) : new Date(0);
                return bTime - aTime;
            }
            return b.date.localeCompare(a.date);
        });
        
        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;