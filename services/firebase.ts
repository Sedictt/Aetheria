import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkBhPCkP-6oFHyZDKPX_CT6OeMn2FzO2Q",
  authDomain: "aetheria-4a391.firebaseapp.com",
  projectId: "aetheria-4a391",
  storageBucket: "aetheria-4a391.firebasestorage.app",
  messagingSenderId: "910312544469",
  appId: "1:910312544469:web:504b02a6352c7862fdea5c",
  measurementId: "G-HD507YE6S5"
};

import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, googleProvider };
