const { v4: uuid } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { getAuth } = require("firebase-admin/auth");
const { admin, db, useFirestore } = require('../config/firebase');
const { OAuth2Client } = require('google-auth-library');
require("dotenv").config();
const saltRounds = 10;

const register = async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
        res.status(400).json({ error: "Fields cannot be empty!" });
        return;
    }

    try {
        if (useFirestore) {
            // Live Firebase Auth and Firestore flow
            // 1. Create user in Firebase Authentication
            const auth = getAuth();
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: username
            });

            const userId = userRecord.uid;

            // 2. Save additional user meta to Firestore users collection
            await db.collection("users").doc(userId).set({
                userId,
                email,
                username,
                createdAt: new Date().toISOString()
            });

            // 3. Set custom user claims so token contains userId and username
            await auth.setCustomUserClaims(userId, {
                userId,
                username
            });

            return res.status(201).json({ message: "User created successfully!" });
        } else {
            // Mock Firestore / local JWT flow
            // Check if user with the same email already exists
            const emailSnapshot = await db.collection("users").where("email", "==", email).get();
            if (!emailSnapshot.empty) {
                return res.status(500).json({ message: "There is already a user created with this email" });
            }

            // Check if user with the same username already exists
            const usernameSnapshot = await db.collection("users").where("username", "==", username).get();
            if (!usernameSnapshot.empty) {
                return res.status(500).json({ message: "There is already a user created with this username" });
            }

            bcrypt.genSalt(saltRounds, (err, salt) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                bcrypt.hash(password, salt, async (err, hashedPassword) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    const userId = uuid();
                    const user = {
                        userId,
                        email,
                        username,
                        password: hashedPassword,
                    };

                    try {
                        await db.collection("users").doc(userId).set(user);
                        return res.status(201).json({ message: "User created successfully!" });
                    } catch (error) {
                        return res.status(500).json({ error: error.message });
                    }
                });
            });
        }
    } catch (error) {
        console.error("Register controller error:", error);
        if (error.code && error.code.startsWith("auth/")) {
            let message = error.message || "Authentication error";
            if (error.code === "auth/email-already-exists") {
                message = "The email address is already in use by another account.";
            } else if (error.code === "auth/invalid-email") {
                message = "The email address is badly formatted.";
            } else if (error.code === "auth/weak-password") {
                message = "The password must be at least 6 characters.";
            }
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: error.message || "Registration failed" });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email or Password fields cannot be empty!" });
        return;
    }

    try {
        if (useFirestore) {
            // Live Firebase Auth flow
            // Use the Firebase Auth REST API to sign in the user with email/password
            const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
            if (!firebaseApiKey) {
                return res.status(500).json({ message: "Firebase Web API key not configured on server (need FIREBASE_API_KEY or GOOGLE_PLACES_API_KEY in .env)" });
            }

            try {
                const response = await axios.post(
                    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
                    {
                        email,
                        password,
                        returnSecureToken: true
                    }
                );

                const { idToken, localId } = response.data;

                // Ensure the user document exists in Firestore and custom claims are set
                const userDoc = await db.collection("users").doc(localId).get();
                let username = email.split('@')[0]; // fallback
                if (userDoc.exists) {
                    username = userDoc.data().username || username;
                }

                // Set custom claims
                const auth = getAuth();
                await auth.setCustomUserClaims(localId, {
                    userId: localId,
                    username: username
                });

                return res.status(200).json({
                    token: idToken,
                    message: "Login successful"
                });
            } catch (authError) {
                console.error("Firebase auth REST API error:", authError.response?.data || authError.message);
                const errData = authError.response?.data?.error;
                let errMsg = "Incorrect email or password";
                if (errData && errData.message === "EMAIL_NOT_FOUND") {
                    errMsg = "User doesn't exist";
                } else if (errData && errData.message === "INVALID_PASSWORD") {
                    errMsg = "Incorrect password!";
                } else if (errData && errData.message === "USER_DISABLED") {
                    errMsg = "This user account has been disabled";
                }
                return res.status(401).json({ message: errMsg });
            }
        } else {
            // Mock Firestore / local JWT flow
            // Query users by email in Firestore
            const snapshot = await db.collection("users").where("email", "==", email).get();
            
            let userFound = null;
            if (!snapshot.empty) {
                userFound = snapshot.docs[0].data();
            }

            if (userFound) {
                const validate = await bcrypt.compare(password, userFound.password);

                if (validate) {
                    // Generate JWT token
                    const token = jwt.sign(
                        {
                            userId: userFound.userId,
                            email: userFound.email,
                            username: userFound.username
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: '7d' }
                    );

                    return res.status(200).json({
                        token: token,
                        message: "Login successful"
                    });
                } else {
                    return res.status(401).json({ message: "Incorrect password!" });
                }
            } else {
                return res.status(404).json({ message: "User doesn't exist" });
            }
        }
    } catch (err) {
        console.error("Login controller error:", err);
        return res.status(500).json({ error: err.message });
    }
};

const logout = async (req, res) => {
    try {
        return res.status(200).json({ message: "Logout successful. Please remove token from client." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const googleLogin = async (req, res) => {
    const { idToken, email, username } = req.body;

    let targetEmail = email;
    let targetUsername = username;

    try {
        if (idToken && !idToken.startsWith("mock-")) {
            const googleClientId = process.env.GOOGLE_WEB_CLIENT_ID;
            if (!googleClientId) {
                console.error("GOOGLE_WEB_CLIENT_ID not configured in backend environment");
                return res.status(500).json({ error: "Google client ID not configured on server" });
            }

            const client = new OAuth2Client(googleClientId);
            const ticket = await client.verifyIdToken({
                idToken: idToken,
                audience: googleClientId
            });
            const payload = ticket.getPayload();
            targetEmail = payload.email;
            targetUsername = payload.name || payload.given_name || targetEmail.split('@')[0];
        }
    } catch (verifyError) {
        console.error("Google ID Token verification failed:", verifyError.message);
        return res.status(401).json({ error: "Invalid Google ID token" });
    }

    if (!targetEmail) {
        return res.status(400).json({ error: "Email is required" });
    }

    const fallbackUsername = targetUsername || targetEmail.split('@')[0];

    try {
        if (useFirestore) {
            // Live Firebase Auth flow
            const auth = getAuth();
            let userId;

            // 1. Get or Create user in Firebase Authentication
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(targetEmail);
                userId = userRecord.uid;
            } catch (err) {
                if (err.code === 'auth/user-not-found') {
                    userRecord = await auth.createUser({
                        email: targetEmail,
                        displayName: fallbackUsername
                    });
                    userId = userRecord.uid;
                } else {
                    throw err;
                }
            }

            // 2. Ensure user meta is saved in Firestore
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) {
                await db.collection("users").doc(userId).set({
                    userId,
                    email: targetEmail,
                    username: fallbackUsername,
                    createdAt: new Date().toISOString()
                });
            }

            // 3. Set custom claims so authMiddleware receives userId and username
            const resolvedUsername = userDoc.exists ? userDoc.data().username : fallbackUsername;
            await auth.setCustomUserClaims(userId, {
                userId,
                username: resolvedUsername
            });

            // 4. Exchange Firebase Custom Token for a Firebase ID Token using Firebase REST API
            const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
            if (!firebaseApiKey) {
                return res.status(500).json({ message: "Firebase Web API key not configured on server" });
            }

            const customToken = await auth.createCustomToken(userId);
            
            const response = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`,
                {
                    token: customToken,
                    returnSecureToken: true
                }
            );

            const realIdToken = response.data.idToken;

            return res.status(200).json({
                token: realIdToken,
                message: "Google sign-in successful"
            });

        } else {
            // Mock Firestore / local JWT flow
            // 1. Find or create user document in local MockFirestore
            const snapshot = await db.collection("users").where("email", "==", targetEmail).get();
            
            let userFound = null;
            if (!snapshot.empty) {
                userFound = snapshot.docs[0].data();
            }

            if (!userFound) {
                const userId = uuid();
                userFound = {
                    userId,
                    email: targetEmail,
                    username: fallbackUsername
                };
                await db.collection("users").doc(userId).set(userFound);
            }

            // 2. Generate standard local JWT token
            const token = jwt.sign(
                {
                    userId: userFound.userId,
                    email: userFound.email,
                    username: userFound.username
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                token: token,
                message: "Google sign-in successful"
            });
        }
    } catch (err) {
        console.error("Google Login controller error:", err);
        return res.status(500).json({ error: err.message || "Failed to authenticate with Google" });
    }
};

module.exports = {
    register,
    login,
    logout,
    googleLogin
};