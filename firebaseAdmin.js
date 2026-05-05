const admin = require('firebase-admin');

let credential;

if (process.env.NODE_ENV === 'production') {
  // In Cloud Run, load from environment variable
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  credential = admin.credential.cert(serviceAccount);
} else {
  // Locally, load from file
  const serviceAccount = require('./serviceAccountKey.json');
  credential = admin.credential.cert(serviceAccount);
}

admin.initializeApp({ credential });

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };