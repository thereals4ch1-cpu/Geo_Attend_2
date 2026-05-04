const express = require('express');
const router = express.Router();
const { db, auth } = require('../firebaseAdmin');
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function authorizeAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
}

// Signup route
router.post('/signup', authenticateToken, authorizeAdmin, async (req, res) => {
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

// Google auth helper route: only sign in existing registered users
router.post('/google-signin', async (req, res) => {
    try {
        const { uid, email } = req.body;

        if (!uid || !email) {
            return res.status(400).json({ error: 'Google user UID and email are required' });
        }

        let userRef = db.collection('users').doc(uid);
        let userDoc = await userRef.get();

        if (!userDoc.exists) {
            const usersSnapshot = await db.collection('users').where('email', '==', email).get();
            if (usersSnapshot.empty) {
                return res.status(401).json({ error: 'User not registered. Please contact an admin to create your account.' });
            }
            userDoc = usersSnapshot.docs[0];
            userRef = userDoc.ref;
        }

        const userData = userDoc.data();
        const token = jwt.sign(
            { userId: userRef.id, email: userData.email, role: userData.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            token,
            message: 'Google user authenticated successfully',
            user: {
                id: userRef.id,
                name: userData.name,
                email: userData.email,
                role: userData.role
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Register FCM token
router.post('/register-token', async (req, res) => {
    try {
        const { userId, token } = req.body;
        
        await db.collection('userTokens').doc(userId).set({
            token,
            updatedAt: new Date()
        });
        
        res.json({ message: 'Token registered successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
