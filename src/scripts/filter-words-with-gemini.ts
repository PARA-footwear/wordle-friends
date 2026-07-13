import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini SDK
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is missing.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Import original words dynamically by reading the file
const wordsTsPath = path.resolve(__dirname, '../words.ts');
const wordsContent = fs.readFileSync(wordsTsPath, 'utf8');

// Simple regex parser to extract targetWordsRU and targetWordsUA arrays
function extractArray(content: string, varName: string): string[] {
  const regex = new RegExp(`export const ${varName}: string\\[\\] = \\[([\\s\\S]*?)\\];`, 'm');
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(w => w.trim().replace(/['"]/g, ''))
    .filter(w => w.length === 5);
}

const originalRU = extractArray(wordsContent, 'targetWordsRU');
const originalUA = extractArray(wordsContent, 'targetWordsUA');

console.log(`Loaded ${originalRU.length} Russian target words and ${originalUA.length} Ukrainian target words.`);

// Local heuristic/algorithmic fallback filter if Gemini API is completely unavailable (quota exhausted)
function fallbackFilterRU(words: string[]): string[] {
  console.log('Running robust local fallback filter for Russian words...');
  
  // Blacklist of highly obscure/technical/dialect patterns in 5-letter words
  const obscurePrefixes = [
    'АБИ', 'АБР', 'АБС', 'АВГ', 'АВИ', 'АВЛ', 'АГН', 'АГО', 'АДЕ', 'АДН', 'АДР', 'АЖГ', 'АЙО', 'АЙР', 'АЙС', 
    'АКК', 'АКМ', 'АКН', 'АКР', 'АКС', 'АКТО', 'АЛА', 'АЛГ', 'АЛЕУ', 'АЛК', 'АЛЛ', 'АЛО', 'АЛТ', 'АЛУ', 'АМВ', 
    'АМИ', 'АММ', 'АНГ', 'АНД', 'АНИЕ', 'АНИМ', 'АНИО', 'АНК', 'АНН', 'АНО', 'АНС', 'АНТ', 'АОР', 'АПИ', 'АПЛ', 
    'АПР', 'АПТ', 'АРД', 'АРЗ', 'АРИ', 'АРК', 'АРМ', 'АРО', 'АРС', 'АРТ', 'АРШ', 'АСА', 'АСК', 'АСП', 'АСТ', 
    'АСЦ', 'АТТ', 'АУР', 'АХО', 'АЯН', 'АЯЦ', 'БАД', 'БАЗ', 'БАК', 'БАРО', 'БАСО', 'БАСТ', 'БАТИ', 'БАТО', 
    'БАТУ', 'БАУ', 'БАЦ', 'БЕМ', 'БЕРД', 'БЕРМ', 'БЕРС', 'БЕРТ', 'БЕРЦ', 'БИАК', 'БИГ', 'БИКО', 'БИКН', 
    'БИКС', 'БИНЕ', 'БИНО', 'БИОЗ', 'БИОН', 'БИОТ', 'БИП', 'БИСТ', 'БИШ', 'БЛАС', 'БЛИН', 'БОЙ', 'БОКА', 
    'БОКИТ', 'БОЛЕТ', 'БОНГ', 'БОНЕ', 'БОНЗ', 'БОНК', 'БОНН', 'БОРА', 'БОРЕ', 'БОРИ', 'БОТУ', 'БОЧА', 'БРОШ',
    'ВЕНГ', 'ДИНА', 'ДИНЕ', 'ДИНО', 'ДИО', 'ДИХ', 'ДОБЛ', 'ДОВГ', 'ДОГР', 'ДОДИ', 'ДОЖИ', 'ДОЖИ', 'ДОЙН', 
    'ДОЙР', 'ДОЛИ', 'ДОЛМ', 'ДОМЕ', 'ДОМЕ', 'ДОМИ', 'ДОМН', 'ДОМР', 'ДОНУ', 'ДОПА', 'ДОСЕ', 'ДОСЫ', 'ДОУЛ', 
    'ДРАЕ', 'ДУАН', 'ДУНИ', 'ДУРО', 'ДУСЕ', 'ДУТА', 'ЕЛАН', 'ЕМЧ', 'ЕМШ', 'ЕНА', 'ЕНО', 'ЕРИ', 'ЕРО', 'ЕХИ', 
    'ЖАКО', 'ЖАЛО', 'ЖЕД', 'ЖЕЛН', 'ЖЕО', 'ЖЕСТ', 'ЖИРА', 'КОНО', 'ОБЬЕ', 'СЪЕМ', 'ОБЪЕ', 'ИЗЪЯ'
  ];

  const obscureSuffixes = [
    'ИТ', 'ОЛ', 'ОН', 'ИС', 'УС', 'ИН', 'ИД', 'АТ', 'ЕН', 'ЕТ', 'ЕС', 'ЕЙ', 'АР', 'АК'
  ];

  // Whitelist of words that might contain those prefixes/suffixes but are actually common
  const strictWhitelist = new Set([
    'АБОРТ', 'АВАНС', 'АВЕНЮ', 'АВТОР', 'АГЕНТ', 'АНГЕЛ', 'АНИМЕ', 'АНОНС', 'АОРТА', 'АРЕАЛ', 'АРЕНА', 
    'АРЕСТ', 'АРМИЯ', 'АРХИВ', 'АСКЕТ', 'АТЛЕТ', 'АТОЛЛ', 'АУДИО', 'АУДИТ', 'АЦТЕК', 'БАГЕТ', 'БАГОР', 
    'БАЛЕТ', 'БАЛОК', 'БАРИН', 'БАРОН', 'БАТОН', 'БЕДРО', 'БЕКАС', 'БЕКОН', 'БЕЛКА', 'БЕЛОК', 'БЕТОН', 
    'БИВАК', 'БИДОН', 'БИЗОН', 'БИЛЕТ', 'БИНГО', 'БИНОМ', 'БИРКА', 'БИСЕР', 'БИТВА', 'БИТКА', 'БИТОК', 
    'БЛАГО', 'БЛОХА', 'БОБЕР', 'БОКАЛ', 'БОЛИД', 'БОНУС', 'БОРЕЦ', 'БОЧКА', 'БРАВО', 'БРОНХ', 'БРОНЬ', 
    'БРОНЯ', 'БУТОН', 'ВАГОН', 'ВАЗОН', 'ВАЛЕТ', 'ВАЛИК', 'ВАЛУН', 'ВБРОС', 'ВДОВА', 'ВЕГАН', 'ВЕДРО', 
    'ВЕНИК', 'ВЕНОК', 'ВЕРБА', 'ВЕСЛО', 'ВЕСНА', 'ВЕСТЬ', 'ВЕТКА', 'ВЗДОР', 'ВЗЛЕТ', 'ВЗЛОМ', 'ВЗНОС', 
    'ВИДЕО', 'ВИЛКА', 'ВИРАЖ', 'ВИРУС', 'ВИСОК', 'ВИТОК', 'ВОБЛА', 'ВОДКА', 'ВОЖАК', 'ВОЗНЯ', 'ВОЙНА', 
    'ВОКАЛ', 'ВОЛАН', 'ВОЛНА', 'ВОЛОС', 'ВОЛЬТ', 'ВОРОН', 'ВОРОТ', 'ВЫЛЕТ', 'ВЫНОС', 'ГАЗОН', 'ГАЛОП', 
    'ГАРЕМ', 'ГЕНОМ', 'ГЕРОЙ', 'ГЕТРА', 'ГЕТТО', 'ГИДРА', 'ГИЕНА', 'ГЛИНА', 'ГЛИСТ', 'ГНИДА', 'ГОНЕЦ', 
    'ГОНКА', 'ГОПАК', 'ГОРЕЦ', 'ГОРКА', 'ГОСТЬ', 'ГРАНТ', 'ГРЕЗА', 'ГРИВА', 'ГРОЗА', 'ДЕБОШ', 'ДЕВИЗ', 
    'ДЕВКА', 'ДЕКАН', 'ДЕКОР', 'ДЕМОН', 'ДЕНИМ', 'ДЕСНА', 'ДЕТКА', 'ДИВАН', 'ДИЕТА', 'ДИЛЕР', 'ДИНАР', 
    'ДИНГО', 'ДИСКО', 'ДЛИНА', 'ДОГМА', 'ДОЙКА', 'ДОКЕР', 'ДОЛИВ', 'ДОЛМА', 'ДОМЕН', 'ДОМИК', 'ДОМНА', 
    'ДОНОР', 'ДОНОС', 'ДОСКА', 'ДОСЬЕ', 'ДОЧКА', 'ДРАЖЕ', 'ДРЕВО', 'ДРЕМА', 'ДРОВА', 'ЕГОЗА', 'ЕЖИХА', 
    'ЕЗДОК', 'ЕРШИК', 'ЕСАУЛ', 'ЖАКЕТ', 'ЖЕЛОБ', 'ЖЕРЛО', 'ЖЕТОН', 'ЖИВОТ', 'ЖИЛЕТ', 'ЖОКЕЙ', 'ЗАБОР', 
    'ЗАВЕТ', 'ЗАВОД', 'ЗАВОЗ', 'ЗАГОН', 'ЗАДЕЛ', 'ЗАДОК', 'ЗАДОР', 'ЗАКОН', 'ЗАЛЕТ', 'ЗАЛИВ', 'ЗАЛОГ', 
    'ЗАЛОМ', 'ЗАМЕР', 'ЗАМЕС', 'ЗАМЕТ', 'ЗАМИН', 'ОБЪЕМ', 'СЪЕЗД', 'ИЗЪЯН', 'СЪЕМК'
  ]);

  return words.filter(word => {
    word = word.toUpperCase().trim();
    if (strictWhitelist.has(word)) return true;
    
    // Check obscure prefixes
    for (const prefix of obscurePrefixes) {
      if (word.startsWith(prefix)) return false;
    }

    // Check obscure suffixes if the word starts with rare patterns
    if (word.startsWith('А') || word.startsWith('Б') || word.startsWith('Д') || word.startsWith('Е')) {
      for (const suffix of obscureSuffixes) {
        if (word.endsWith(suffix)) return false;
      }
    }

    // Exclude obviously rare words that look like chemical or medical terms
    if (/^[А-Я]И[ПТКМС][ИОА][НЛТ]$/.test(word)) return false; // e.g. АПИИН, АПИТО, БИКОЛ

    return true;
  });
}

function fallbackFilterUA(words: string[]): string[] {
  console.log('Running robust local fallback filter for Ukrainian words...');
  
  // High quality list of common Ukrainian words
  const strictWhitelistUA = new Set([
    'АБОРТ', 'АВАНС', 'АВТОР', 'АГЕНТ', 'АНГЕЛ', 'АНОНС', 'АРЕНА', 'АРЕСТ', 'АРХІВ', 'АТЛЕТ', 'АТЛАС', 
    'БАГЕТ', 'БАГОР', 'БАЙКА', 'БАЛЕТ', 'БАЛКА', 'БАНКА', 'БАРАН', 'БАРОН', 'БАРКА', 'БАТОН', 'БАШТА', 
    'СТЕЛА', 'СТЕПЬ', 'СТІНА', 'СТРУМ', 'СУСІД', 'СУХАР', 'ТАБЛО', 'ТАБУН', 'ТАКСІ', 'ТАЛАН', 'ТАРИФ', 
    'ТЕАТР', 'ТЕКСТ', 'ТЕПЛО', 'ТЕРЕМ', 'ТИГРИ', 'ТИКВА', 'ТИРАЖ', 'ТИТАН', 'ТИЧКА', 'ТКАЧУ', 'ТОКАР', 
    'ТОЛКА', 'ТОМАТ', 'ТОННА', 'ТОПКА', 'ТОПІР', 'ТОРФУ', 'ТОЧКА', 'ТРАВА', 'ТРАКТ', 'ТРИКО', 'ТРИОН', 
    'ТРОПА', 'ТРОНУ', 'ТРУБА', 'ТРУНА', 'ТРУПИ', 'ТУЗИН', 'ТУМБА', 'ТУПІК', 'ТУРКА', 'ТУФЛЯ', 'ТЮТЮН', 
    'УБОРУ', 'УЗВАР', 'УКЛОН', 'УКРОП', 'УМОВА', 'УНЦІЯ', 'УПЛИВ', 'УРОКИ', 'УСТАВ', 'УСТЬЄ', 'УТРИМ', 
    'УЧЕНЬ', 'УЧАСТЬ', 'УЧИТЬ', 'УЯВКА', 'ФАКЕЛ', 'ФАКТИ', 'ФІРМА', 'ФОРМА', 'ФІЛЬМ', 'ФОКУС', 'ФРАЗА', 
    'ХАЛВА', 'ХАЛАТ', 'ХАОСУ', 'ХАРИЗ', 'ХАТКА', 'ХВОЯ', 'ХИЖАК', 'ХИРЯК', 'ХИТРЕ', 'ХЛІБИ', 'ХЛОПЕ', 
    'ХМАРА', 'ХМИЗУ', 'ХОББІ', 'ХОКЕЙ', 'ХОЛУЙ', 'ХОМУТ', 'ХОРАЛ', 'ХОРЕЙ', 'ХОЧУТ', 'ХРАМИ', 'ХРІНУ', 
    'ХУДОБ', 'ХУТІР', 'ЦАРИК', 'ЦАРИН', 'ЦВЯХИ', 'ЦЕДРА', 'ЦЕГЛА', 'ЦЕНТР', 'ЦЕРКВ', 'ЦИБУЛ', 'ЦИГАН', 
    'ЦИКЛИ', 'ЦИНКУ', 'ЦИРКУ', 'ЦИФРА', 'ЦУКОР', 'ЦУЦИК', 'ЧАВУН', 'ЧАЙКА', 'ЧАКРА', 'ЧАПЛЯ', 'ЧАРАМ', 
    'ЧАРКА', 'ЧАСНИ', 'ЧАСОП', 'ЧАСТКА', 'ЧАТИР', 'ЧАШКА', 'ЧВЕРТ', 'ЧЕРГА', 'ЧЕРЕП', 'ЧЕРЕЗ', 'ЧЕСТЬ', 
    'ЧИЖИК', 'ЧИСЛО', 'ЧИТАТ', 'ЧЛЕНИ', 'ЧОВЕН', 'ЧОЛОК', 'ЧОРНА', 'ЧОРТИ', 'ЧУДЕС', 'ЧУДНА', 'ЧУЖАК', 
    'ЧУМАК', 'ЧУТКИ', 'ЧУХАТ', 'ШАБЛО', 'ШАЙКА', 'ШАЛЕН', 'ШАПКА', 'ШАРАД', 'ШАРФИ', 'ШАСІ', 'ШАХТА', 
    'ШВАБР', 'ШВЕДИ', 'ШЕВРО', 'ШЕЛЕХ', 'ШЕЛЬФ', 'ШЕРИФ', 'ШИБКА', 'ШИЙКА', 'ШИЛОМ', 'ШИНКА', 'ШИПКА', 
    'ШИПШИ', 'ШИРМА', 'ШИРОК', 'ШКАФИ', 'ШКІРА', 'ШКОДА', 'ШКОЛА', 'ШКУРА', 'ШЛАКИ', 'ШЛЕЙФ', 'ШЛЕМУ', 
    'ШЛИХТ', 'ШЛЮЗИ', 'ШЛЮПИ', 'ШЛЯХИ', 'ШНУРИ', 'ШОКОЛ', 'ШОМУТ', 'ШОПЕН', 'ШОРИК', 'ШОРТИ', 'ШОСЕЙ', 
    'ШПАКУ', 'ШПАЛА', 'ШПИЛЬ', 'ШПИНЕ', 'ШПОРА', 'ШПРИЦ', 'ШТАБИ', 'ШТАМП', 'ШТАНГ', 'ШТАНЫ', 'ШТОРМ', 
    'ШТРАФ', 'ШТРИХ', 'ШТУКА', 'ШТУРМ', 'ШУБКА', 'ШУМКА', 'ШУПАТ', 'ШУРФЫ', 'ШУРУП', 'ШУТКА', 'ШХЕРА', 
    'ЩАВЕЛ', 'ЩЕБЕН', 'ЩЕГЛИ', 'ЩЕКАМ', 'ЩЕЛКА', 'ЩЕЛЬЮ', 'ЩЕПКА', 'ЩИПАТ', 'ЩИПЦЫ', 'ЩИРОК', 'ЩИТОК', 
    'ЩУПАЛ', 'ЮВЕЛІ', 'ЮНКАМ', 'ЮРБИЩ', 'ЮРИСТ', 'ЮХТАМ', 'ЯБЕДА', 'ЯБЛУК', 'ЯВИЩЕ', 'ЯГОДА', 'ЯГУАР', 
    'ЯЄЧНЯ', 'ЯЛИНА', 'ЯНГОЛ', 'ЯНТАР', 'ЯРЛИК', 'ЯСЕНЬ', 'ЯХОНТ'
  ]);

  return words.filter(word => {
    word = word.toUpperCase().trim();
    if (strictWhitelistUA.has(word)) return true;
    
    // Simple length and alphabet check
    if (!/^[А-ЩЬЮЯЄІЇҐ]{5}$/.test(word)) return false;

    // Filter out words ending in rare patterns
    if (word.endsWith('ТИ') || word.endsWith('ЛИ') || word.endsWith('МИ')) return false;

    // Filter obscure prefixes
    const obscurePrefixesUA = ['АБ', 'АВ', 'АГ', 'АД', 'АК', 'АЛ', 'АМ', 'АН', 'АП', 'АР', 'АС', 'АТ', 'БАУ', 'БЕР'];
    for (const prefix of obscurePrefixesUA) {
      if (word.startsWith(prefix) && !['АБОРТ', 'АВАНС', 'АВТОР', 'АГЕНТ', 'АНГЕЛ', 'АНОНС', 'АРЕНА', 'АРЕСТ', 'АРХІВ', 'АТЛЕТ', 'АТЛАС', 'ЯГОД'].includes(word)) {
        return false;
      }
    }

    return true;
  });
}

async function filterWordsWithAI(words: string[], lang: 'RU' | 'UA'): Promise<string[]> {
  const langName = lang === 'RU' ? 'Russian' : 'Ukrainian';
  console.log(`\n========================================`);
  console.log(`Filtering ${words.length} ${langName} words using Gemini in EXACTLY ONE request...`);
  console.log(`========================================`);

  const instructions = lang === 'RU' 
    ? `You are a native Russian speaker and an expert linguist.
Your task is to filter a list of 5-letter uppercase Russian words and identify ONLY those that are:
1. Highly common, everyday nouns in Russian.
2. In their singular, nominative case (именительный падеж, единственное число) or common plural-only nouns that are very well known (e.g., СУТКИ, ШТАНЫ).
3. Easily recognized and understood by any native Russian speaker (including teenagers and children).

Strictly EXCLUDE:
- Obscure, rare, scientific, specialized, or technical terms (e.g., АПТИХ, АБИОЗ, АВГИТ, АБРИН, АПИОН, АПЛИТ, АПЕКС, АПРОН, АРСОЛ, АРТИГ).
- Obsolete words, archaisms, or poetic terms (e.g., АГНЕЦ, АВГУР).
- Slang, jargon, or dialectal words.
- Foreign words that are not widely integrated into the daily Russian language.
- Other parts of speech (verbs, adjectives, adverbs, pronouns) unless they are strictly nouns.

Analyze the word list carefully. Return a single JSON array containing ONLY the words that meet these strict criteria.`
    : `You are a native Ukrainian speaker and an expert linguist.
Your task is to filter a list of 5-letter uppercase Ukrainian words and identify ONLY those that are:
1. Highly common, everyday nouns in Ukrainian.
2. In their singular, nominative case or common plural-only nouns that are very well known.
3. Easily recognized and understood by any native Ukrainian speaker.

Strictly EXCLUDE:
- Obscure, rare, scientific, specialized, or technical terms.
- Obsolete words or archaisms.
- Slang, jargon, or dialectal words.
- Foreign words that are not widely integrated into daily Ukrainian.
- Other parts of speech (verbs, adjectives, adverbs) unless they are strictly nouns.

Analyze the word list carefully. Return a single JSON array containing ONLY the words that meet these strict criteria.`;

  // Try different models sequentially to bypass strict free-tier daily quotas
  const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
  ];

  for (const model of modelsToTry) {
    console.log(`Attempting to filter using model: ${model}...`);
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: `${instructions}\n\nList of words to filter:\n${JSON.stringify(words)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            }
          },
          temperature: 0.1,
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim()) as string[];
        const cleanParsed = parsed
          .map(w => w.toUpperCase().trim())
          .filter(w => words.includes(w));
        
        console.log(`Success! Model ${model} returned ${cleanParsed.length} filtered words.`);
        if (cleanParsed.length >= 300) {
          return cleanParsed.sort();
        } else {
          console.warn(`Warning: Model returned too few words (${cleanParsed.length}). Trying fallback filters.`);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      console.error(`Failed with model ${model}: ${errMsg}`);
    }
  }

  // Fallback to offline robust programmatic filter if all Gemini models fail or are rate-limited
  console.log(`All Gemini models failed or returned insufficient words. Falling back to local programmatic filter...`);
  const localFiltered = lang === 'RU' ? fallbackFilterRU(words) : fallbackFilterUA(words);
  console.log(`Local filter completed. Retained ${localFiltered.length}/${words.length} words.`);
  return localFiltered.sort();
}

async function main() {
  console.log('Starting consolidated Gemini-powered linguistic filtering of Wordle targets...');

  const cleanRU = await filterWordsWithAI(originalRU, 'RU');
  console.log(`Linguistic filtering complete! Russian target words count: ${originalRU.length} -> ${cleanRU.length}`);

  // Sleep 10 seconds between languages to avoid transient rate limits
  console.log('Sleeping 10 seconds before switching to Ukrainian filtering...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  const cleanUA = await filterWordsWithAI(originalUA, 'UA');
  console.log(`Linguistic filtering complete! Ukrainian target words count: ${originalUA.length} -> ${cleanUA.length}`);

  // Safeguard check to avoid emptying the wordlists
  if (cleanRU.length < 300 || cleanUA.length < 300) {
    console.error('Linguistic filtering resulted in too few words. Aborting overwrite to prevent breaking the game.');
    process.exit(1);
  }

  // Read the base words content before targetWordsRU definition
  const lines = wordsContent.split('\n');
  let truncateIndex = lines.findIndex(line => line.includes('export const targetWordsRU'));
  if (truncateIndex === -1) {
    truncateIndex = lines.findIndex(line => line.includes('=== РУССКИЕ ЦЕЛЕВЫЕ СЛОВА ==='));
  }

  if (truncateIndex === -1) {
    console.error('Could not find targetWordsRU variable in words.ts. Aborting.');
    process.exit(1);
  }

  const baseContent = lines.slice(0, truncateIndex).join('\n');

  const updatedCode = `

// === РУССКИЕ ЦЕЛЕВЫЕ СЛОВА (Отфильтрованные: только популярные и общеизвестные) ===
export const targetWordsRU: string[] = [
${cleanRU.map(w => '  "' + w + '"').join(',\n')}
];

// === УКРАЇНСЬКІ ЦІЛЬОВІ СЛОВА (Відфільтровані: только популярні та загальновідомі) ===
export const targetWordsUA: string[] = [
${cleanUA.map(w => '  "' + w + '"').join(',\n')}
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

  fs.writeFileSync(wordsTsPath, baseContent.trim() + updatedCode);
  console.log(`Successfully rewrote words.ts! Russian target count: ${cleanRU.length}, Ukrainian target count: ${cleanUA.length}.`);
}

main().catch(console.error);
