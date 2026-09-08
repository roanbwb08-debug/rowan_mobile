/**
 * Official 100 Interruption Words and 100 Interruption Sentences for Roan / Rowan.
 * 
 * Strict Interruption Rule:
 * When Roan/Rowan is answering/speaking, ONLY these whitelisted words or sentences
 * are permitted to interrupt him. If any of these are detected, playback is cancelled
 * immediately and Roan transitions to listening mode. Apart from these words and sentences,
 * nothing else will interrupt him while he is speaking.
 */

export const INTERRUPTION_WORDS_100 = [
  'wait',
  'stop',
  'pause',
  'halt',
  'hold',
  'quiet',
  'silence',
  'hush',
  'shh',
  'freeze',
  'cancel',
  'enough',
  'cease',
  'listen',
  'look',
  'hear',
  'excuse',
  'pardon',
  'wrong',
  'incorrect',
  'timeout',
  'rewind',
  'quit',
  'cut',
  'break',
  'abort',
  'terminate',
  'chill',
  'relax',
  'steady',
  'stay',
  'whoa',
  'whoah',
  'nope',
  'untrue',
  'false',
  'mistake',
  'error',
  'clarify',
  'correction',
  'misheard',
  'misunderstanding',
  'repeat',
  'rephrase',
  'restart',
  'reset',
  'disregard',
  'nevermind',
  'belay',
  'attention',
  'end',
  'peace',
  'drop',
  'ahem',
  'slow',
  'slowdown',
  'holdup',
  'holdon',
  'hangon',
  'waitup',
  'backup',
  'backoff',
  'holdoff',
  'stopit',
  'stopthat',
  'shutup',
  'hushnow',
  'quietnow',
  'zip',
  'zipit',
  'holdit',
  'waitnow',
  'checkthat',
  'justwait',
  'waitasec',
  'waitaminute',
  'waitamoment',
  'holdstill',
  'hangup',
  'stophere',
  'pausespeaking',
  'stoptalking',
  'stopspeaking',
  'stopnow',
  'silenceplease',
  'stopalready',
  'easeup',
  'belayit',
  'standdown',
  'over',
  'interrupt',
  'interruption',
  'please',
  'pleaserowan',
  'pleaseroan',
  'stoprightthere',
  'holdyourhorses',
  'inaccurate',
  'opposite',
  'waitstop'
] as const;

export const INTERRUPTION_SENTENCES_100 = [
  'wait',
  'stop',
  "roan don't talk",
  'roan dont talk',
  "rowan don't talk",
  'rowan dont talk',
  'roan i did not say that',
  'roan i didnt say that',
  'rowan i did not say that',
  'rowan i didnt say that',
  'stop talking',
  'stop speaking',
  'roan stop talking',
  'rowan stop talking',
  'roan wait',
  'rowan wait',
  'roan hold on',
  'rowan hold on',
  'roan listen to me',
  'rowan listen to me',
  'roan be quiet',
  'rowan be quiet',
  'roan pause',
  'rowan pause',
  'roan hold up',
  'rowan hold up',
  'roan stop',
  'rowan stop',
  "that's not what i said",
  'that is not what i said',
  "that's not what i meant",
  'that is not what i meant',
  "that's not what i asked",
  'that is not what i asked',
  'i did not say that',
  "i didn't say that",
  'i did not ask that',
  "i didn't ask that",
  'you misunderstood me',
  'you are misunderstanding me',
  "you're misunderstanding me",
  'you got that wrong',
  'you got it wrong',
  'you have it wrong',
  'you are wrong',
  "you're wrong",
  'no that is wrong',
  "no that's wrong",
  'that is completely wrong',
  "that's completely wrong",
  'that is not right',
  "that's not right",
  'that is incorrect',
  "that's incorrect",
  'that is false',
  "that's false",
  'that is not true',
  "that's not true",
  "you're not listening",
  'you are not listening',
  'listen to me',
  'hear me out',
  'let me speak',
  'let me talk',
  'let me finish',
  'let me explain',
  'let me clarify',
  'let me correct you',
  'i need to correct you',
  'give me a second',
  'give me a moment',
  'give me a minute',
  'hold on a second',
  'hold on a minute',
  'hold on a moment',
  'wait a second',
  'wait a minute',
  'wait a moment',
  'just a second',
  'just a minute',
  'just a moment',
  'shut up',
  'be quiet',
  'be silent',
  'stop right there',
  'stop right now',
  'stop for a second',
  'stop for a moment',
  'freeze right there',
  'hold your horses',
  'hold your thoughts',
  'slow down',
  'time out for a second',
  'can you please stop',
  'can you stop talking',
  'please stop talking',
  'please be quiet',
  'roan let me speak',
  "roan that's wrong",
  'roan you misunderstood me'
] as const;

export type InterruptionWord = typeof INTERRUPTION_WORDS_100[number];
export type InterruptionSentence = typeof INTERRUPTION_SENTENCES_100[number];

/**
 * Normalizes input string for reliable interruption matching.
 */
export function normalizeInterruptionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if user text matches any of the official 100 interruption words or 100 interruption sentences.
 */
export function matchInterruptionWhitelist(rawText: string): {
  matched: boolean;
  type: 'word' | 'sentence' | 'none';
  match: string | null;
} {
  const clean = normalizeInterruptionText(rawText);
  if (!clean) {
    return { matched: false, type: 'none', match: null };
  }

  // Also build phonetic / spelling synonym version ("rowan" -> "roan" and vice versa)
  const roanEquivalent = clean.replace(/\browan\b/g, 'roan');
  const rowanEquivalent = clean.replace(/\broan\b/g, 'rowan');

  // 1. Check sentences (phrase matching, longest first)
  const sortedSentences = [...INTERRUPTION_SENTENCES_100].sort((a, b) => b.length - a.length);

  for (const sentence of sortedSentences) {
    const cleanSentence = normalizeInterruptionText(sentence);
    const escaped = cleanSentence.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');

    if (regex.test(clean) || regex.test(roanEquivalent) || regex.test(rowanEquivalent)) {
      return { matched: true, type: 'sentence', match: sentence };
    }
  }

  // 2. Check words (exact word boundary matching)
  const wordsInInput = clean.split(' ');
  for (const word of INTERRUPTION_WORDS_100) {
    const cleanWord = normalizeInterruptionText(word);
    // Check if any word in the user's input matches exactly, or regex word boundary matches
    if (wordsInInput.includes(cleanWord)) {
      return { matched: true, type: 'word', match: word };
    }
    const escaped = cleanWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
    if (regex.test(clean) || regex.test(roanEquivalent) || regex.test(rowanEquivalent)) {
      return { matched: true, type: 'word', match: word };
    }
  }

  return { matched: false, type: 'none', match: null };
}
