const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Initialize Firebase Admin SDK
// NOTE: You must download your Service Account Key from Firebase Console -> Project Settings -> Service Accounts
// and save it as 'serviceAccountKey.json' in the root directory.
let db = null;
try {
  if (fs.existsSync('./serviceAccountKey.json')) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("🔥 Firebase Admin Initialized");
  } else {
    console.warn("⚠️ 'serviceAccountKey.json' not found. Database features will be simulated.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

// --- Routes ---

// 1. Root Check
app.get('/', (req, res) => {
  res.send('SafeGuard AI Backend is Running');
});

// 2. Database Health Check (Used by App.tsx system status)
app.get('/health/db', async (req, res) => {
  if (!db) {
    return res.status(503).json({ database: 'disconnected', error: 'No Service Account' });
  }
  try {
    // Try to list collections to verify connection
    await db.listCollections();
    res.json({ database: 'connected' });
  } catch (error) {
    res.status(500).json({ database: 'error', details: error.message });
  }
});

// 3. Auto-Create Tables / Seed Data
// This endpoint receives the MOCK_DATA from the frontend and pushes it to Firestore.
// In Firestore, creating a document automatically "creates the table" (Collection).
app.post('/api/seed', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: "Database not connected. Add serviceAccountKey.json" });
  }

  const { users, vehicles, accidents, claims } = req.body;
  const batch = db.batch();
  let operationCount = 0;

  try {
    // Process Users
    if (users) {
      users.forEach(user => {
        const ref = db.collection('users').doc(user.id);
        batch.set(ref, user, { merge: true }); // merge: true prevents overwriting existing fields if they exist
        operationCount++;
      });
    }

    // Process Vehicles
    if (vehicles) {
      vehicles.forEach(vehicle => {
        const ref = db.collection('vehicles').doc(vehicle.id);
        batch.set(ref, vehicle, { merge: true });
        operationCount++;
      });
    }

    // Process Accidents
    if (accidents) {
      accidents.forEach(accident => {
        const ref = db.collection('accidents').doc(accident.id);
        batch.set(ref, accident, { merge: true });
        operationCount++;
      });
    }

    // Process Claims
    if (claims) {
      claims.forEach(claim => {
        const ref = db.collection('claims').doc(claim.id);
        batch.set(ref, claim, { merge: true });
        operationCount++;
      });
    }

    // Commit the batch
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: `Successfully synced ${operationCount} records to Firebase. Tables created automatically.`,
      count: operationCount
    });
  } catch (error) {
    console.error("Seed Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});