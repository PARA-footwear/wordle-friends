/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, 
  BarChart2, 
  RotateCcw, 
  Share2, 
  Sun, 
  Moon, 
  Check, 
  Delete, 
  Sparkles,
  X,
  Info,
  Calendar,
  Users,
  Database,
  CloudLightning,
  UserCheck,
  Lock,
  Settings
} from 'lucide-react';
import { getRandomWord, isValidWord, getDailyWord, bannedWords } from './words';
import { saveGameResult, getGameResultsForDate, getAllPlayedDates, PlayerResult } from './firebase';
import { PREDICTIONS_RU, PREDICTIONS_UA, getDailyPredictionIndex } from './predictions';


interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
}

const defaultStats: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0]
};

// English keyboard to Russian phonetic key map for desktop layout convenience
const ENGLISH_TO_RUSSIAN: { [key: string]: string } = {
  'q': 'Й', 'w': 'Ц', 'e': 'У', 'r': 'К', 't': 'Е', 'y': 'Н', 'u': 'Г', 'i': 'Ш', 'o': 'Щ', 'p': 'З', '[': 'Х', ']': 'Ъ',
  'a': 'Ф', 's': 'Ы', 'd': 'В', 'f': 'А', 'g': 'П', 'h': 'Р', 'j': 'О', 'k': 'Л', 'l': 'Д', ';': 'Ж', "'": 'Э',
  'z': 'Я', 'x': 'Ч', 'c': 'С', 'v': 'М', 'b': 'И', 'n': 'Т', 'm': 'Ь', ',': 'Б', '.': 'Ю',
  'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З', '{': 'Х', '}': 'Ъ',
  'A': 'Ф', 'S': 'Ы', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л', 'L': 'Д', ':': 'Ж', '"': 'Э',
  'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь', '<': 'Б', '>': 'Ю'
};

// English keyboard to Ukrainian phonetic key map for desktop layout convenience
const ENGLISH_TO_UKRAINIAN: { [key: string]: string } = {
  'q': 'Й', 'w': 'Ц', 'e': 'У', 'r': 'К', 't': 'Е', 'y': 'Н', 'u': 'Г', 'i': 'Ш', 'o': 'Щ', 'p': 'З', '[': 'Х', ']': 'Ї', '\\': 'Ґ',
  'a': 'Ф', 's': 'І', 'd': 'В', 'f': 'А', 'g': 'П', 'h': 'Р', 'j': 'О', 'k': 'Л', 'l': 'Д', ';': 'Ж', "'": 'Є',
  'z': 'Я', 'x': 'Ч', 'c': 'С', 'v': 'М', 'b': 'И', 'n': 'Т', 'm': 'Ь', ',': 'Б', '.': 'Ю',
  'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З', '{': 'Х', '}': 'Ї', '|': 'Ґ',
  'A': 'Ф', 'S': 'І', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л', 'L': 'Д', ':': 'Ж', '"': 'Є',
  'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь', '<': 'Б', '>': 'Ю'
};

interface MiniFriendGridProps {
  player: PlayerResult;
  isDarkMode: boolean;
  lang: 'RU' | 'UA';
  key?: any;
}

function MiniFriendGrid({ player, isDarkMode, lang }: MiniFriendGridProps) {
  const { nickname, guesses, isWon, wordToGuess, lang: playerLang } = player;
  const gridRows = Array(6).fill(null);
  
  const getLetterStatuses = (guess: string, target: string): ('correct' | 'present' | 'absent')[] => {
    const guessLetters = guess.toUpperCase().split('');
    const targetLetters = target.toUpperCase().split('');
    const statuses: ('correct' | 'present' | 'absent')[] = Array(5).fill('absent');
    const targetLetterCounts: { [key: string]: number } = {};
    
    for (let i = 0; i < 5; i++) {
      const letter = targetLetters[i];
      targetLetterCounts[letter] = (targetLetterCounts[letter] || 0) + 1;
    }
    
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        statuses[i] = 'correct';
        targetLetterCounts[guessLetters[i]]--;
      }
    }
    
    for (let i = 0; i < 5; i++) {
      if (statuses[i] !== 'correct') {
        const letter = guessLetters[i];
        if (targetLetterCounts[letter] && targetLetterCounts[letter] > 0) {
          statuses[i] = 'present';
          targetLetterCounts[letter]--;
        }
      }
    }
    return statuses;
  };

  return (
    <div className={`p-1.5 sm:p-2 rounded-xl border flex flex-col items-center gap-1 shadow-xs transition-all duration-200 w-full
      ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}
    >
      <div className="flex justify-between items-start w-full gap-1 px-0.5 mb-0.5">
        <span className="font-bold text-[9.5px] sm:text-[10.5px] leading-tight break-words flex-1 pr-0.5" title={nickname}>
          {nickname}
        </span>
        <span className={`text-[8px] sm:text-[9px] font-mono px-1 py-0.2 rounded font-bold shrink-0
          ${isWon 
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' 
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}
        >
          {isWon ? `${guesses.length}/6` : 'X/6'}
        </span>
      </div>

      <div className="grid grid-rows-6 gap-[1px] sm:gap-[1.5px] w-fit">
        {gridRows.map((_, rowIdx) => {
          const guess = guesses[rowIdx] || "";
          const isSubmitted = rowIdx < guesses.length;
          const statuses = isSubmitted ? getLetterStatuses(guess, wordToGuess || "СЛОВО") : [];

          return (
            <div key={rowIdx} className="flex gap-[1px] sm:gap-[1.5px]">
              {Array(5).fill(null).map((_, colIdx) => {
                const letter = guess[colIdx] || "";
                let cellBg = "bg-neutral-200 dark:bg-neutral-800";
                let textColor = "text-transparent";
                
                if (isSubmitted) {
                  textColor = "text-white text-[7.5px] sm:text-[8.5px] font-black";
                  if (statuses[colIdx] === 'correct') {
                    cellBg = "bg-emerald-500 dark:bg-emerald-600";
                  } else if (statuses[colIdx] === 'present') {
                    cellBg = "bg-amber-500 dark:bg-amber-600";
                  } else {
                    cellBg = "bg-neutral-400 dark:bg-neutral-600";
                  }
                }

                return (
                  <div 
                    key={colIdx}
                    className={`w-[14px] h-[14px] sm:w-[17px] sm:h-[17px] rounded-xs flex items-center justify-center font-mono select-none ${cellBg} ${textColor}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {wordToGuess && (
        <span className="text-[6.5px] sm:text-[7.5px] font-mono opacity-50 uppercase tracking-wider mt-0.5">
          {wordToGuess} ({playerLang})
        </span>
      )}
    </div>
  );
}

// Helper: Get today's date string YYYY-MM-DD
const getTodayDateString = () => {
  const today = new Date();
  return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
};

export default function App() {
  // Language switcher state
  const [lang, setLang] = useState<'RU' | 'UA'>(() => {
    const saved = localStorage.getItem('wordle_lang');
    return (saved === 'UA' ? 'UA' : 'RU') as 'RU' | 'UA';
  });

  // Game state
  const [isOriginalMode, setIsOriginalMode] = useState<boolean>(true); // True means "Слово Дня" (Daily), False means "Случайное" (Random)
  const [targetWord, setTargetWord] = useState<string>(() => getDailyWord(lang));
  
  // Initialize guesses from localStorage if saved daily state exists for the today's game
  const [guesses, setGuesses] = useState<string[]>(() => {
    const todayStr = getTodayDateString();
    const saved = localStorage.getItem(`wordle_daily_state_${todayStr}_${lang}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.guesses)) {
          return parsed.guesses;
        }
      } catch (e) {}
    }
    return [];
  });
  
  const [currentGuess, setCurrentGuess] = useState<string>("");
  
  // Initialize gameStatus from localStorage if saved daily state exists for the today's game
  const [gameStatus, setGameStatus] = useState<'IN_PROGRESS' | 'WON' | 'LOST'>(() => {
    const todayStr = getTodayDateString();
    const saved = localStorage.getItem(`wordle_daily_state_${todayStr}_${lang}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.gameStatus) {
          return parsed.gameStatus;
        }
      } catch (e) {}
    }
    return 'IN_PROGRESS';
  });
  
  // Custom toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedLangRef = useRef<'RU' | 'UA'>(lang);

  // Settings & Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wordle_ru_theme');
    return saved ? saved === 'dark' : false;
  });

  // Player Nickname States
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('wordle_ru_nickname') || '';
  });
  const [nickInput, setNickInput] = useState<string>('');
  
  // Today's multiplayer results
  const [friendsResults, setFriendsResults] = useState<PlayerResult[]>([]);
  const [isSavingResult, setIsSavingResult] = useState<boolean>(false);

  // Archive / History state
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [archiveDate, setArchiveDate] = useState<string>('');
  const [archiveResults, setArchiveResults] = useState<PlayerResult[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState<boolean>(false);
  const [playedDates, setPlayedDates] = useState<string[]>([]);
  const [isLoadingPlayedDates, setIsLoadingPlayedDates] = useState<boolean>(false);

  // Modals
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsNickInput, setSettingsNickInput] = useState<string>('');
  const [showPredictionModal, setShowPredictionModal] = useState<boolean>(false);
  const [solvedWordsToday, setSolvedWordsToday] = useState<string[]>(() => {
    const todayStr = getTodayDateString();
    const saved = localStorage.getItem(`wordle_solved_words_list_${todayStr}`);
    let list: string[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
        if (!Array.isArray(list)) list = [];
      } catch (e) {}
    }
    
    // Auto-populate from daily games if they were won
    const dailyRuWord = getDailyWord('RU');
    const savedRu = localStorage.getItem(`wordle_daily_state_${todayStr}_RU`);
    if (savedRu) {
      try {
        const parsed = JSON.parse(savedRu);
        if (parsed && parsed.gameStatus === 'WON' && !list.includes(dailyRuWord.toUpperCase())) {
          list.push(dailyRuWord.toUpperCase());
        }
      } catch (e) {}
    }

    const dailyUaWord = getDailyWord('UA');
    const savedUa = localStorage.getItem(`wordle_daily_state_${todayStr}_UA`);
    if (savedUa) {
      try {
        const parsed = JSON.parse(savedUa);
        if (parsed && parsed.gameStatus === 'WON' && !list.includes(dailyUaWord.toUpperCase())) {
          list.push(dailyUaWord.toUpperCase());
        }
      } catch (e) {}
    }

    localStorage.setItem(`wordle_solved_words_list_${todayStr}`, JSON.stringify(list));
    return list;
  });
  
  // Row shaking animation
  const [shakingRowIndex, setShakingRowIndex] = useState<number | null>(null);
  
  // Red highlight for banned word row
  const [bannedRowIndex, setBannedRowIndex] = useState<number | null>(null);

  // Game statistics
  const [stats, setStats] = useState<GameStats>(() => {
    const initialLang = (localStorage.getItem('wordle_lang') as 'RU' | 'UA') || 'RU';
    const key = `wordle_${initialLang.toLowerCase()}_stats`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.gamesPlayed === 'number' && Array.isArray(parsed.guessDistribution)) {
          return parsed;
        }
      } catch (e) {
        // Fall through
      }
    }
    // Backward compatibility for Russian key
    if (initialLang === 'RU') {
      const oldSaved = localStorage.getItem('wordle_ru_stats');
      if (oldSaved) {
        try {
          const parsed = JSON.parse(oldSaved);
          if (parsed && typeof parsed.gamesPlayed === 'number' && Array.isArray(parsed.guessDistribution)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return defaultStats;
  });

  // Load language-specific statistics when lang changes
  useEffect(() => {
    const key = `wordle_${lang.toLowerCase()}_stats`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.gamesPlayed === 'number' && Array.isArray(parsed.guessDistribution)) {
          setStats(parsed);
          return;
        }
      } catch (e) {
        // Fall through
      }
    } else if (lang === 'RU') {
      // Backward compatibility for RU
      const oldSaved = localStorage.getItem('wordle_ru_stats');
      if (oldSaved) {
        try {
          const parsed = JSON.parse(oldSaved);
          if (parsed && typeof parsed.gamesPlayed === 'number' && Array.isArray(parsed.guessDistribution)) {
            setStats(parsed);
            return;
          }
        } catch (e) {}
      }
    }
    setStats(defaultStats);
  }, [lang]);

  // Helper: Get list of last N dates
  const getPastDates = (numDays: number = 7) => {
    const dates = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  };

  // Helper: Check if daily game is completed for a language
  const isDailyGameCompleted = (language: 'RU' | 'UA') => {
    if (language === lang) {
      return gameStatus === 'WON' || gameStatus === 'LOST';
    }
    const todayStr = getTodayDateString();
    const saved = localStorage.getItem(`wordle_daily_state_${todayStr}_${language}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed && (parsed.gameStatus === 'WON' || parsed.gameStatus === 'LOST');
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  // Helper: Load other friends results for today
  const loadFriendsResults = async () => {
    if (!nickname) return;
    const todayStr = getTodayDateString();
    try {
      const res = await getGameResultsForDate(todayStr);
      // Filter out our own results
      setFriendsResults(res.filter(r => r.nickname !== nickname));
    } catch (err) {
      console.error("Error loading today's friends results:", err);
    }
  };

  // Helper: Upload result for today
  const uploadDailyResult = async (finalGuesses: string[], isWon: boolean, silent = false) => {
    if (!isOriginalMode) return;
    if (!nickname) return;
    setIsSavingResult(true);
    try {
      const todayStr = getTodayDateString();
      await saveGameResult(todayStr, nickname, finalGuesses, isWon, lang, targetWord);
      if (!silent) {
        showToast(lang === 'UA' ? "Результати збережено в хмарі! ☁️" : "Результаты сохранены в облако! ☁️", "success");
      }
      await loadFriendsResults();
    } catch (error) {
      console.error("Error saving result to Firestore:", error);
      if (!silent) {
        showToast(lang === 'UA' ? "Помилка збереження в хмару ❌" : "Ошибка сохранения в облако ❌", "error");
      }
    } finally {
      setIsSavingResult(false);
    }
  };

  // Save theme
  useEffect(() => {
    localStorage.setItem('wordle_ru_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Try to detect Telegram WebApp user
  useEffect(() => {
    if (!nickname) {
      const tg = (window as any).Telegram?.WebApp;
      const tgUser = tg?.initDataUnsafe?.user;
      if (tgUser) {
        const username = tgUser.username || `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
        if (username) {
          setNickInput(username);
        }
      }
    }
  }, [nickname]);

  // Load today's friends results when nickname or lang changes
  useEffect(() => {
    if (nickname) {
      loadFriendsResults();
    }
  }, [nickname, lang]);

  // Persistence: Save daily game state to localStorage
  useEffect(() => {
    if (isOriginalMode && loadedLangRef.current === lang) {
      const todayStr = getTodayDateString();
      if (guesses.length > 0) {
        localStorage.setItem(`wordle_daily_state_${todayStr}_${lang}`, JSON.stringify({
          guesses,
          gameStatus
        }));
      } else {
        localStorage.removeItem(`wordle_daily_state_${todayStr}_${lang}`);
      }
    }
  }, [guesses, gameStatus, isOriginalMode, lang]);

  // Auto-sync completed daily games to Firebase
  useEffect(() => {
    if (isOriginalMode && loadedLangRef.current === lang && nickname && (gameStatus === 'WON' || gameStatus === 'LOST') && guesses.length > 0 && targetWord) {
      const todayStr = getTodayDateString();
      const uploadKey = `wordle_ru_uploaded_${todayStr}_${lang}_${nickname}`;
      const alreadyUploaded = localStorage.getItem(uploadKey);
      if (!alreadyUploaded) {
        uploadDailyResult(guesses, gameStatus === 'WON', true);
        localStorage.setItem(uploadKey, 'true');
      }
    }
  }, [nickname, gameStatus, isOriginalMode, lang, targetWord, guesses]);

  // Save language whenever it changes
  useEffect(() => {
    localStorage.setItem('wordle_lang', lang);
  }, [lang]);

  // Consolidate game loading and mode/language switching
  useEffect(() => {
    setCurrentGuess("");
    const word = isOriginalMode ? getDailyWord(lang) : getRandomWord(lang);
    setTargetWord(word);

    if (isOriginalMode) {
      const todayStr = getTodayDateString();
      const saved = localStorage.getItem(`wordle_daily_state_${todayStr}_${lang}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.guesses)) {
            setGuesses(parsed.guesses);
            setGameStatus(parsed.gameStatus || 'IN_PROGRESS');
            loadedLangRef.current = lang;
            return;
          }
        } catch (e) {
          // Fall through
        }
      }
    }
    
    setGuesses([]);
    setGameStatus('IN_PROGRESS');
    loadedLangRef.current = lang;
  }, [isOriginalMode, lang]);

  // Trigger Info Modal on first visit ever
  useEffect(() => {
    const visited = localStorage.getItem('wordle_ru_visited');
    if (!visited) {
      setShowInfoModal(true);
      localStorage.setItem('wordle_ru_visited', 'true');
    }
  }, []);

  // Helper to trigger custom toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sound/Vibration feedback (mobile-friendly)
  const triggerHaptic = (duration: number | number[] = 50) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(duration);
      } catch (e) {
        // Ignore haptic errors on unsupported/unpermitted browsers
      }
    }
  };

  const registerSolvedWord = (word: string) => {
    const todayStr = getTodayDateString();
    const wordUpper = word.toUpperCase();
    setSolvedWordsToday(prev => {
      if (prev.includes(wordUpper)) return prev;
      const updated = [...prev, wordUpper];
      localStorage.setItem(`wordle_solved_words_list_${todayStr}`, JSON.stringify(updated));
      
      // If they just guessed their 2nd word today, automatically trigger the prediction modal!
      if (updated.length === 2) {
        setTimeout(() => {
          setShowPredictionModal(true);
          triggerHaptic([100, 50, 100]);
        }, 3200);
      }
      return updated;
    });
  };

  // Keyboard layout rows (ЙЦУКЕН / UA layout)
  const keyboardRows = lang === 'UA' ? [
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ї"],
    ["Ф", "І", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Є", "Ґ"],
    ["BACKSPACE", "Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "ENTER"]
  ] : [
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
    ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
    ["BACKSPACE", "Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "ENTER"]
  ];

  // Logic to determine Letter statuses for coloring (Correct Wordle Algorithm)
  const getLetterStatuses = (guess: string, target: string): ('correct' | 'present' | 'absent')[] => {
    const guessLetters = guess.toUpperCase().split('');
    const targetLetters = target.toUpperCase().split('');
    const statuses: ('correct' | 'present' | 'absent')[] = Array(5).fill('absent');
    
    // Available count tracker to prevent duplicate yellow coloring
    const targetLetterCounts: { [key: string]: number } = {};
    
    for (let i = 0; i < 5; i++) {
      const letter = targetLetters[i];
      targetLetterCounts[letter] = (targetLetterCounts[letter] || 0) + 1;
    }
    
    // Pass 1: Match all exact greens
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        statuses[i] = 'correct';
        targetLetterCounts[guessLetters[i]]--;
      }
    }
    
    // Pass 2: Match all partial yellows
    for (let i = 0; i < 5; i++) {
      if (statuses[i] !== 'correct') {
        const letter = guessLetters[i];
        if (targetLetterCounts[letter] && targetLetterCounts[letter] > 0) {
          statuses[i] = 'present';
          targetLetterCounts[letter]--;
        } else {
          statuses[i] = 'absent';
        }
      }
    }
    
    return statuses;
  };

  // Compile keyboard statuses based on all previous attempts
  const getKeyboardLetterStatuses = () => {
    const keyStatuses: { [key: string]: 'correct' | 'present' | 'absent' } = {};
    
    guesses.forEach((guess) => {
      const letterStatuses = getLetterStatuses(guess, targetWord);
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i].toUpperCase();
        const status = letterStatuses[i];
        
        if (status === 'correct') {
          keyStatuses[letter] = 'correct';
        } else if (status === 'present') {
          if (keyStatuses[letter] !== 'correct') {
            keyStatuses[letter] = 'present';
          }
        } else if (status === 'absent') {
          if (keyStatuses[letter] !== 'correct' && keyStatuses[letter] !== 'present') {
            keyStatuses[letter] = 'absent';
          }
        }
      }
    });
    
    return keyStatuses;
  };

  const keyStatuses = getKeyboardLetterStatuses();

  // Core Keyboard Interaction Handlers
  const handleKeyPress = (letter: string) => {
    if (gameStatus !== 'IN_PROGRESS') return;
    if (currentGuess.length >= 5) return;
    
    triggerHaptic(20);
    setCurrentGuess(prev => prev + letter);
  };

  const handleDeleteLetter = () => {
    if (gameStatus !== 'IN_PROGRESS') return;
    if (currentGuess.length === 0) return;
    
    triggerHaptic(15);
    setCurrentGuess(prev => prev.slice(0, -1));
  };

  const handleSubmitGuess = () => {
    if (gameStatus !== 'IN_PROGRESS') return;
    
    if (currentGuess.length < 5) {
      triggerHaptic([50, 50, 50]);
      setShakingRowIndex(guesses.length);
      const msg = lang === 'UA' ? "Слово занадто коротке! ⚠️" : "Слово слишком короткое! ⚠️";
      showToast(msg, "error");
      setTimeout(() => setShakingRowIndex(null), 400);
      return;
    }

    const uppercaseGuess = currentGuess.toUpperCase();

    // Check if the word is in the banned list
    if (bannedWords.includes(uppercaseGuess)) {
      triggerHaptic([100, 50, 100]);
      setShakingRowIndex(guesses.length);
      setBannedRowIndex(guesses.length);
      showToast("Не сегодня, Андрей, не сегодня... 🚫", "error");
      setTimeout(() => {
        setShakingRowIndex(null);
        setBannedRowIndex(null);
      }, 500);
      return;
    }

    // Check if the word exists in our dictionary
    if (!isValidWord(uppercaseGuess, lang)) {
      triggerHaptic([50, 50, 50]);
      setShakingRowIndex(guesses.length);
      const msg = lang === 'UA' ? "Такого слова немає в словнику 📖" : "Такого слова нет в словаре 📖";
      showToast(msg, "error");
      setTimeout(() => setShakingRowIndex(null), 400);
      return;
    }

    // Append to previous guesses list
    const newGuesses = [...guesses, uppercaseGuess];
    setGuesses(newGuesses);
    setCurrentGuess("");
    triggerHaptic(60);

    // Determine if game has ended
    if (uppercaseGuess === targetWord) {
      setGameStatus('WON');
      updateStats(true, newGuesses.length);
      uploadDailyResult(newGuesses, true, true);
      registerSolvedWord(targetWord);

      let message = "";
      const attempts = newGuesses.length;

      if (lang === 'UA') {
        if (attempts === 1) {
          message = "чітер, кого ти намагаєшся наїбати 😒";
        } else if (attempts === 2) {
          message = "та ну нахуй, це потужно 🤯";
        } else if (attempts === 3) {
          message = "маладець, маладець 😎";
        } else if (attempts === 4 || attempts === 5) {
          message = "непогано, але старайся краще 😏";
        } else {
          message = "мда, з шостої спроби будь-який дурень відгадає 🤡";
        }
      } else {
        if (attempts === 1) {
          message = "читер, кого ты пытаешься наебать 😒";
        } else if (attempts === 2) {
          message = "да ну нахуй, это потужно 🤯";
        } else if (attempts === 3) {
          message = "маладец, маладец 😎";
        } else if (attempts === 4 || attempts === 5) {
          message = "неплохо но старайся лучше 😏";
        } else {
          message = "мда, с шестой попытки любой дурак отгадает 🤡";
        }
      }

      showToast(message, "success");
      setTimeout(() => setShowStatsModal(true), 4500);
    } else if (newGuesses.length >= 6) {
      setGameStatus('LOST');
      updateStats(false, 6);
      uploadDailyResult(newGuesses, false, true);

      const message = lang === 'UA'
        ? `ганьба, соромно бути тобою (загадане слово: ${targetWord}) 🤦‍♂️`
        : `позор, стыдно быть тобой (загаданное слово: ${targetWord}) 🤦‍♂️`;
      showToast(message, "error");
      setTimeout(() => setShowStatsModal(true), 4500);
    }
  };

  // Update Game Stats
  const updateStats = (isWin: boolean, guessCount: number) => {
    const updatedStats = { ...stats };
    updatedStats.gamesPlayed += 1;
    
    if (isWin) {
      updatedStats.gamesWon += 1;
      updatedStats.currentStreak += 1;
      updatedStats.maxStreak = Math.max(updatedStats.maxStreak, updatedStats.currentStreak);
      updatedStats.guessDistribution[guessCount - 1] += 1;
    } else {
      updatedStats.currentStreak = 0;
    }
    
    setStats(updatedStats);
    const key = `wordle_${lang.toLowerCase()}_stats`;
    localStorage.setItem(key, JSON.stringify(updatedStats));
    if (lang === 'RU') {
      localStorage.setItem('wordle_ru_stats', JSON.stringify(updatedStats)); // Keep backward compatibility for old Russian key
    }
  };

  // Reset Game
  const handleResetGame = (useRandomWord: boolean) => {
    triggerHaptic(100);
    if (useRandomWord) {
      const word = getRandomWord(lang);
      setTargetWord(word);
      setIsOriginalMode(false);
      const msg = lang === 'UA' ? "Загадано нове випадкове слово! 🎲" : "Загадано новое случайное слово! 🎲";
      showToast(msg, "info");
    } else {
      const word = getDailyWord(lang);
      setTargetWord(word);
      setIsOriginalMode(true);
      const msg = lang === 'UA' ? "Загадано Слово Дня! 🌟" : "Загадано Слово Дня! 🌟";
      showToast(msg, "info");
    }
    setGuesses([]);
    setCurrentGuess("");
    setGameStatus('IN_PROGRESS');
  };

  // Physical Keyboard Handler Effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showStatsModal || showInfoModal || showArchiveModal || showSettingsModal) return;
      if (gameStatus !== 'IN_PROGRESS') return;
      
      const key = e.key;
      
      if (key === 'Enter') {
        handleSubmitGuess();
      } else if (key === 'Backspace') {
        handleDeleteLetter();
      } else {
        const cyrillicRegex = /^[а-яА-ЯёЁіІїЇєЄґҐ]$/;
        if (cyrillicRegex.test(key)) {
          let letter = key.toUpperCase();
          if (letter === 'Ё') letter = 'Е';
          handleKeyPress(letter);
        } else {
          // Attempt layout mapping from QWERTY to language ЙЦУКЕН
          const mapped = lang === 'UA' ? ENGLISH_TO_UKRAINIAN[key] : ENGLISH_TO_RUSSIAN[key];
          if (mapped) {
            handleKeyPress(mapped);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameStatus, showStatsModal, showInfoModal, targetWord, guesses, lang]);

  // Share results to clipboard via Emoji Grid
  const handleShareResults = () => {
    const modeStr = isOriginalMode 
      ? (lang === 'UA' ? 'Слово Дня' : 'Слово Дня') 
      : (lang === 'UA' ? 'Випадкове' : 'Случайное');
    let text = `${lang === 'UA' ? 'Вордлі' : 'Вордли'} (${modeStr}) ${gameStatus === 'WON' ? guesses.length : 'X'}/6\n\n`;
    
    guesses.forEach((guess) => {
      const statuses = getLetterStatuses(guess, targetWord);
      const rowEmojis = statuses.map(status => {
        if (status === 'correct') return '🟩';
        if (status === 'present') return '🟨';
        return '⬛';
      }).join('');
      text += rowEmojis + '\n';
    });

    text += `\n${lang === 'UA' ? 'Грайте у Вордлі! 🎮' : 'Играйте в Вордли! 🎮'}`;

    navigator.clipboard.writeText(text)
      .then(() => {
        const msg = lang === 'UA' ? "Результати скопійовані в буфер! 📋" : "Результаты скопированы в буфер! 📋";
        showToast(msg, "success");
        triggerHaptic(80);
      })
      .catch(() => {
        const msg = lang === 'UA' ? "Не вдалося скопіювати результати 😢" : "Не удалось скопировать результаты 😢";
        showToast(msg, "error");
      });
  };

  // Render cells for active and empty rows
  const renderRow = (rowIdx: number) => {
    const isSubmitted = rowIdx < guesses.length;
    const isCurrent = rowIdx === guesses.length;
    const word = isSubmitted ? guesses[rowIdx] : (isCurrent ? currentGuess : "");
    const statuses = isSubmitted ? getLetterStatuses(word, targetWord) : [];
    
    const isBanned = bannedRowIndex === rowIdx;
    const cells = [];
    for (let colIdx = 0; colIdx < 5; colIdx++) {
      const letter = word[colIdx] || "";
      const isLetterFilled = letter !== "";
      
      let backColorClass = "bg-wordle-absent border-wordle-absent dark:bg-wordle-absent-dark dark:border-wordle-absent-dark";
      if (isSubmitted) {
        if (statuses[colIdx] === 'correct') {
          backColorClass = "bg-wordle-correct border-wordle-correct dark:bg-wordle-correct-dark dark:border-wordle-correct-dark";
        } else if (statuses[colIdx] === 'present') {
          backColorClass = "bg-wordle-present border-wordle-present dark:bg-wordle-present-dark dark:border-wordle-present-dark";
        } else {
          backColorClass = "bg-wordle-absent border-wordle-absent dark:bg-wordle-absent-dark dark:border-wordle-absent-dark";
        }
      }

      cells.push(
        <div 
          key={colIdx} 
          id={`cell-${rowIdx}-${colIdx}`}
          className="cell-container w-12 h-12 xs:w-14 xs:h-14 md:w-16 md:h-16 transition-transform duration-100"
        >
          <div 
            className={`cell-inner w-full h-full ${isSubmitted ? 'cell-flipped' : ''}`}
            style={{ transitionDelay: isSubmitted ? `${colIdx * 150}ms` : '0ms' }}
          >
            {/* Front side of grid cell */}
            <div className={`cell-front rounded border-2 flex items-center justify-center font-bold text-xl md:text-2xl transition-all duration-100 select-none
              ${isBanned
                ? 'border-rose-500 text-rose-500 bg-rose-500/10'
                : isDarkMode 
                ? isLetterFilled ? 'border-wordle-border-active-dark text-white bg-neutral-900 animate-pop' : 'border-wordle-border-empty-dark text-neutral-400 bg-neutral-950/60'
                : isLetterFilled ? 'border-wordle-border-active text-neutral-900 bg-white animate-pop' : 'border-wordle-border-empty text-neutral-600 bg-white'
              }`}
            >
              {letter}
            </div>

            {/* Back side of grid cell (revealed after flip transition) */}
            <div className={`cell-back rounded flex items-center justify-center font-bold text-xl md:text-2xl text-white select-none shadow-sm ${backColorClass}`}>
              {letter}
            </div>
          </div>
        </div>
      );
    }

    const isShaking = shakingRowIndex === rowIdx;
    return (
      <div 
        key={rowIdx} 
        id={`row-${rowIdx}`}
        className={`flex justify-center gap-1.5 md:gap-2 ${isShaking ? 'animate-shake' : ''}`}
      >
        {cells}
      </div>
    );
  };

  if (!nickname) {
    return (
      <div className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden font-sans flex flex-col items-center justify-center p-4 transition-colors duration-300
        ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-800'}`}
      >
        {/* Header decoration */}
        <div className="absolute top-4 flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-800 text-[11px] font-bold">
          <button
            onClick={() => setLang('RU')}
            className={`px-3 py-1 rounded transition-all duration-150 ${lang === 'RU' ? 'bg-white text-neutral-900 dark:bg-neutral-800 dark:text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            RU
          </button>
          <button
            onClick={() => setLang('UA')}
            className={`px-3 py-1 rounded transition-all duration-150 ${lang === 'UA' ? 'bg-white text-neutral-900 dark:bg-neutral-800 dark:text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            UA
          </button>
        </div>

        <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl border text-center relative overflow-hidden transition-all duration-300
          ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-800'}`}
        >
          {/* Ambient Glow */}
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-2xl" />

          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md">
            <Users className="w-8 h-8" />
          </div>

          <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight mb-2">
            {lang === 'UA' ? 'Вордлі для Друзів 👥' : 'Вордли для Друзей 👥'}
          </h2>
          <p className="text-sm opacity-70 mb-6 max-w-xs mx-auto leading-relaxed">
            {lang === 'UA' 
              ? 'Приватний клуб на 4 людини. Змагайтеся щодня, дивіться сітки друзів у реальному часі та переглядайте архів ігор.' 
              : 'Приватный клуб на 4 человека. Соревнуйтесь каждый день, смотрите сетки друзей в реальном времени и листайте архив.'}
          </p>

          <form onSubmit={(e) => {
            e.preventDefault();
            const trimmed = nickInput.trim().slice(0, 25);
            if (trimmed) {
               localStorage.setItem('wordle_ru_nickname', trimmed);
               setNickname(trimmed);
               triggerHaptic(50);
            } else {
               showToast(lang === 'UA' ? "Будь ласка, введіть нікнейм ✍️" : "Пожалуйста, введите никнейм ✍️", "error");
            }
          }} className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-mono font-bold tracking-wider uppercase opacity-60 ml-1">
                {lang === 'UA' ? 'Ваш нікнейм:' : 'Ваш никнейм:'}
              </label>
              <input
                type="text"
                maxLength={25}
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                placeholder={lang === 'UA' ? 'Наприклад, Іван...' : 'Например, Иван...'}
                className={`w-full mt-1.5 px-4 py-3 rounded-xl font-bold border outline-none text-center transition-all duration-200 text-lg
                  ${isDarkMode 
                    ? 'bg-neutral-950 border-neutral-800 focus:border-emerald-500 text-white placeholder-neutral-700' 
                    : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-800 placeholder-slate-400'}`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition-all duration-150 uppercase tracking-wider text-sm cursor-pointer"
            >
              {lang === 'UA' ? 'Увійти в гру' : 'Войти в игру'}
            </button>
          </form>

          {/* Telegram WebApp status banner */}
          {typeof window !== 'undefined' && (window as any).Telegram?.WebApp && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-500 font-mono">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Авторизовано через Telegram</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden font-sans flex flex-col justify-between transition-colors duration-300 select-none
      ${isDarkMode 
        ? 'bg-neutral-950 text-neutral-100' 
        : 'bg-white text-neutral-900'
      }`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-0 right-0 z-[1000] flex justify-center pointer-events-none px-4">
          <div className={`pointer-events-auto px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-semibold text-sm md:text-base border transition-all duration-300 animate-pop max-w-sm md:max-w-md text-center justify-center
            ${toast.type === 'success' 
              ? 'bg-emerald-500 text-white border-emerald-400 dark:bg-emerald-600 dark:border-emerald-500' 
              : toast.type === 'error'
                ? 'bg-rose-500 text-white border-rose-400 dark:bg-rose-600 dark:border-rose-500'
                : 'bg-neutral-900 text-white border-neutral-800 dark:bg-neutral-800 dark:border-neutral-700'
            }`}
          >
            {toast.type === 'success' && <Sparkles className="w-5 h-5 text-yellow-300 animate-bounce shrink-0" />}
            {toast.type === 'error' && <span className="text-lg shrink-0">⚠️</span>}
            <span className="leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className={`py-4 px-4 border-b flex justify-between items-center max-w-lg w-full mx-auto
        ${isDarkMode ? 'border-neutral-900 bg-neutral-950/80 backdrop-blur-sm' : 'border-neutral-200 bg-white/80 backdrop-blur-sm'}`}
      >
        <div className="flex items-center gap-1.5">
          <button 
            id="info-btn"
            onClick={() => setShowInfoModal(true)} 
            className={`p-1.5 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            title={lang === 'UA' ? "Як грати" : "Как играть"}
          >
            <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Language Switcher Pill Selector */}
          <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-800 text-[11px] font-bold">
            <button
              id="lang-ru-btn"
              onClick={() => setLang('RU')}
              className={`px-2 py-0.5 rounded transition-all duration-150 ${lang === 'RU' ? 'bg-white text-neutral-900 dark:bg-neutral-800 dark:text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              RU
            </button>
            <button
              id="lang-ua-btn"
              onClick={() => setLang('UA')}
              className={`px-2 py-0.5 rounded transition-all duration-150 ${lang === 'UA' ? 'bg-white text-neutral-900 dark:bg-neutral-800 dark:text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              UA
            </button>
          </div>
          
          <div className="hidden xs:flex flex-col text-left ml-1">
            <span className="text-[9px] font-mono tracking-wider opacity-60">РЕЖИМ:</span>
            <span className={`text-[10px] font-bold tracking-tight rounded px-1.5 py-0.5 ${isOriginalMode ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'}`}>
              {isOriginalMode 
                ? (lang === 'UA' ? "Слово Дня" : "Слово Дня") 
                : (lang === 'UA' ? "Випадковий" : "Случайный")}
            </span>
          </div>
        </div>

        <h1 className="flex flex-col items-center select-none">
          <span className="font-display font-extrabold text-2xl md:text-3xl tracking-widest bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
            {lang === 'UA' ? "ВОРДЛІ" : "ВОРДЛИ"}
          </span>
          <span className="text-[9px] font-mono tracking-widest opacity-50 -mt-0.5 uppercase">
            {lang === 'UA' ? "Українська" : "Русский"}
          </span>
        </h1>

        <div className="flex items-center gap-1">
          <button 
            id="archive-btn"
            onClick={async () => {
              triggerHaptic(10);
              const todayStr = getTodayDateString();
              setArchiveDate(todayStr);
              setShowArchiveModal(true);
              setIsLoadingPlayedDates(true);
              setIsLoadingArchive(true);
              try {
                const dates = await getAllPlayedDates();
                setPlayedDates(dates);
                const defaultDate = dates.length > 0 ? dates[0] : todayStr;
                setArchiveDate(defaultDate);
                const res = await getGameResultsForDate(defaultDate);
                setArchiveResults(res);
              } catch (e) {
                console.error(e);
              } finally {
                setIsLoadingPlayedDates(false);
                setIsLoadingArchive(false);
              }
            }} 
            className={`p-1.5 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            title={lang === 'UA' ? "Архів ігор" : "Архив игр"}
          >
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Daily Prediction Crystal Ball Button */}
          <button 
            id="prediction-btn"
            onClick={() => {
              triggerHaptic(15);
              if (solvedWordsToday.length >= 2) {
                setShowPredictionModal(true);
              } else {
                const wordsLeft = 2 - solvedWordsToday.length;
                const msg = lang === 'UA' 
                  ? `Відгадайте ще ${wordsLeft} ${wordsLeft === 1 ? 'слово' : 'слова'} сьогодні, щоб отримати передбачення! 🔮` 
                  : `Отгадайте еще ${wordsLeft} ${wordsLeft === 1 ? 'слово' : 'слова'} сегодня, чтобы получить предсказание! 🔮`;
                showToast(msg, "info");
              }
            }} 
            className={`p-1.5 rounded-lg transition-all duration-300 relative flex items-center justify-center border
              ${solvedWordsToday.length >= 2 
                ? 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-500 animate-pulse-slow shadow-md shadow-purple-500/10' 
                : 'bg-transparent border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
            title={lang === 'UA' ? "Передбачення на день" : "Предсказание на день"}
          >
            <span className="text-lg md:text-xl leading-none">🔮</span>
            {solvedWordsToday.length < 2 && (
              <span className="absolute -top-1 -right-1 bg-neutral-200 dark:bg-neutral-800 text-[8px] font-black px-1.5 py-0.2 rounded-full border border-neutral-300 dark:border-neutral-700">
                {solvedWordsToday.length}/2
              </span>
            )}
            {solvedWordsToday.length >= 2 && (
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full animate-bounce">
                ✨
              </span>
            )}
          </button>

          <button 
            id="stats-btn"
            onClick={() => setShowStatsModal(true)} 
            className={`p-1.5 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            title={lang === 'UA' ? "Статистика" : "Статистика"}
          >
            <BarChart2 className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          
          <button 
            id="settings-btn"
            onClick={() => {
              triggerHaptic(10);
              setSettingsNickInput(nickname);
              setShowSettingsModal(true);
            }} 
            className={`p-1.5 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            title={lang === 'UA' ? "Налаштування" : "Настройки"}
          >
            <Settings className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </header>

      {/* GAME BOARD SECTION */}
      <main className="flex-1 flex flex-col justify-center py-4 px-2 max-w-md w-full mx-auto">
        <div id="wordle-grid" className="flex flex-col gap-1.5 md:gap-2 mb-4">
          {Array(6).fill(null).map((_, i) => renderRow(i))}
        </div>
        
        {/* Play Again options bar on Game End */}
        {gameStatus !== 'IN_PROGRESS' && (
          <div className={`p-4 rounded-2xl border flex flex-col items-center gap-3 max-w-sm mx-auto w-full mb-4 animate-pop shadow-lg
            ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-slate-200'}`}
          >
            <div className="text-center">
              <span className="text-xs uppercase tracking-wider font-mono opacity-60">
                {lang === 'UA' ? "Правильна відповідь:" : "Правильный ответ:"}
              </span>
              <h3 className="text-2xl font-black text-emerald-500 tracking-wider font-mono mt-0.5">{targetWord}</h3>
            </div>
            
            <div className="flex gap-2 w-full justify-center">
              <button
                id="play-orig-btn"
                onClick={() => handleResetGame(false)}
                className="flex-1 max-w-[140px] px-3 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 font-bold text-xs rounded-xl shadow transition-all duration-150 text-center uppercase"
              >
                {lang === 'UA' ? "Слово Дня" : "Слово Дня"}
              </button>
              
              <button
                id="play-rand-btn"
                onClick={() => handleResetGame(true)}
                className="flex-1 max-w-[145px] px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-1.5 uppercase"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {lang === 'UA' ? "Випадкове" : "Случайное"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* KEYBOARD SECTION */}
      <footer className="pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] xs:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-6 md:pb-6 px-1 md:px-4 max-w-lg w-full mx-auto">
        <div id="virtual-keyboard" className="flex flex-col gap-1.5 md:gap-2 select-none">
          {keyboardRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center w-full gap-1 md:gap-1.5">
              {row.map((key) => {
                const isSpecialKey = key === "ENTER" || key === "BACKSPACE";
                const status = keyStatuses[key] || null;
                
                let keyColorClass = "bg-wordle-border-empty text-neutral-800 hover:bg-neutral-300 active:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-600 dark:active:bg-neutral-500";
                
                if (status === 'correct') {
                  keyColorClass = "bg-wordle-correct text-white dark:bg-wordle-correct-dark";
                } else if (status === 'present') {
                  keyColorClass = "bg-wordle-present text-white dark:bg-wordle-present-dark";
                } else if (status === 'absent') {
                  keyColorClass = "bg-[rgba(160,4,43,0.15)] text-[rgb(160,4,43)] dark:bg-[rgba(160,4,43,0.25)] dark:text-red-400";
                }
 
                if (isSpecialKey) {
                  keyColorClass = "bg-wordle-border-empty text-neutral-800 hover:bg-neutral-300 active:bg-neutral-400 dark:bg-neutral-600 dark:text-neutral-50 dark:hover:bg-neutral-500 px-1 md:px-3 text-[10px] md:text-xs font-bold";
                }
 
                return (
                  <button
                    key={key}
                    id={`key-${key}`}
                    onClick={() => {
                      if (key === "ENTER") {
                        handleSubmitGuess();
                      } else if (key === "BACKSPACE") {
                        handleDeleteLetter();
                      } else {
                        handleKeyPress(key);
                      }
                    }}
                    className={`h-12 md:h-14 rounded-md flex items-center justify-center transition-all duration-150 shadow-sm cursor-pointer select-none font-semibold text-xs md:text-sm
                      ${isSpecialKey ? 'flex-[1.4] md:flex-initial' : 'flex-1'}
                      ${keyColorClass}`}
                  >
                    {key === "ENTER" ? (
                      <span className="hidden sm:inline">{lang === 'UA' ? "ВВЕДЕННЯ" : "ВВОД"}</span>
                    ) : key === "BACKSPACE" ? (
                      <Delete className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      key
                    )}
                    {key === "ENTER" && (
                      <Check className="w-3.5 h-3.5 sm:hidden" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] md:text-xs font-mono tracking-tight opacity-40 mt-3">
          {lang === 'UA' 
            ? "Підтримується фізична клавіатура (навіть в англійській розкладці QWERTY)"
            : "Поддерживается физическая клавиатура (даже в английской раскладке QWERTY)"
          }
        </p>
      </footer>

      {/* TUTORIAL INFO MODAL */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className={`w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative border animate-pop max-h-[90vh] overflow-y-auto
            ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-100 text-slate-800'}`}
          >
            <button 
              id="close-info-btn"
              onClick={() => { triggerHaptic(10); setShowInfoModal(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-extrabold text-2xl mb-4 text-center tracking-tight">
              {lang === 'UA' ? "Як грати? 🎮" : "Как играть? 🎮"}
            </h3>
            
            <div className="space-y-4 text-sm md:text-base leading-relaxed">
              <p>
                {lang === 'UA' 
                  ? <>Ваше завдання — відгадати приховане слово з <strong>5 букв</strong> за <strong>6 спроб</strong>.</>
                  : <>Ваша задача — отгадать скрытое слово из <strong>5 букв</strong> за <strong>6 попыток</strong>.</>
                }
              </p>
              <p>
                {lang === 'UA'
                  ? <>Кожна спроба має бути реальним іменником у називному відмінку. Натисніть <strong>ВВЕДЕННЯ</strong> для перевірки.</>
                  : <>Каждая попытка должна быть реальным существительным в именительном падеже. Нажмите <strong>ВВОД</strong> для проверки.</>
                }
              </p>
              <p>
                {lang === 'UA'
                  ? "Після кожної спроби колір осередків зміниться, щоб показати, наскільки ви були близькі:"
                  : "После каждой попытки цвет ячеек изменится, чтобы показать, насколько вы были близки:"
                }
              </p>

              {/* Green Example */}
              <div className="space-y-1.5 pt-2">
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded bg-wordle-correct border-wordle-correct dark:bg-wordle-correct-dark dark:border-wordle-correct-dark text-white font-bold flex items-center justify-center text-sm">С</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">Л</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">О</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">В</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">О</div>
                </div>
                <p className="text-xs opacity-80">
                  {lang === 'UA'
                    ? <>Буква <strong>С</strong> є у загаданому слові і стоїть на <strong>правильному</strong> місці.</>
                    : <>Буква <strong>С</strong> есть в загаданном слове и стоит на <strong>правильном</strong> месте.</>
                  }
                </p>
              </div>

              {/* Yellow Example */}
              <div className="space-y-1.5 pt-2">
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">П</div>
                  <div className="w-8 h-8 rounded bg-wordle-present border-wordle-present dark:bg-wordle-present-dark dark:border-wordle-present-dark text-white font-bold flex items-center justify-center text-sm">И</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">Р</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">О</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">Г</div>
                </div>
                <p className="text-xs opacity-80">
                  {lang === 'UA'
                    ? <>Буква <strong>И</strong> є у загаданому слові, але стоїть на <strong>іншому</strong> місці.</>
                    : <>Буква <strong>И</strong> есть в загаданном слове, но стоит на <strong>другом</strong> месте.</>
                  }
                </p>
              </div>

              {/* Gray Example */}
              <div className="space-y-1.5 pt-2">
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">В</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">Е</div>
                  <div className="w-8 h-8 rounded bg-wordle-absent border-wordle-absent dark:bg-wordle-absent-dark dark:border-wordle-absent-dark text-white font-bold flex items-center justify-center text-sm">Т</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">Е</div>
                  <div className="w-8 h-8 rounded border-2 border-wordle-border-empty dark:border-wordle-border-empty-dark text-neutral-500 font-bold flex items-center justify-center text-sm">Р</div>
                </div>
                <p className="text-xs opacity-80">
                  {lang === 'UA'
                    ? <>Букви <strong>Т</strong> немає в загаданому слові на будь-якій позиції.</>
                    : <>Буквы <strong>Т</strong> нет в загаданном слове на любой позиции.</>
                  }
                </p>
              </div>
            </div>

            <button
              id="start-game-btn"
              onClick={() => { triggerHaptic(20); setShowInfoModal(false); }}
              className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all duration-150 uppercase tracking-wider text-sm cursor-pointer"
            >
              {lang === 'UA' ? "Розпочати гру!" : "Начать Игру!"}
            </button>
          </div>
        </div>
      )}

      {/* STATISTICS & RESULTS MODAL */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className={`w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative border animate-pop max-h-[90vh] overflow-y-auto
            ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-100 text-slate-800'}`}
          >
            <button 
              id="close-stats-btn"
              onClick={() => { triggerHaptic(10); setShowStatsModal(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-extrabold text-2xl mb-4 text-center tracking-tight">
              {lang === 'UA' ? "Статистика Гравця 📊" : "Статистика Игрока 📊"}
            </h3>
            
            {/* Stats Metrics Row */}
            <div className="grid grid-cols-4 gap-2 mb-6 text-center">
              <div className="p-2 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-xl">
                <div className="text-2xl md:text-3xl font-black">{stats.gamesPlayed}</div>
                <div className="text-[10px] md:text-xs opacity-60 font-medium">
                  {lang === 'UA' ? "Зіграно" : "Сыграно"}
                </div>
              </div>
              <div className="p-2 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-xl">
                <div className="text-2xl md:text-3xl font-black">
                  {stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%
                </div>
                <div className="text-[10px] md:text-xs opacity-60 font-medium">
                  {lang === 'UA' ? "% Перемог" : "% Побед"}
                </div>
              </div>
              <div className="p-2 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-xl">
                <div className="text-2xl md:text-3xl font-black">{stats.currentStreak}</div>
                <div className="text-[10px] md:text-xs opacity-60 font-medium">
                  {lang === 'UA' ? "Поточ. серія" : "Тек. серия"}
                </div>
              </div>
              <div className="p-2 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-xl">
                <div className="text-2xl md:text-3xl font-black">{stats.maxStreak}</div>
                <div className="text-[10px] md:text-xs opacity-60 font-medium">
                  {lang === 'UA' ? "Макс. серія" : "Макс. серия"}
                </div>
              </div>
            </div>

            {/* Guess Distribution Bar Chart */}
            <h4 className="font-bold text-sm mb-3 tracking-wide uppercase opacity-70">
              {lang === 'UA' ? "Розподіл Спроб" : "Распределение Попыток"}
            </h4>
            <div className="space-y-1.5 mb-6">
              {stats.guessDistribution.map((count, index) => {
                const maxCount = Math.max(...stats.guessDistribution, 1);
                const percentWidth = stats.gamesPlayed > 0 ? Math.max((count / maxCount) * 100, 6) : 6;
                const isCurrentWinningGuess = gameStatus === 'WON' && guesses.length === index + 1;

                return (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-2.5 font-bold text-xs opacity-60">{index + 1}</span>
                    <div className="flex-1 h-5 bg-neutral-100 dark:bg-neutral-800 rounded">
                      <div 
                        style={{ width: `${percentWidth}%` }}
                        className={`h-full rounded flex items-center justify-end px-2 text-white font-bold text-xs transition-all duration-500
                          ${isCurrentWinningGuess 
                            ? 'bg-emerald-500 animate-pulse' 
                            : 'bg-neutral-500 dark:bg-neutral-600'}`}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Daily Prediction Info Block in Stats */}
            <div className={`p-4 rounded-2xl mb-6 border text-center transition-all duration-200
              ${solvedWordsToday.length >= 2
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-950 dark:text-purple-300'
                : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800 opacity-80'}`}
            >
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-xl">🔮</span>
                <h4 className="font-bold text-xs uppercase tracking-wider font-display">
                  {lang === 'UA' ? "Передбачення на день" : "Предсказание на день"}
                </h4>
              </div>

              {solvedWordsToday.length >= 2 ? (
                <div>
                  <p className="text-xs italic mb-3 opacity-90 px-2 line-clamp-2">
                    "{lang === 'UA' 
                      ? PREDICTIONS_UA[getDailyPredictionIndex(getTodayDateString(), nickname)]
                      : PREDICTIONS_RU[getDailyPredictionIndex(getTodayDateString(), nickname)]
                    }"
                  </p>
                  <button
                    onClick={() => {
                      triggerHaptic(15);
                      setShowStatsModal(false);
                      setShowPredictionModal(true);
                    }}
                    className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer tracking-wide uppercase"
                  >
                    {lang === 'UA' ? "Читати повністю ✨" : "Читать полностью ✨"}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs opacity-70 mb-3 leading-relaxed max-w-xs mx-auto">
                    {lang === 'UA'
                      ? `Відгадайте 2 слова сьогодні, щоб отримати передбачення! Вже відгадано: ${solvedWordsToday.length}/2`
                      : `Отгадайте 2 слова сегодня, чтобы получить предсказание! Уже отгадано: ${solvedWordsToday.length}/2`}
                  </p>
                  {/* Progress bar */}
                  <div className="w-full max-w-[200px] mx-auto h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mb-1">
                    <div 
                      style={{ width: `${(solvedWordsToday.length / 2) * 100}%` }}
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Game Over Action Panel */}
            {gameStatus !== 'IN_PROGRESS' ? (
              <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-center mb-1">
                  <span className="text-xs uppercase opacity-50">
                    {lang === 'UA' ? "Результат гри:" : "Результат игры:"}
                  </span>
                  <div className="flex items-center justify-center gap-2 mt-0.5">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${gameStatus === 'WON' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}>
                      {gameStatus === 'WON' 
                        ? (lang === 'UA' ? `ПЕРЕМОГА (Спроба ${guesses.length})` : `ПОБЕДА (Попытка ${guesses.length})`) 
                        : (lang === 'UA' ? 'ПОРАЗКА' : 'ПОРАЖЕНИЕ')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id="new-game-btn"
                    onClick={() => { triggerHaptic(20); handleResetGame(true); setShowStatsModal(false); }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                    {lang === 'UA' ? "Нове Випадкове Слово" : "Новое Случайное Слово"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 text-center text-xs opacity-50 border-t border-neutral-100 dark:border-neutral-800 font-mono">
                {lang === 'UA' ? "Статистика оновлюється в кінці кожного раунду" : "Статистика обновляется в конце каждого раунда"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARCHIVE MODAL */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative border animate-pop max-h-[90vh] overflow-y-auto
            ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-100 text-slate-800'}`}
          >
            <button 
              id="close-archive-btn"
              onClick={() => { triggerHaptic(10); setShowArchiveModal(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-extrabold text-2xl mb-2 text-center tracking-tight flex items-center justify-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-500" />
              {lang === 'UA' ? "Архів Минулих Ігор 📅" : "Архив Прошедших Игр 📅"}
            </h3>

            {!isDailyGameCompleted(lang) ? (
              <div className="flex flex-col items-center text-center p-6 my-4 bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                <h4 className="font-bold text-lg mb-2">
                  {lang === 'UA' ? "Архів заблоковано! 🔒" : "Архив заблокирован! 🔒"}
                </h4>
                <p className="text-xs opacity-75 leading-relaxed mb-6 max-w-xs">
                  {lang === 'UA'
                    ? "Вам необхідно завершити сьогоднішню гру українською мовою, щоб відкрити історію та результати інших гравців."
                    : "Вам необходимо завершить сегодняшнюю игру на русском языке, чтобы открыть историю и результаты других игроков."}
                </p>
                <button
                  onClick={() => { triggerHaptic(15); setShowArchiveModal(false); }}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                >
                  {lang === 'UA' ? "Грати зараз 🎮" : "Играть сейчас 🎮"}
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-center opacity-60 mb-6">
                  {lang === 'UA' 
                    ? "Виберіть день, щоб переглянути результати та сітки всіх гравців" 
                    : "Выберите день, чтобы просмотреть результаты и сетки всех игроков"}
                </p>

                {/* Quick date selector buttons for played dates */}
                <div className="mb-6">
                  <span className="text-[10px] uppercase tracking-wider font-mono opacity-50 block mb-2 font-bold text-left">
                    {lang === 'UA' ? "Швидкий вибір (ігри з результатами):" : "Быстрый выбор (игры с результатами):"}
                  </span>
                  {isLoadingPlayedDates ? (
                    <div className="flex justify-start items-center p-2 gap-2 text-xs opacity-60 font-mono">
                      <CloudLightning className="w-4 h-4 text-emerald-500 animate-spin" />
                      {lang === 'UA' ? "Завантаження дат..." : "Загрузка дат..."}
                    </div>
                  ) : playedDates.length === 0 ? (
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {getPastDates(7).map((dateStr) => {
                        const isActive = archiveDate === dateStr;
                        const parts = dateStr.split('-');
                        const label = `${parts[2]}.${parts[1]}`;
                        const isToday = dateStr === getTodayDateString();

                        return (
                          <button
                            key={dateStr}
                            onClick={async () => {
                              triggerHaptic(15);
                              setArchiveDate(dateStr);
                              setIsLoadingArchive(true);
                              try {
                                const res = await getGameResultsForDate(dateStr);
                                setArchiveResults(res);
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setIsLoadingArchive(false);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 border cursor-pointer
                              ${isActive 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                                : isDarkMode
                                  ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'}`}
                          >
                            {label} {isToday ? ' (Сегодня)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 justify-start max-h-32 overflow-y-auto pr-1">
                      {playedDates.map((dateStr) => {
                        const isActive = archiveDate === dateStr;
                        const parts = dateStr.split('-');
                        const label = `${parts[2]}.${parts[1]}`;
                        const isToday = dateStr === getTodayDateString();

                        return (
                          <button
                            key={dateStr}
                            onClick={async () => {
                              triggerHaptic(15);
                              setArchiveDate(dateStr);
                              setIsLoadingArchive(true);
                              try {
                                const res = await getGameResultsForDate(dateStr);
                                setArchiveResults(res);
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setIsLoadingArchive(false);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 border cursor-pointer
                              ${isActive 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                                : isDarkMode
                                  ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'}`}
                          >
                            {label} {isToday ? ' (Сегодня)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Date Input */}
                <div className="mb-6 flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-xs font-bold font-mono opacity-70">
                    {lang === 'UA' ? "Інша дата:" : "Другая дата:"}
                  </span>
                  <input
                    type="date"
                    value={archiveDate}
                    onChange={async (e) => {
                      const selected = e.target.value;
                      if (!selected) return;
                      setArchiveDate(selected);
                      setIsLoadingArchive(true);
                      try {
                        const res = await getGameResultsForDate(selected);
                        setArchiveResults(res);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsLoadingArchive(false);
                      }
                    }}
                    className={`flex-1 px-3 py-1 rounded-lg border outline-none font-bold text-xs
                      ${isDarkMode 
                        ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                  />
                </div>

                {/* Loaded Archive results grids */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  <h4 className="font-bold text-xs mb-3 tracking-wide uppercase opacity-70 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-500" />
                    {lang === 'UA' ? `Результати за ${archiveDate}` : `Результаты за ${archiveDate}`}
                  </h4>

                  {isLoadingArchive ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <CloudLightning className="w-8 h-8 text-emerald-500 animate-spin" />
                      <span className="text-xs opacity-60 font-mono">
                        {lang === 'UA' ? "Завантаження з хмари..." : "Загрузка из облака..."}
                      </span>
                    </div>
                  ) : archiveResults.filter(r => r.lang === lang).length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs opacity-60">
                      {lang === 'UA'
                        ? "У цей день ніхто ще не зберіг результатів для цієї мови 📪"
                        : "В этот день никто еще не сохранил результаты для этого языка 📪"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                      {archiveResults.filter(r => r.lang === lang).map((player, idx) => (
                        <MiniFriendGrid 
                          key={idx} 
                          player={player} 
                          isDarkMode={isDarkMode} 
                          lang={lang} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fadeIn">
          <div className={`w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative border animate-pop max-h-[90vh] overflow-y-auto
            ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-100 text-slate-800'}`}
          >
            <button 
              id="close-settings-btn"
              onClick={() => { triggerHaptic(10); setShowSettingsModal(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-extrabold text-2xl mb-6 text-center tracking-tight flex items-center justify-center gap-2">
              <Settings className="w-6 h-6 text-emerald-500 animate-spin-slow" />
              {lang === 'UA' ? "Налаштування ⚙️" : "Настройки ⚙️"}
            </h3>

            <div className="space-y-6">
              {/* 1. NICKNAME CHANGE SECTION */}
              <div className="space-y-2">
                <label className="text-xs font-bold font-mono uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  {lang === 'UA' ? "Ваш нікнейм" : "Ваш никнейм"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settingsNickInput}
                    onChange={(e) => setSettingsNickInput(e.target.value.slice(0, 25))}
                    placeholder={lang === 'UA' ? "Введіть нікнейм..." : "Введите никнейм..."}
                    className={`flex-1 px-3 py-2 rounded-xl border outline-none font-bold text-sm transition-all duration-150
                      ${isDarkMode 
                        ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500' 
                        : 'bg-neutral-50 border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                  />
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      const trimmed = settingsNickInput.trim().slice(0, 25);
                      if (trimmed) {
                        localStorage.setItem('wordle_ru_nickname', trimmed);
                        setNickname(trimmed);
                        setNickInput(trimmed);
                        showToast(
                          lang === 'UA' 
                            ? `Нікнейм змінено на "${trimmed}"! ✨` 
                            : `Никнейм изменен на "${trimmed}"! ✨`,
                          "success"
                        );
                      } else {
                        showToast(
                          lang === 'UA' 
                            ? "Нікнейм не може бути порожнім! ❌" 
                            : "Никнейм не может быть пустым! ❌",
                          "error"
                        );
                      }
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                  >
                    {lang === 'UA' ? "Зберегти" : "Сохранить"}
                  </button>
                </div>
                <p className="text-[10px] opacity-50">
                  {lang === 'UA' 
                    ? "Максимум 25 символів. Використовується в таблиці результатів друзів." 
                    : "Максимум 25 символов. Используется в таблице результатов друзей."}
                </p>
              </div>

              {/* 2. THEME SELECTION SECTION */}
              <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <label className="text-xs font-bold font-mono uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  {isDarkMode ? <Moon className="w-4 h-4 text-emerald-500" /> : <Sun className="w-4 h-4 text-emerald-500" />}
                  {lang === 'UA' ? "Тема оформлення" : "Тема оформления"}
                </label>
                <div className="flex bg-neutral-100 dark:bg-neutral-950 rounded-xl p-1 border border-neutral-200/50 dark:border-neutral-800/50">
                  <button
                    onClick={() => { triggerHaptic(10); setIsDarkMode(false); }}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150
                      ${!isDarkMode 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-neutral-400 hover:text-neutral-200'}`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    {lang === 'UA' ? "Світла" : "Светлая"}
                  </button>
                  <button
                    onClick={() => { triggerHaptic(10); setIsDarkMode(true); }}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150
                      ${isDarkMode 
                        ? 'bg-neutral-800 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    {lang === 'UA' ? "Темна" : "Темная"}
                  </button>
                </div>
              </div>

              {/* 3. RESET CURRENT WORD (RESTART GAME) SECTION */}
              <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <label className="text-xs font-bold font-mono uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-emerald-500" />
                  {lang === 'UA' ? "Перезапуск поточної гри" : "Перезапуск текущей игры"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      triggerHaptic(50);
                      handleResetGame(false);
                      setShowSettingsModal(false);
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 border cursor-pointer
                      ${isDarkMode 
                        ? 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800 text-neutral-300' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    {lang === 'UA' ? "До Слово Дня" : "К Слову Дня"}
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic(50);
                      handleResetGame(true);
                      setShowSettingsModal(false);
                    }}
                    className="py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                  >
                    {lang === 'UA' ? "Випадкове" : "Случайное"}
                  </button>
                </div>
                <p className="text-[10px] opacity-50">
                  {lang === 'UA' 
                    ? "Скинути ігрову сітку та загадати нове випадкове слово або повернутися до загального Слова Дня." 
                    : "Сбросить игровую сетку и загадать новое случайное слово или вернуться к общему Слову Дня."}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DAILY PREDICTION MODAL */}
      {showPredictionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none animate-fadeIn">
          <div className={`w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative border animate-pop max-h-[90vh] overflow-y-auto text-center
            ${isDarkMode 
              ? 'bg-gradient-to-b from-neutral-900 to-neutral-950 border-purple-900/40 text-neutral-100' 
              : 'bg-gradient-to-b from-white to-purple-50/30 border-purple-200 text-slate-800'}`}
          >
            <button 
              id="close-prediction-btn"
              onClick={() => { triggerHaptic(10); setShowPredictionModal(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Icon Header */}
            <div className="flex flex-col items-center mt-2 mb-4">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/10 mb-3 animate-pulse-slow">
                <span className="text-3xl">🔮</span>
              </div>
              <h3 className="font-display font-black text-2xl tracking-tight bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent">
                {lang === 'UA' ? "Передбачення на день" : "Предсказание на день"}
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-wider opacity-50 mt-1">
                {getTodayDateString()}
              </p>
            </div>

            {/* Prediction Text Container */}
            <div className={`p-6 md:p-8 rounded-2xl border text-base md:text-lg font-medium leading-relaxed italic relative mb-6 shadow-inner
              ${isDarkMode 
                ? 'bg-neutral-950/60 border-purple-900/30 text-purple-200' 
                : 'bg-purple-100/40 border-purple-200/50 text-purple-950'}`}
            >
              <span className="absolute -top-3 left-4 text-3xl font-serif text-purple-500/20">“</span>
              <p className="relative z-10 px-2 font-display">
                {lang === 'UA' 
                  ? PREDICTIONS_UA[getDailyPredictionIndex(getTodayDateString(), nickname)]
                  : PREDICTIONS_RU[getDailyPredictionIndex(getTodayDateString(), nickname)]
                }
              </p>
              <span className="absolute -bottom-7 right-4 text-3xl font-serif text-purple-500/20">”</span>
            </div>

            {/* Solved Words Today Tracker */}
            <div className="mb-6">
              <div className="text-[11px] font-mono uppercase tracking-wider opacity-60 mb-2">
                {lang === 'UA' ? "Сьогоднішні відгадані слова:" : "Сегодняшние угаданные слова:"}
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {solvedWordsToday.map((w, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 rounded-lg text-xs font-black tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono uppercase"
                  >
                    ✅ {w}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions Panel */}
            <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  triggerHaptic(20);
                  const pred = lang === 'UA' 
                    ? PREDICTIONS_UA[getDailyPredictionIndex(getTodayDateString(), nickname)]
                    : PREDICTIONS_RU[getDailyPredictionIndex(getTodayDateString(), nickname)];
                  
                  const shareText = lang === 'UA'
                    ? `🔮 Моє передбачення у Вордлі на сьогодні:\n"${pred}"\n\nЗіграй теж і отримай своє: https://para-footwear.github.io/wordle-friends/`
                    : `🔮 Моё предсказание в Вордли на сегодня:\n"${pred}"\n\nСыграй тоже и получи своё: https://para-footwear.github.io/wordle-friends/`;

                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareText);
                    showToast(
                      lang === 'UA' ? "Скопійовано в буфер обміну! 📋" : "Скопировано в буфер обмена! 📋",
                      "success"
                    );
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer animate-pulse-slow"
              >
                <Share2 className="w-4 h-4" />
                {lang === 'UA' ? "Поділитися передбаченням" : "Поделиться предсказанием"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
