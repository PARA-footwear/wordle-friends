const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables if any
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is not defined.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

async function main() {
  console.log('Reading 5-letter Russian words from local w1-w4 files...');
  let words = [];
  
  try {
    for (let i = 1; i <= 4; i++) {
      const fileContent = fs.readFileSync(`w${i}.txt`, 'utf8');
      const fileWords = fileContent.trim().split(/\s+/).map(w => w.trim()).filter(Boolean);
      words.push(...fileWords);
      console.log(`Loaded ${fileWords.length} words from w${i}.txt`);
    }
  } catch (error) {
    console.error('Error reading local word files:', error.message);
    process.exit(1);
  }

  // Sanitize and filter
  const sanitized = words
    .map(w => w.trim().toLowerCase().replace('ё', 'е'))
    .filter(w => /^[а-я]{5}$/.test(w));
    
  const uniqueRussianWords = [...new Set(sanitized)].sort();
  console.log(`Unique validated Russian words: ${uniqueRussianWords.length}`);

  if (uniqueRussianWords.length < 150) {
    console.error('Error: Too few words fetched. Aborting.');
    process.exit(1);
  }

  // Read Ukrainian list from generate.cjs
  console.log('Reading Ukrainian wordlist from generate.cjs...');
  const generateCjsContent = fs.readFileSync('generate.cjs', 'utf8');
  
  // Extract rawUA content between the backticks
  const rawUAMatch = generateCjsContent.match(/const rawUA = `([\s\S]*?)`;/);
  if (!rawUAMatch) {
    console.error('Error: Could not find rawUA definition in generate.cjs');
    process.exit(1);
  }

  const rawUA = rawUAMatch[1];
  const wordsUA = rawUA.trim().split(/\s+/).map(w => w.trim().toLowerCase().replace('ё', 'е')).filter(w => /^[а-яєіїґ]{5}$/.test(w));
  const uniqueUA = [...new Set(wordsUA)].sort();
  console.log(`Processed UA words: ${uniqueUA.length}`);

  // Create src/words.ts
  const outContent = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// === БАН-ЛИСТ (Слова, которые нельзя загадывать и вводить) ===
export const bannedWords = [
  "АДЕПТ", 
  "КОНУС"
];

// === РУССКИЙ СЛОВАРЬ (Полный, проверенный) ===
export const dictionaryRU: string[] = [
${uniqueRussianWords.map(w => '  "' + w.toUpperCase() + '"').join(',\n')}
];

// === УКРАИНСЬКИЙ СЛОВНИК (Полный, проверенный) ===
export const dictionaryUA: string[] = [
${uniqueUA.map(w => '  "' + w.toUpperCase() + '"').join(',\n')}
];

// Helper to check if a word is a valid 5-letter word for the given language
export function isValidWord(word: string, lang: 'RU' | 'UA'): boolean {
  const upperWord = word.toUpperCase();
  const list = lang === 'UA' ? dictionaryUA : dictionaryRU;
  return list.includes(upperWord);
}

// Get a random 5-letter word from the list of the given language (excluding banned words)
export function getRandomWord(lang: 'RU' | 'UA'): string {
  const list = lang === 'UA' ? dictionaryUA : dictionaryRU;
  const filteredList = list.filter(word => !bannedWords.includes(word.toUpperCase()));
  if (filteredList.length === 0) {
    return lang === 'UA' ? 'ДУМКА' : 'СЛОВО';
  }
  const randomIndex = Math.floor(Math.random() * filteredList.length);
  return filteredList[randomIndex].toUpperCase();
}

// Get deterministic Daily Word based on active dictionary and date string (excluding banned words)
export function getDailyWord(lang: 'RU' | 'UA'): string {
  const list = lang === 'UA' ? dictionaryUA : dictionaryRU;
  const filteredList = list.filter(word => !bannedWords.includes(word.toUpperCase()));
  if (filteredList.length === 0) {
    return lang === 'UA' ? 'ДУМКА' : 'СЛОВО';
  }
  
  // Choose seed based on date string (YYYY-MM-DD)
  const today = new Date();
  const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  // Deterministic seed hashing
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % filteredList.length;
  return filteredList[index].toUpperCase();
}
`;

  fs.writeFileSync('src/words.ts', outContent);
  console.log('Words file created successfully in src/words.ts.');
}

main().catch(console.error);
