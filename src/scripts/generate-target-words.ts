import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dictionaryRU, dictionaryUA } from '../words.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Letter frequency scores for Russian (based on noun corpus)
const freqRU: Record<string, number> = {
  'О': 11.0, 'Е': 8.5, 'А': 8.0, 'И': 7.4, 'Н': 6.7, 'Т': 6.3, 'С': 5.5, 'Р': 4.7, 'В': 4.5, 'Л': 4.4,
  'К': 3.5, 'М': 3.2, 'Д': 3.0, 'П': 2.8, 'У': 2.6, 'Я': 2.0, 'Ы': 1.9, 'Ь': 1.7, 'Г': 1.7, 'З': 1.7,
  'Б': 1.6, 'Ч': 1.4, 'Й': 1.2, 'Х': 1.0, 'Ж': 0.9, 'Ш': 0.7, 'Ю': 0.6, 'Ц': 0.5, 'Щ': 0.4, 'Э': 0.3,
  'Ф': 0.3, 'Ъ': 0.1
};

// Letter frequency scores for Ukrainian
const freqUA: Record<string, number> = {
  'О': 9.5, 'А': 8.3, 'И': 8.0, 'Н': 7.6, 'В': 5.2, 'І': 5.2, 'Е': 4.9, 'Р': 4.8, 'Т': 4.8, 'С': 4.1,
  'К': 3.9, 'Л': 3.7, 'Д': 3.3, 'М': 3.1, 'У': 3.1, 'П': 2.9, 'Я': 2.7, 'Ь': 2.5, 'Г': 1.8, 'З': 1.8,
  'Б': 1.7, 'Ч': 1.4, 'Й': 1.2, 'Х': 1.2, 'Ж': 1.0, 'Ш': 0.9, 'Ї': 0.8, 'Ц': 0.8, 'Ю': 0.7, 'Є': 0.5,
  'Щ': 0.5, 'Ф': 0.3, 'Ґ': 0.2
};

// Whitelists of common words with rare letters
const whitelistRU_Ф = new Set([
  "ФАКЕЛ", "ФИРМА", "СФЕРА", "ШКАФ", "КЕФИР", "ЗЕФИР", "ШАРФ", "ФОРМА", "ФРАЗА", "ФИЛЬМ", "ФАКТ",
  "ФОКУС", "ГОЛЬФ", "ОЛИФА", "ШЕРИФ", "СИФОН", "ФОТО", "БУФЕТ", "ШЕФ", "ТАКСИ", "ФРАК", "ФУТЛЯ",
  "КОФТА", "АФЕРА", "АФИША", "ОЛИФА", "ЛИМФА", "ЖИРАФ", "НИМФА", "ТРИУМ", "ФАУНА", "ФАУСТ", "ТЮФЯК"
]);

const whitelistRU_Э = new Set([
  "ЭКРАН", "ЭПОХА", "ЭЛИТА", "ЭФИР", "ПОЭТ", "ЭСКИЗ", "ДУЭЛЬ", "ЭТИКА", "ЭТНОС", "ЭМАЛЬ", "БИЗНЭ", "ПЮРЭ", "АЛОЭ"
]);

const whitelistRU_Щ = new Set([
  "ЯЩИК", "РОЩА", "ТЕЩА", "ПИЩА", "КЛЕЩ", "ВЕЩЬ", "ПРЫЩ", "ПЛАЩ", "ЩЕКА", "ЩУКА", "ЩЕЛЬ", "ГУЩА",
  "НИЩИЙ", "ХВОЩ", "ЩЕПКА", "ОБЩИЙ", "ЩАВЕЛ", "ЩИПАТ", "ЩЕГОЛ", "ОБЩИН"
]);

const whitelistRU_Ъ = new Set([
  "ОБЪЕМ", "СЪЕЗД", "ИЗЪЯН", "ОБЪЕЗ", "СЪЕМК"
]);

const whitelistUA_Ф = new Set([
  "ФАКЕЛ", "ФІРМА", "ФОРМА", "ФІЛЬМ", "СФЕРА", "ШАРФ", "ЖИРАФ", "КЕФІР", "ОЛІФА", "КОФТА", "ФОКУС",
  "ФРАЗА", "ФРОНТ", "ФРУКТ", "БУФЕТ", "АФЕРА", "АФІША", "ТАРИФ", "ШЕРИФ", "ШКАФ"
]);

const whitelistUA_Ґ = new Set([
  "ҐРУНТ", "ҐРАТИ", "ҐРОНО", "АҐРУС", "ДЗИҐА", "ҐАНОК", "ҐАЗДА", "ҐАНДЖ", "ҐЕВАЛ", "ҐУҐЛЯ"
]);

function getWordScore(word: string, freqMap: Record<string, number>): number {
  let score = 0;
  const uniqueChars = new Set(word.toUpperCase().split(''));
  for (const char of uniqueChars) {
    score += freqMap[char] || 0;
  }
  return score;
}

function filterAlgorithmicRU(words: string[]): string[] {
  const filtered = words.filter(word => {
    word = word.toUpperCase().trim();
    
    // Must be exactly 5 letters of Russian alphabet
    if (!/^[А-Я]{5}$/.test(word)) return false;
    
    // No verbs ending in infinitive like -АТЬ, -ЯТЬ, -ИТЬ, -ЕТЬ, -ОТЬ, -УТЬ, -ЫТЬ
    if (/[АЕИОУЫЭЮЯ]ТЬ$/.test(word)) return false;
    
    // No verbs/plurals ending in -ТИ, -ЛИ, -ТЬСЯ
    if (word.endsWith('ТИ') || word.endsWith('ЛИ')) return false;
    if (word.endsWith('СЯ')) return false;
    
    // No plurals/adjectives ending in -ЫЕ, -ИЕ, -ОЕ, -ЫЙ, -ИЙ
    if (word.endsWith('ЫЙ') || word.endsWith('ИЙ')) return false;
    if (word.endsWith('ЫЕ') || word.endsWith('ИЕ')) return false;
    
    // No nouns ending in plural markers -Ы, -И (except whitelisted singulars like КИВИ, ТАКСИ, ЖЮРИ)
    const allowedEndsInI = ["КИВИ", "ТАКСИ", "ЖЮРИ", "ПОНИ", "ШАССИ", "ПЕНСИ", "МИДИ", "БИКИ", "ЦУНАМИ"];
    if (word.endsWith('Ы')) return false;
    if (word.endsWith('И') && !allowedEndsInI.some(w => word.endsWith(w))) return false;
    
    // No ending in -У, -Ю (oblique cases) unless whitelisted (e.g., МЕНЮ, ШОУ)
    const allowedEndsInU = ["МЕНЮ", "АВЕНЮ", "ШОУ"];
    if ((word.endsWith('У') || word.endsWith('Ю')) && !allowedEndsInU.some(w => word.endsWith(w))) return false;
    
    // Exclude words starting with Ь, Ъ, Ы
    if (/^[ЬЪЫ]/.test(word)) return false;
    
    // Filter rare letters Ф, Э, Щ, Ъ unless whitelisted
    if (word.includes('Ф') && !whitelistRU_Ф.has(word)) return false;
    if (word.includes('Э') && !whitelistRU_Э.has(word)) return false;
    if (word.includes('Щ') && !whitelistRU_Щ.has(word)) return false;
    if (word.includes('Ъ') && !whitelistRU_Ъ.has(word)) return false;
    
    // Exclude double rare letter starts
    if (/^[ФЦЩЭЮ][ФЦЩЭЮ]/.test(word)) return false;
    
    return true;
  });

  // Sort by frequency score descending to keep the most natural common words
  return filtered
    .map(word => ({ word, score: getWordScore(word, freqRU) }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.word);
}

function filterAlgorithmicUA(words: string[]): string[] {
  const filtered = words.filter(word => {
    word = word.toUpperCase().trim();
    
    // Must be exactly 5 letters of Ukrainian alphabet
    if (!/^[А-ЩЬЮЯЄІЇҐ]{5}$/.test(word)) return false;
    
    // No verbs ending in infinitive like -АТИ, -ЯТИ, -ИТИ, -ЕТИ, -УТИ, -ОТИ, -ТИ
    if (/[АЕИОУЮЯЄІЇ]ТИ$/.test(word)) return false;
    
    // No plurals/adjectives ending in -И, -Ы, -І (except whitelisted plural-only nouns or foreign words)
    const allowedEndsInI_UA = ["ДВЕРІ", "ГРОШІ", "ТАКСІ", "БЕРЦІ", "КІВІ", "ПОНІ", "ШАССІ", "МЕНЮ", "АВЕНЮ"];
    if (word.endsWith('И') || word.endsWith('Ы')) return false;
    if (word.endsWith('І') && !allowedEndsInI_UA.some(w => word.endsWith(w))) return false;
    
    // No adjectives ending in -ИЙ, -ІЙ
    if (word.endsWith('ИЙ') || word.endsWith('ІЙ')) return false;
    
    // No verbs/plurals ending in -ЛИ
    if (word.endsWith('ЛИ')) return false;
    
    // Exclude words starting with Ь
    if (word.startsWith('Ь')) return false;
    
    // Filter rare letters Ф, Ґ unless whitelisted
    if (word.includes('Ф') && !whitelistUA_Ф.has(word)) return false;
    if (word.includes('Ґ') && !whitelistUA_Ґ.has(word)) return false;
    
    return true;
  });

  // Sort by frequency score descending to keep the most natural common words
  return filtered
    .map(word => ({ word, score: getWordScore(word, freqUA) }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.word);
}

async function main() {
  console.log('Starting advanced frequency-based linguistic filtering...');

  // Filter and slice Russian words to keep ~2,500 of the absolute highest-frequency words
  console.log(`Initial Russian dictionary size: ${dictionaryRU.length}`);
  const filteredRU = filterAlgorithmicRU(dictionaryRU);
  // Keep the top 2,500 words
  const targetRU = filteredRU.slice(0, 2500).sort();
  console.log(`Frequency-filtered Russian target words count: ${targetRU.length}`);

  // Filter and slice Ukrainian words to keep ~2,200 of the absolute highest-frequency words
  console.log(`Initial Ukrainian dictionary size: ${dictionaryUA.length}`);
  const filteredUA = filterAlgorithmicUA(dictionaryUA);
  // Keep the top 2,200 words
  const targetUA = filteredUA.slice(0, 2200).sort();
  console.log(`Frequency-filtered Ukrainian target words count: ${targetUA.length}`);

  // Safeguard check
  if (targetRU.length < 500 || targetUA.length < 500) {
    console.error('Linguistic filtering resulted in too few words. Aborting overwrite.');
    process.exit(1);
  }

  // Rewrite src/words.ts
  const wordsTsPath = path.resolve(__dirname, '../words.ts');
  const originalWordsContent = fs.readFileSync(wordsTsPath, 'utf8');

  // Truncate original content cleanly at the first occurrence of export const targetWordsRU or similar helper
  const originalLines = originalWordsContent.split('\n');
  let truncateIndex = originalLines.findIndex(line => line.includes('export const targetWordsRU'));
  if (truncateIndex === -1) {
    // Fallback search
    truncateIndex = originalLines.findIndex(line => line.includes('=== РУССКИЕ ЦЕЛЕВЫЕ СЛОВА ===') || line.includes('targetWordsRU'));
  }
  if (truncateIndex === -1) {
    // If not found, use a safe line count
    truncateIndex = 21517;
  }

  const baseContent = originalLines.slice(0, truncateIndex).join('\n');

  const updatedCode = `

// === РУССКИЕ ЦЕЛЕВЫЕ СЛОВА (Отфильтрованные: только популярные и общеизвестные) ===
export const targetWordsRU: string[] = [
${targetRU.map(w => '  "' + w + '"').join(',\n')}
];

// === УКРАЇНСЬКІ ЦІЛЬОВІ СЛОВА (Відфільтровані: тільки популярні та загальновідомі) ===
export const targetWordsUA: string[] = [
${targetUA.map(w => '  "' + w + '"').join(',\n')}
];

// Helper to check if a word is a valid 5-letter word for the given language
export function isValidWord(word: string, lang: 'RU' | 'UA'): boolean {
  const upperWord = word.toUpperCase();
  const list = lang === 'UA' ? dictionaryUA : dictionaryRU;
  return list.includes(upperWord);
}

// Get a random 5-letter word from the list of the given language (excluding banned words)
export function getRandomWord(lang: 'RU' | 'UA'): string {
  const list = lang === 'UA' ? targetWordsUA : targetWordsRU;
  const filteredList = list.filter(word => !bannedWords.includes(word.toUpperCase()));
  if (filteredList.length === 0) {
    return lang === 'UA' ? 'ДУМКА' : 'СЛОВО';
  }
  const randomIndex = Math.floor(Math.random() * filteredList.length);
  return filteredList[randomIndex].toUpperCase();
}

// Get deterministic Daily Word based on active dictionary and date string (excluding banned words)
export function getDailyWord(lang: 'RU' | 'UA'): string {
  const list = lang === 'UA' ? targetWordsUA : targetWordsRU;
  const filteredList = list.filter(word => !bannedWords.includes(word.toUpperCase()));
  if (filteredList.length === 0) {
    return lang === 'UA' ? 'ДУМКА' : 'СЛОВО';
  }
  
  // Choose seed based on date string (YYYY-MM-DD)
  const today = new Date();
  const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  // Deterministic seed hashing with FNV-1a and bit mixing (avalanche mix) to prevent sequential values
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  // High-quality 32-bit mixing to ensure consecutive dates map to vastly different indices (avalanche effect)
  hash += hash << 13;
  hash ^= hash >> 7;
  hash += hash << 3;
  hash ^= hash >> 17;
  hash += hash << 5;
  hash = hash >>> 0;
  
  const index = hash % filteredList.length;
  return filteredList[index].toUpperCase();
}
`;

  fs.writeFileSync(wordsTsPath, baseContent + updatedCode);
  console.log(`Words file updated successfully! Russian: ${targetRU.length} targets, Ukrainian: ${targetUA.length} targets.`);
}

main().catch(console.error);
