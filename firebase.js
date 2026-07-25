// Firebase Configuration

var firebaseConfig = {
  apiKey: "AIzaSyCQVPtZYcLAIk55m9eG_sfXV5awTUDv024",
  authDomain: "surveykshan-2e4d6.firebaseapp.com",
  projectId: "surveykshan-2e4d6",
  storageBucket: "surveykshan-2e4d6.firebasestorage.app",
  messagingSenderId: "374529268493",
  appId: "1:374529268493:web:7072c04b92f79b38ecae44"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase Connected Successfully");
