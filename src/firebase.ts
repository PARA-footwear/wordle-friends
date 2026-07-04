import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDocs, 
  collection,
  query,
  limit
} from "firebase/firestore";

// Default configuration from firebase-applet-config.json
const defaultFirebaseConfig = {
  apiKey: "AIzaSyCC-dPMc_p3NC10IzBTe6ftIgbhZsiUA24",
  authDomain: "wordle-friends-c723b.firebaseapp.com",
  projectId: "wordle-friends-c723b",
  storageBucket: "wordle-friends-c723b.firebasestorage.app",
  messagingSenderId: "593707832307",
  appId: "1:593707832307:web:ba4065472f261cef147886"
};

// Allow user to override via Vite environment variables
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface PlayerResult {
  nickname: string;
  guesses: string[];
  isWon: boolean;
  lang: 'RU' | 'UA';
  wordToGuess: string;
  timestamp: string;
}

/**
 * Saves a player's game result for a specific date.
 * Path: dates/{date}/results/{nickname}
 */
export async function saveGameResult(
  date: string,
  nickname: string,
  guesses: string[],
  isWon: boolean,
  lang: 'RU' | 'UA',
  wordToGuess: string
): Promise<void> {
  if (!nickname || !date) return;
  const docRef = doc(db, "dates", date, "results", `${nickname}_${lang}`);
  await setDoc(docRef, {
    nickname,
    guesses,
    isWon,
    lang,
    wordToGuess,
    timestamp: new Date().toISOString()
  });
}

/**
 * Fetches all players' results for a specific date.
 */
export async function getGameResultsForDate(date: string): Promise<PlayerResult[]> {
  if (!date) return [];
  try {
    const colRef = collection(db, "dates", date, "results");
    const snapshot = await getDocs(colRef);
    const results: PlayerResult[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        nickname: data.nickname || doc.id,
        guesses: data.guesses || [],
        isWon: !!data.isWon,
        lang: data.lang || 'RU',
        wordToGuess: data.wordToGuess || '',
        timestamp: data.timestamp || ""
      });
    });
    return results;
  } catch (error) {
    console.error("Error fetching results for date:", date, error);
    return [];
  }
}
