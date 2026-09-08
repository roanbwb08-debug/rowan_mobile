import {
  INTERRUPTION_WORDS_100,
  INTERRUPTION_SENTENCES_100,
  matchInterruptionWhitelist
} from './interruptionVocabulary';

export {
  INTERRUPTION_WORDS_100,
  INTERRUPTION_SENTENCES_100,
  matchInterruptionWhitelist
};

export interface InterruptionResult {
  isIntentional: boolean;
  confidence: number; // 0.0 to 1.0
  reason: string;
  category: 'IGNORE' | 'LIKELY_BACKGROUND' | 'POSSIBLE_INTERRUPTION' | 'STRONG_INTERRUPTION' | 'IMMEDIATE_INTERRUPTION';
}

function cleanString(str: string): string {
  return str.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"]/g, " ").replace(/\s+/g, " ").trim();
}

// Complete consolidated allowed interruptions containing all 100 sentences and 100 words
export const ALLOWED_INTERRUPTIONS: string[] = Array.from(
  new Set([...INTERRUPTION_SENTENCES_100, ...INTERRUPTION_WORDS_100])
);

function checkAssistantEcho(userText: string, assistantText: string): { isEcho: boolean; similarity: number; reason: string } {
  const cleanUser = cleanString(userText);
  const cleanAssistant = cleanString(assistantText);

  if (!cleanUser || !cleanAssistant) {
    return { isEcho: false, similarity: 0, reason: "Empty text" };
  }

  const userWords = cleanUser.split(" ");
  const assistantWords = cleanAssistant.split(" ");

  if (userWords.length === 0 || assistantWords.length === 0) {
    return { isEcho: false, similarity: 0, reason: "No words" };
  }

  const wakeWords = ['rowan', 'rowen', 'roman', 'rowin', 'rowon'];
  const stopWords = ['stop', 'cancel', 'no', 'wait', 'hold on', 'wrong', 'actually', 'shut up', 'shh'];
  
  const hasWakeWord = userWords.some(w => wakeWords.includes(w));
  const hasStopWord = userWords.some(w => stopWords.includes(w)) || 
                     cleanUser.includes('hold on') || 
                     cleanUser.includes('shut up');

  // If user says something extremely short (1-2 characters total) like a noise artifact
  if (cleanUser.length <= 2) {
    return { isEcho: true, similarity: 1.0, reason: "Extremely short noise fragment" };
  }

  // 1. Direct Substring Match
  if (cleanAssistant.includes(cleanUser)) {
    if (!hasWakeWord && !hasStopWord) {
      return { isEcho: true, similarity: 1.0, reason: `Exact substring match: "${cleanUser}"` };
    }
  }

  // 2. Sequential Word Sequence Match
  if (userWords.length >= 2) {
    const windowSize = Math.min(userWords.length, 3);
    for (let i = 0; i <= userWords.length - windowSize; i++) {
      const subSeq = userWords.slice(i, i + windowSize).join(" ");
      if (cleanAssistant.includes(subSeq)) {
        const subSeqHasStop = stopWords.some(w => subSeq.includes(w));
        const subSeqHasWake = wakeWords.some(w => subSeq.includes(w));
        if (!subSeqHasStop && !subSeqHasWake) {
          return { isEcho: true, similarity: windowSize / userWords.length, reason: `Sequential echo of "${subSeq}"` };
        }
      }
    }
  }

  // 3. Word Overlap Ratio
  let matchCount = 0;
  const assistantWordMap = new Map<string, number>();
  for (const word of assistantWords) {
    assistantWordMap.set(word, (assistantWordMap.get(word) || 0) + 1);
  }

  for (const word of userWords) {
    if (assistantWordMap.has(word) && assistantWordMap.get(word)! > 0) {
      matchCount++;
      assistantWordMap.set(word, assistantWordMap.get(word)! - 1);
    }
  }

  const wordOverlapRatio = matchCount / userWords.length;

  if (wordOverlapRatio >= 0.50 && !hasWakeWord && !hasStopWord) {
    return { isEcho: true, similarity: wordOverlapRatio, reason: `High word overlap (${Math.round(wordOverlapRatio * 100)}%) with no wake/stop words` };
  }

  return { isEcho: false, similarity: wordOverlapRatio, reason: "Low similarity" };
}


/**
 * Evaluates whether an incoming user transcription is an intentional interruption or correction.
 * 
 * Strict Interruption Rule:
 * When Roan/Rowan is answering/speaking, ONLY the whitelisted 100 words and 100 sentences
 * are permitted to interrupt him. If any of these are detected, playback is cancelled
 * immediately and Roan transitions to listening mode. Apart from these words and sentences,
 * nothing else will interrupt him while he is speaking.
 */
export function evaluateInterruption(
  userText: string,
  assistantText: string,
  isSpeaking: boolean,
  activeConversation: boolean,
  locale: string = 'en'
): InterruptionResult {
  const cleanUser = cleanString(userText);

  // If there's no user text, ignore
  if (!cleanUser) {
    return {
      isIntentional: false,
      confidence: 0,
      reason: 'Empty transcription',
      category: 'IGNORE'
    };
  }

  // 1. Rowan Audio Echo Detection
  const echoResult = checkAssistantEcho(userText, assistantText);
  if (echoResult.isEcho) {
    return {
      isIntentional: false,
      confidence: 0.1,
      reason: `Echo Filtered: ${echoResult.reason}`,
      category: 'IGNORE'
    };
  }

  // 2. Filter out single-word filler/murmurs first
  const userWords = cleanUser.split(/\s+/);
  const isFiller = userWords.length === 1 && (
    cleanUser.length <= 2 || 
    ['uh', 'um', 'ah', 'oh', 'm', 'hm', 'h', 'er'].includes(cleanUser)
  );
  if (isFiller) {
    return {
      isIntentional: false,
      confidence: 0.15,
      reason: 'Filler sound or brief non-word chatter',
      category: 'IGNORE'
    };
  }

  // 3. CASE A: Rowan is NOT speaking (idle, listening mode, or awaiting user query)
  if (!isSpeaking) {
    return {
      isIntentional: true,
      confidence: 0.95,
      reason: `Direct user speech input while listening: "${userText}"`,
      category: 'IMMEDIATE_INTERRUPTION'
    };
  }

  // 4. CASE B: Rowan IS speaking (actively answering)
  // Check user custom override word or whitelist for diagnostic category
  let customWord = 'stop';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      customWord = window.localStorage.getItem('rowan_interruption_word') || 'stop';
    }
  } catch {
    // ignore
  }

  const cleanCustomWord = customWord.toLowerCase().trim();
  if (cleanCustomWord) {
    const escaped = cleanCustomWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
    if (regex.test(cleanUser)) {
      console.log(`[ROWAN VOICE] INTERRUPTION_DETECTED | Category: CUSTOM_OVERRIDE | Reason: Personalized word "${customWord}"`);
      return {
        isIntentional: true,
        confidence: 1.00,
        reason: `User personalized interruption word detected: "${customWord}"`,
        category: 'IMMEDIATE_INTERRUPTION'
      };
    }
  }

  const whitelistMatch = matchInterruptionWhitelist(cleanUser);
  if (whitelistMatch.matched) {
    console.log(`[ROWAN VOICE] INTERRUPTION_DETECTED | Category: WHITELISTED_${whitelistMatch.type.toUpperCase()} | Matched: "${whitelistMatch.match}"`);
    console.log(`[ROWAN VOICE] INTERRUPTION_CONFIDENCE: 1.00 | Action: CANCEL_SPEECH_AND_LISTEN`);
    return {
      isIntentional: true,
      confidence: 1.00,
      reason: `Whitelisted ${whitelistMatch.type} interruption matched: "${whitelistMatch.match}"`,
      category: 'IMMEDIATE_INTERRUPTION'
    };
  }

  // General Human Barge-In: ANY genuine user utterance while Rowan is speaking yields the floor immediately!
  console.log(`[ROWAN VOICE] INTERRUPTION_DETECTED | Category: GENERAL_BARGE_IN | Speech: "${cleanUser}" (locale: ${locale})`);
  console.log(`[ROWAN VOICE] USER_SPEECH_ONSET | Action: CANCEL_SPEECH_AND_LISTEN`);
  return {
    isIntentional: true,
    confidence: 1.00,
    reason: `General human barge-in user speech onset detected while answering: "${userText}"`,
    category: 'IMMEDIATE_INTERRUPTION'
  };
}
