// Import necessary functions from Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFLafHIwX_ftLKQScwIQ6OO9HB888vdIk",
  authDomain: "gametime-e5a48.firebaseapp.com",
  projectId: "gametime-e5a48",
  storageBucket: "gametime-e5a48.firebasestorage.app",
  messagingSenderId: "697135367559",
  appId: "1:697135367559:web:28719b5d7628b5556b7f22",
  measurementId: "G-1YFRN6FF23",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app); // Optional

// Optional export for app
export { app };
