"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.getFirestore = exports.initializeFirebase = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
exports.admin = firebase_admin_1.default;
let db;
/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
const initializeFirebase = () => {
    try {
        // Parse private key (handle escaped newlines)
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        db = firebase_admin_1.default.firestore();
        // Configure Firestore to ignore undefined properties
        db.settings({ ignoreUndefinedProperties: true });
        console.log('✅ Firebase initialized successfully');
    }
    catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        throw error;
    }
};
exports.initializeFirebase = initializeFirebase;
/**
 * Get Firestore database instance
 */
const getFirestore = () => {
    if (!db) {
        throw new Error('Firestore not initialized. Call initializeFirebase() first.');
    }
    return db;
};
exports.getFirestore = getFirestore;
//# sourceMappingURL=firebase.js.map