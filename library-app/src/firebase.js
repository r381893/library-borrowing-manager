
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACd3z8vzYus_nZQW6GukNZi-gWgm9N8VQ",
    authDomain: "library-borrowing-manager.firebaseapp.com",
    projectId: "library-borrowing-manager",
    storageBucket: "library-borrowing-manager.firebasestorage.app",
    messagingSenderId: "790726770784",
    appId: "1:790726770784:web:fefac0988af2a600910305",
    measurementId: "G-7SM74YX9YN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };
