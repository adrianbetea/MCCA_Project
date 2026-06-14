const { getAuth } = require('firebase-admin/auth');
const { admin, useFirestore } = require('../config/firebase');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = async (req, res, next) => {
    // Get token from header
    const token = req.headers['authorization']?.split(' ')[1]; // Expected format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        if (useFirestore) {
            // Verify real Firebase ID Token
            const auth = getAuth();
            const decoded = await auth.verifyIdToken(token);
            req.user = {
                userId: decoded.uid,
                email: decoded.email,
                username: decoded.name || decoded.username || ''
            };
            next();
        } else {
            // Fallback for local testing MockFirestore (JWT)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        }
    } catch (error) {
        console.error("Token verification failed:", error.message);
        if (error.code === 'auth/id-token-expired' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = verifyToken;
