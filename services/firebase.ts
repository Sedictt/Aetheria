import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsmt55YUAfJnX02bWFnbNN5ejpUw3rVVc",
  authDomain: "aetheria-journal.firebaseapp.com",
  projectId: "aetheria-journal",
  storageBucket: "aetheria-journal.firebasestorage.app",
  messagingSenderId: "560684494870",
  appId: "1:560684494870:web:32d3640a0e2ed718778537",
  measurementId: "G-2MVZ7Q0BXD"
};

import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, googleProvider };
