import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2yMhrRcgkqKuq1igm0DLsfN_bFnnFzv0",
  authDomain: "sturan-603e4.firebaseapp.com",
  projectId: "sturan-603e4",
  storageBucket: "sturan-603e4.firebasestorage.app",
  messagingSenderId: "99626126753",
  appId: "1:99626126753:web:1a1f9d41c825e49b3ecfe0",
  measurementId: "G-SNNM07200D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
