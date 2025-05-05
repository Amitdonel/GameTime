// Firebase core
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// ✅ Auth with persistence for React Native
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDFLafHIwX_ftLKQScwIQ6OO9HB888vdIk",
  authDomain: "gametime-e5a48.firebaseapp.com",
  projectId: "gametime-e5a48",
  storageBucket: "gametime-e5a48.firebasestorage.app",
  messagingSenderId: "697135367559",
  appId: "1:697135367559:web:28719b5d7628b5556b7f22",
  measurementId: "G-1YFRN6FF23",
};

// Initialize app
const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore
const db = getFirestore(app);

// Analytics (web only, but safe with isSupported)
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// Exports
export { app, auth, db };
