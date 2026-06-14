const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

let useFirestore = false;
let db = null;

// Determine if we have Firebase service account credentials in environment
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
const hasEnvConfig = process.env.FIREBASE_PROJECT_ID && 
                     process.env.FIREBASE_CLIENT_EMAIL && 
                     process.env.FIREBASE_PRIVATE_KEY;

// Local JSON File Helper functions
const localDbPath = path.join(__dirname, 'local_firestore_db.json');

const readLocalDb = () => {
  if (!fs.existsSync(localDbPath)) {
    return {};
  }
  try {
    const data = fs.readFileSync(localDbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading local Firestore DB file:", err);
    return {};
  }
};

const writeLocalDb = (data) => {
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing local Firestore DB file:", err);
  }
};

// --- Mock Firestore SDK Classes ---
class MockDocumentSnapshot {
  constructor(id, data) {
    this.id = id;
    this._data = data;
    this.exists = data !== undefined && data !== null;
  }
  data() {
    return this._data ? { ...this._data } : undefined;
  }
}

class MockQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
  }
  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class MockDocumentReference {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId.toString();
  }
  async get() {
    const dbData = readLocalDb();
    const docData = dbData[this.collectionName]?.[this.id];
    return new MockDocumentSnapshot(this.id, docData);
  }
  async set(data, options = {}) {
    const dbData = readLocalDb();
    if (!dbData[this.collectionName]) dbData[this.collectionName] = {};
    
    if (options.merge) {
      dbData[this.collectionName][this.id] = {
        ...dbData[this.collectionName][this.id],
        ...data
      };
    } else {
      dbData[this.collectionName][this.id] = { ...data };
    }
    writeLocalDb(dbData);
  }
  async update(data) {
    const dbData = readLocalDb();
    if (!dbData[this.collectionName] || !dbData[this.collectionName][this.id]) {
      throw new Error(`Document ${this.id} does not exist in collection ${this.collectionName}`);
    }
    dbData[this.collectionName][this.id] = {
      ...dbData[this.collectionName][this.id],
      ...data
    };
    writeLocalDb(dbData);
  }
  async delete() {
    const dbData = readLocalDb();
    if (dbData[this.collectionName] && dbData[this.collectionName][this.id]) {
      delete dbData[this.collectionName][this.id];
      writeLocalDb(dbData);
    }
  }
}

class MockQuery {
  constructor(collectionName, filters = [], orderByField = null, orderDirection = 'asc') {
    this.collectionName = collectionName;
    this.filters = filters;
    this.orderByField = orderByField;
    this.orderDirection = orderDirection;
  }
  where(field, operator, value) {
    return new MockQuery(
      this.collectionName,
      [...this.filters, { field, operator, value }],
      this.orderByField,
      this.orderDirection
    );
  }
  orderBy(field, direction = 'asc') {
    return new MockQuery(this.collectionName, this.filters, field, direction);
  }
  async get() {
    const dbData = readLocalDb();
    const collection = dbData[this.collectionName] || {};
    let docs = Object.keys(collection).map(id => ({ id, data: collection[id] }));

    // Apply filters
    for (const filter of this.filters) {
      docs = docs.filter(doc => {
        const val = doc.data?.[filter.field];
        if (filter.operator === '==') return val === filter.value;
        if (filter.operator === '!=') return val !== filter.value;
        if (filter.operator === '>') return val > filter.value;
        if (filter.operator === '<') return val < filter.value;
        if (filter.operator === '>=') return val >= filter.value;
        if (filter.operator === '<=') return val <= filter.value;
        return true;
      });
    }

    // Apply sorting
    if (this.orderByField) {
      docs.sort((a, b) => {
        const valA = a.data?.[this.orderByField];
        const valB = b.data?.[this.orderByField];
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (valA < valB) return this.orderDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.orderDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const docSnapshots = docs.map(doc => new MockDocumentSnapshot(doc.id, doc.data));
    return new MockQuerySnapshot(docSnapshots);
  }
}

class MockCollectionReference extends MockQuery {
  constructor(collectionName) {
    super(collectionName);
  }
  doc(docId) {
    const id = docId !== undefined && docId !== null ? docId.toString() : uuidv4();
    return new MockDocumentReference(this.collectionName, id);
  }
  async add(data) {
    const id = uuidv4();
    const docRef = this.doc(id);
    await docRef.set(data);
    return docRef;
  }
}

class MockFirestore {
  collection(collectionName) {
    return new MockCollectionReference(collectionName);
  }
}

// Initialize real Firebase Admin or mock
try {
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    db = getFirestore();
    useFirestore = true;
    console.log("Firebase Firestore integration initialized via service account file");
  } else if (hasEnvConfig) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    });
    db = getFirestore();
    useFirestore = true;
    console.log("Firebase Firestore integration initialized via env variables");
  } else {
    db = new MockFirestore();
    console.log("Firebase config missing, using local MockFirestore database");
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin SDK, falling back to MockFirestore:", err);
  db = new MockFirestore();
}

// Public Trip sharing compatibility wrappers (kept for back-compat)
const savePublicTrip = async (trip) => {
  const publicTrip = {
    tripId: trip.tripId,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    budget: trip.budget,
    description: trip.description,
    username: trip.username || 'Anonymous',
    coverUrl: trip.coverUrl || null,
    itineraryCount: trip.itineraryCount || 0,
    sharedAt: new Date().toISOString()
  };

  try {
    await db.collection('public_trips').doc(trip.tripId.toString()).set(publicTrip);
    console.log(`Saved trip ${trip.tripId} to public feed`);
  } catch (err) {
    console.error("Error sharing public trip:", err);
  }
};

const getPublicTrips = async () => {
  try {
    const snapshot = await db.collection('public_trips').orderBy('sharedAt', 'desc').get();
    const trips = [];
    snapshot.forEach(doc => {
      trips.push(doc.data());
    });
    return trips;
  } catch (err) {
    console.error("Error fetching public trips:", err);
    return [];
  }
};

module.exports = {
  admin,
  db,
  useFirestore,
  savePublicTrip,
  getPublicTrips
};
