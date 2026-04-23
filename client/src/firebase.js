import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your Firebase config from Firebase Console
// Go to: Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyCmNKNPD3IzYPIkRmK7csRUo4e_ZNYvDXc",
  authDomain: "geoattend-92415.firebaseapp.com",
  projectId: "geoattend-92415",
  storageBucket: "geoattend-92415.firebasestorage.app",
  messagingSenderId: "114192104451",
  appId: "1:114192104451:web:7f106f2279ddc29b1ea236",
  measurementId: "G-7DS2KK4JQN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();