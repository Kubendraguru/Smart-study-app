import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ArrearMotivationLanguage,
  ArrearMotivationSettings,
  MotivationalMessage,
} from '@/types';

const MOTIVATION_SETTINGS_KEY = '@smart_study_arrear_motivation_settings';

// Default motivation settings
export const DEFAULT_MOTIVATION_SETTINGS: ArrearMotivationSettings = {
  enabled: true,
  language: 'both',
  min_interval_minutes: 5,
  max_interval_minutes: 12,
};

// Curated motivational messages pool
export const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  // Tanglish (Tamil + English)
  {
    id: 'msg-ta-1',
    text: 'Feel pannadha… ellam seri aagidum ❤️',
    subtext: 'Your current preparation will pave the way.',
    language: 'tanglish',
    emoji: '❤️',
  },
  {
    id: 'msg-ta-2',
    text: 'Konjam konjama padicha kandippa improve pannalam!',
    subtext: 'Small consistent efforts lead to big results.',
    language: 'tanglish',
    emoji: '🌱',
  },
  {
    id: 'msg-ta-3',
    text: 'Innaiku nee padikkura ovvoru minute-um un future-ku help pannum.',
    subtext: 'Every minute invested in learning counts.',
    language: 'tanglish',
    emoji: '⏳',
  },
  {
    id: 'msg-ta-4',
    text: 'Nee try pannitu irukka… adhuve mukkiyam. Keep going!',
    subtext: 'Dedication and effort always win.',
    language: 'tanglish',
    emoji: '💪',
  },
  {
    id: 'msg-ta-5',
    text: 'Indha thadava kandippa clear panniduva. Nambikai odu padi! 🔥',
    subtext: 'Believe in your capabilities and focus.',
    language: 'tanglish',
    emoji: '🔥',
  },
  {
    id: 'msg-ta-6',
    text: 'Oru exam unoda true potential-ah decide panna mudiyadhu.',
    subtext: 'You are capable of mastering this concept.',
    language: 'tanglish',
    emoji: '✨',
  },
  {
    id: 'msg-ta-7',
    text: 'Kavala padama focus pannu, unnala mudiyum! 🎯',
    subtext: 'Take a deep breath and review one topic at a time.',
    language: 'tanglish',
    emoji: '🎯',
  },

  // English
  {
    id: 'msg-en-1',
    text: 'You can do it! 💪',
    subtext: 'Stay patient and keep moving forward.',
    language: 'english',
    emoji: '💪',
  },
  {
    id: 'msg-en-2',
    text: "Don't give up. You're making real progress!",
    subtext: 'Every topic you finish brings you closer to your goal.',
    language: 'english',
    emoji: '📈',
  },
  {
    id: 'msg-en-3',
    text: 'Never ever give up! 🔥',
    subtext: 'Your persistence is your greatest strength.',
    language: 'english',
    emoji: '🔥',
  },
  {
    id: 'msg-en-4',
    text: 'One step at a time. You are getting closer.',
    subtext: 'Mastering unit by unit will get you across the finish line.',
    language: 'english',
    emoji: '🪜',
  },
  {
    id: 'msg-en-5',
    text: 'Your hard work matters. Keep going!',
    subtext: 'Every concept you revise today builds your confidence.',
    language: 'english',
    emoji: '🌟',
  },
  {
    id: 'msg-en-6',
    text: 'Think about your dreams and the people who support you ❤️',
    subtext: 'Take pride in how much effort you are putting in today.',
    language: 'english',
    emoji: '❤️',
  },
  {
    id: 'msg-en-7',
    text: 'Stay calm and trust your preparation.',
    subtext: 'Consistency beats intensity every time.',
    language: 'english',
    emoji: '🧘',
  },
  {
    id: 'msg-en-8',
    text: 'Mistakes are proof that you are trying and learning.',
    subtext: 'You are stronger than any single obstacle.',
    language: 'english',
    emoji: '🚀',
  },
];

// Curated Pass Celebrations Messages
export const PASS_CELEBRATION_MESSAGES = [
  '🎉 Congratulations! You passed your arrear exam!',
  'You did it! All your effort and dedication paid off. ❤️',
  'One more milestone achieved! Keep moving forward with pride.',
  'Arrear cleared! Take a moment to celebrate this achievement! 🎊',
  'Outstanding progress! Your perseverance made all the difference.',
];

// In-memory recent message tracker to avoid immediate duplicates in a session
const recentMessageIds: string[] = [];
const MAX_RECENT_HISTORY = 4;

// Cross-platform storage helpers
async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    await AsyncStorage.setItem(key, value);
  } catch (err) {
    console.warn('Error saving motivation storage:', err);
  }
}

async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
    return await AsyncStorage.getItem(key);
  } catch (err) {
    console.warn('Error reading motivation storage:', err);
    return null;
  }
}

/**
 * Retrieve user's arrear motivation settings
 */
export async function getArrearMotivationSettings(): Promise<ArrearMotivationSettings> {
  try {
    const raw = await getStorageItem(MOTIVATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_MOTIVATION_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MOTIVATION_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_MOTIVATION_SETTINGS;
  }
}

/**
 * Save user's arrear motivation settings
 */
export async function saveArrearMotivationSettings(
  settings: Partial<ArrearMotivationSettings>
): Promise<ArrearMotivationSettings> {
  try {
    const current = await getArrearMotivationSettings();
    const updated: ArrearMotivationSettings = {
      ...current,
      ...settings,
    };
    await setStorageItem(MOTIVATION_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save motivation settings:', err);
    return DEFAULT_MOTIVATION_SETTINGS;
  }
}

/**
 * Get a random motivational message matching the language preference,
 * avoiding recent repeats.
 */
export function getRandomMotivationalMessage(
  language: ArrearMotivationLanguage = 'both'
): MotivationalMessage {
  let pool = MOTIVATIONAL_MESSAGES;

  if (language === 'english') {
    pool = pool.filter((m) => m.language === 'english');
  } else if (language === 'tanglish') {
    pool = pool.filter((m) => m.language === 'tanglish');
  }

  // Filter out recent messages if pool is large enough
  let candidatePool = pool.filter((m) => !recentMessageIds.includes(m.id));
  if (candidatePool.length === 0) {
    candidatePool = pool;
    recentMessageIds.length = 0; // reset
  }

  const randomIndex = Math.floor(Math.random() * candidatePool.length);
  const selected = candidatePool[randomIndex] || pool[0];

  // Track recent
  recentMessageIds.push(selected.id);
  if (recentMessageIds.length > MAX_RECENT_HISTORY) {
    recentMessageIds.shift();
  }

  return selected;
}

/**
 * Calculate a random delay in milliseconds between min and max minutes
 */
export function calculateNextRandomIntervalMs(
  minMinutes: number = 5,
  maxMinutes: number = 12
): number {
  const min = Math.max(1, minMinutes);
  const max = Math.max(min + 1, maxMinutes);
  const randomMinutes = min + Math.random() * (max - min);
  return Math.round(randomMinutes * 60 * 1000);
}

/**
 * Pick a random celebratory congratulations message
 */
export function getRandomPassCelebrationMessage(): string {
  const idx = Math.floor(Math.random() * PASS_CELEBRATION_MESSAGES.length);
  return PASS_CELEBRATION_MESSAGES[idx];
}
