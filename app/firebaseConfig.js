// Import necessary functions from Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // ✅ Add this import
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFLafHIwX_ftLKQScwIQ6OO9HB888vdIk",
  authDomain: "gametime-e5a48.firebaseapp.com",
  projectId: "gametime-e5a48",
  storageBucket: "gametime-e5a48.firebasestorage.app",
  messagingSenderId: "697135367559",
  appId: "1:697135367559:web:28719b5d7628b5556b7f22",
  measurementId: "G-1YFRN6FF23"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Analytics
export const auth = getAuth(app); // ✅ Add this export for auth
const analytics = getAnalytics(app);

// Export auth so it can be used in other parts of the app
export { app };
