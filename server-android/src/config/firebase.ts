import admin from 'firebase-admin';

let db: admin.firestore.Firestore;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
export const initializeFirebase = (): void => {
  try {
    if (admin.apps.length > 0) {
      db = admin.firestore();
      return;
    }

    // Parse private key (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.warn('⚠️ Firebase credentials incomplete in environment. Running in fallback mode.');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase initialization warning (running in fallback mode):', error instanceof Error ? error.message : error);
  }
};

/**
 * Get Firestore database instance
 */
export const getFirestore = (): admin.firestore.Firestore => {
  if (!db) {
    throw new Error('Firestore not initialized. Call initializeFirebase() first.');
  }
  return db;
};

export { admin };
