import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBshFJCgKDPLy2dG6GbuvTvP9lV7ehdJjI",
  authDomain: "financenuvem.firebaseapp.com",
  projectId: "financenuvem",
  storageBucket: "financenuvem.firebasestorage.app",
  messagingSenderId: "745688239352",
  appId: "1:745688239352:web:e741f9908087d7b5c0ff0d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
