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
  UserCheck
} from 'lucide-react';
import { getRandomWord, isValidWord, getDailyWord, bannedWords } from './words';
import { saveGameResult, getGameResultsForDate, getAllPlayedDates, PlayerResult } from './firebase';


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

export default function App() {
  // Language switcher state
  const [lang, setLang] = useState<'RU' | 'UA'>(() => {
    const saved = localStorage.getItem('wordle_lang');
    return (saved === 'UA' ? 'UA' : 'RU') as 'RU' | 'UA';
  });

  // Game state
  const [isOriginalMode, setIsOriginalMode] = useState<boolean>(true); // True means "Слово Дня" (Daily), False means "Случайное" (Random)
  const [targetWord, setTargetWord] = useState<string>(() => getDailyWord(lang));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<'IN_PROGRESS' | 'WON' | 'LOST'>('IN_PROGRESS');
  
  // Custom toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  
  // Row shaking animation
  const [shakingRowIndex, setShakingRowIndex] = useState<number | null>(null);
  
  // Red highlight for banned word row
  const [bannedRowIndex, setBannedRowIndex] = useState<number | null>(null);

  // Game statistics
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('wordle_ru_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.gamesPlayed === 'number' && Array.isArray(parsed.guessDistribution)) {
          return parsed;
        }
      } catch (e) {
        return defaultStats;
      }
    }
    return defaultStats;
  });

  // Helper: Get today's date string YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  };

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
  const uploadDailyResult = async (finalGuesses: string[], isWon: boolean) => {
    if (!isOriginalMode) return;
    if (!nickname) return;
    setIsSavingResult(true);
    try {
      const todayStr = getTodayDateString();
      await saveGameResult(todayStr, nickname, finalGuesses, isWon, lang, targetWord);
      showToast(lang === 'UA' ? "Результати збережено в хмарі! ☁️" : "Результаты сохранены в облако! ☁️", "success");
      await loadFriendsResults();
    } catch (error) {
      console.error("Error saving result to Firestore:", error);
      showToast(lang === 'UA' ? "Помилка збереження в хмару ❌" : "Ошибка сохранения в облако ❌", "error");
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
    if (isOriginalMode) {
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
    if (isOriginalMode && nickname && (gameStatus === 'WON' || gameStatus === 'LOST') && guesses.length > 0 && targetWord) {
      const todayStr = getTodayDateString();
      const uploadKey = `wordle_ru_uploaded_${todayStr}_${lang}_${nickname}`;
      const alreadyUploaded = localStorage.getItem(uploadKey);
      if (!alreadyUploaded) {
        uploadDailyResult(guesses, gameStatus === 'WON');
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
            return;
          }
        } catch (e) {
          // Fall through
        }
      }
    }
    
    setGuesses([]);
    setGameStatus('IN_PROGRESS');
  }, [isOriginalMode, lang]);

  // Trigger Info Modal on first visit ever
  useEffect(() => {
    const visited = localStorage.getItem('wordle_ru_visited');
    if (!visited) {
      setShowInfoModal(true);
      localStorage.setItem('wordle_ru_visited', 'true');
    }
  }, []);

  // Show status toasts on game completion
  useEffect(() => {
    if (gameStatus === 'WON') {
      const message = lang === 'UA' 
        ? "Вітаємо! Ви відгадали слово! 🎉" 
        : "Поздравляем! Вы угадали слово! 🎉";
      showToast(message, "success");
      setTimeout(() => setShowStatsModal(true), 1500);
    } else if (gameStatus === 'LOST') {
      const message = lang === 'UA'
        ? `Ви не відгадали. Загадане слово: ${targetWord} 🥺`
        : `Вы не отгадали. Загаданное слово: ${targetWord} 🥺`;
      showToast(message, "error");
      setTimeout(() => setShowStatsModal(true), 2000);
    }
  }, [gameStatus, targetWord, lang]);

  // Helper to trigger custom toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);
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

  // Keyboard layout rows (ЙЦУКЕН / UA layout)
  const keyboardRows = lang === 'UA' ? [
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ї"],
    ["Ф", "І", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Є", "Ґ"],
    ["ENTER", "Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "BACKSPACE"]
  ] : [
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
    ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
    ["ENTER", "Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "BACKSPACE"]
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
      uploadDailyResult(newGuesses, true);
    } else if (newGuesses.length >= 6) {
      setGameStatus('LOST');
      updateStats(false, 6);
      uploadDailyResult(newGuesses, false);
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
    localStorage.setItem('wordle_ru_stats', JSON.stringify(updatedStats));
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
      if (showStatsModal || showInfoModal) return;
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
      <div className={`min-h-screen font-sans flex flex-col items-center justify-center p-4 transition-colors duration-300
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
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 select-none
      ${isDarkMode 
        ? 'bg-neutral-950 text-neutral-100' 
        : 'bg-white text-neutral-900'
      }`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-medium text-sm md:text-base border transition-all duration-300 animate-pop
          ${toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-300' 
            : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-950 dark:text-rose-300'
              : 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100'
          }`}
        >
          {toast.type === 'success' && <Sparkles className="w-4 h-4 text-emerald-500 animate-bounce" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className={`py-4 px-4 border-b flex justify-between items-center max-w-lg mx-full w-full mx-auto
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

          <button 
            id="stats-btn"
            onClick={() => setShowStatsModal(true)} 
            className={`p-1.5 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            title={lang === 'UA' ? "Статистика" : "Статистика"}
          >
            <BarChart2 className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          
          <button 
            id="theme-btn"
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`p-1.5 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            title={isDarkMode ? (lang === 'UA' ? "Світла тема" : "Светлая тема") : (lang === 'UA' ? "Темна тема" : "Темная тема")}
          >
            {isDarkMode ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-amber-400" /> : <Moon className="w-5 h-5 md:w-6 md:h-6" />}
          </button>

          <button 
            id="reset-btn"
            onClick={() => handleResetGame(false)} 
            className={`p-1.5 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            title={lang === 'UA' ? "Скинути до Слова Дня" : "Сбросить к Слову Дня"}
          >
            <RotateCcw className="w-5 h-5 md:w-5 md:h-5 text-rose-500" />
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
      <footer className="pb-6 px-1 md:px-4 max-w-lg w-full mx-auto">
        <div id="virtual-keyboard" className="flex flex-col gap-1.5 md:gap-2 select-none">
          {keyboardRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center w-full gap-1 md:gap-1.5">
              {row.map((key) => {
                const isSpecialKey = key === "ENTER" || key === "BACKSPACE";
                const status = keyStatuses[key] || null;
                
                let keyColorClass = "bg-wordle-border-empty text-neutral-800 hover:bg-neutral-300 active:bg-neutral-400 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600";
                
                if (status === 'correct') {
                  keyColorClass = "bg-wordle-correct text-white dark:bg-wordle-correct-dark";
                } else if (status === 'present') {
                  keyColorClass = "bg-wordle-present text-white dark:bg-wordle-present-dark";
                } else if (status === 'absent') {
                  keyColorClass = "bg-wordle-absent text-white/90 dark:bg-neutral-900 dark:text-neutral-500";
                }
 
                if (isSpecialKey) {
                  keyColorClass = "bg-wordle-border-empty text-neutral-800 hover:bg-neutral-300 active:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600 px-1 md:px-3 text-[10px] md:text-xs font-bold";
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

            {/* Today's Friends Grids */}
            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <h4 className="font-bold text-xs mb-3 tracking-wide uppercase opacity-70 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                {lang === 'UA' ? "Сьогоднішні сітки друзів" : "Сегодняшние сетки друзей"}
              </h4>

              {friendsResults.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs opacity-60">
                  {lang === 'UA'
                    ? "Інші гравці ще не закінчили сьогоднішню гру ⏳"
                    : "Другие игроки еще не закончили сегодняшнюю игру ⏳"}
                </div>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                  {friendsResults.map((player, idx) => (
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
              ) : archiveResults.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs opacity-60">
                  {lang === 'UA'
                    ? "У цей день ніхто ще не зберіг результатів 📪"
                    : "В этот день никто еще не сохранил результаты 📪"}
                </div>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                  {archiveResults.map((player, idx) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
