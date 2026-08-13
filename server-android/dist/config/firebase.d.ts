import admin from 'firebase-admin';
/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
export declare const initializeFirebase: () => void;
/**
 * Get Firestore database instance
 */
export declare const getFirestore: () => admin.firestore.Firestore;
export { admin };
//# sourceMappingURL=firebase.d.ts.map