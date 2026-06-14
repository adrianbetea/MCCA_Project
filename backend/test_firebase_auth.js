const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

try {
  const serviceAccount = require(require('path').resolve(serviceAccountPath));
  if (admin.getApps().length === 0) {
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
  }
  
  const auth = getAuth();
  console.log("auth object retrieved successfully:", typeof auth);
  console.log("auth.createUser is a function:", typeof auth.createUser === 'function');
  console.log("auth.verifyIdToken is a function:", typeof auth.verifyIdToken === 'function');
  console.log("auth.setCustomUserClaims is a function:", typeof auth.setCustomUserClaims === 'function');
} catch (err) {
  console.error("Auth test failed:", err);
}
