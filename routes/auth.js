const express = require('express');
const router = express.Router();
const { db, auth } = require('../firebaseAdmin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Signup route
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        
        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name
        });
        
        // Store additional user data in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            name,
            email,
            role, // 'admin' or 'employee'
            createdAt: new Date()
        });
        
        res.status(201).json({ message: 'User created successfully', uid: userRecord.uid });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get user from Firestore by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();
        
        if (usersSnapshot.empty) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Create JWT token
        const token = jwt.sign(
            { userId: userDoc.id, email: userData.email, role: userData.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                role: userData.role
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
