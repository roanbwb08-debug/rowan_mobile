// Centralized interruption vocabulary configuration for Rowan.AI
// Easy multilingual extension, organized by categories with confidence metrics.

export {
  INTERRUPTION_WORDS_100,
  INTERRUPTION_SENTENCES_100,
  matchInterruptionWhitelist,
  normalizeInterruptionText
} from './interruptionVocabulary';

export interface InterruptionCategory {
  phrases: string[];
  baseScore: number; // The base interruption confidence score (0.0 to 1.0)
}

export interface LanguageVocabulary {
  strongInterruptions: InterruptionCategory;
  strongCorrections: InterruptionCategory;
  directAddresses: InterruptionCategory;
  contextWords: string[]; // Contextual words that should NOT independently trigger an interruption
  ordinaryWords: string[]; // Highly common words that can never independently trigger an interruption
}

export interface InterruptionConfig {
  defaultLocale: string;
  locales: Record<string, LanguageVocabulary>;
}

export const interruptionConfig: InterruptionConfig = {
  defaultLocale: 'en',
  locales: {
    en: {
      strongInterruptions: {
        baseScore: 0.95,
        phrases: [
          'stop',
          'stop rowan',
          'rowan stop',
          'wait',
          'wait rowan',
          'rowan wait',
          'hold on',
          'hold on rowan',
          'rowan hold on',
          'hang on',
          'hang on rowan',
          'rowan hang on',
          'pause',
          'rowan pause',
          'be quiet',
          'quiet rowan',
          'stop talking',
          'stop speaking',
          'let me speak',
          'let me talk',
          'let me finish',
          'give me a second',
          'give me a moment',
          'one second',
          'one moment',
          'hold up',
          'rowan hold up',
          'shut up',
          'shh',
          'silence',
          'be silent',
          'cut it out',
          'just wait',
          'hold on a second',
          'hold on a moment',
          'hold your thoughts',
          'stop there',
          'stop right there',
          'wait a second',
          'wait a minute',
          'wait a moment',
          'pause rowan',
          'freeze',
          'hush',
          'quiet down'
        ]
      },
      strongCorrections: {
        baseScore: 0.85,
        phrases: [
          "that's not what i meant",
          "that's not what i asked",
          "that's not what i said",
          "you misunderstood me",
          "you're misunderstanding me",
          "you misunderstood",
          "that's wrong",
          "no that's wrong",
          "you're wrong",
          "no that's not right",
          "that's not right",
          "not what i meant",
          "not what i asked",
          "not what i said",
          "that's not it",
          "no that's not it",
          "listen to me",
          "listen rowan",
          "rowan listen",
          "let me explain",
          "let me clarify",
          "let me correct that",
          "i need to correct you",
          "you got that wrong",
          "you got me wrong",
          "you got the wrong idea",
          "that's different",
          "i said something different",
          "you didn't understand",
          "you didn't listen",
          "you weren't listening",
          "that is wrong",
          "no that is wrong",
          "that is wrong rowan",
          "that is not right",
          "no that is not right",
          "incorrect",
          "that is incorrect",
          "you are wrong",
          "you got it wrong",
          "misunderstanding",
          "let me correct",
          "not what i was saying",
          "that is not what i was saying",
          "that is not what i meant",
          "not what i wanted",
          "that's not what i wanted",
          "that is not what i asked",
          "completely wrong",
          "totally wrong",
          "quite wrong",
          "actually wrong",
          "not true",
          "that is not true",
          "that's not true",
          "false",
          "that is false",
          "that's false",
          "opposite",
          "quite the opposite"
        ]
      },
      directAddresses: {
        baseScore: 0.75,
        phrases: [
          'rowan',
          'hey rowan',
          'hi rowan',
          'yo rowan',
          'listen rowan',
          'rowan listen',
          'rowan wait',
          'rowan stop',
          'rowan hold on',
          'rowan pause',
          'rowan hang on',
          'okay rowan',
          'ok rowan',
          'well rowan',
          'rowen',
          'hey rowen',
          'hi rowen',
          'yo rowen',
          'roman',
          'hey roman',
          'yo roman',
          'rowin',
          'rowon'
        ]
      },
      contextWords: [
        'no',
        'actually',
        'but',
        'wait',
        'listen',
        'right',
        'okay',
        'ok',
        'hold',
        'yeah',
        'yes',
        'what',
        'why',
        'how',
        "didn't",
        "don't",
        "can't",
        "that's",
        'i',
        'you',
        'the',
        'was',
        'were'
      ],
      ordinaryWords: [
        "didn't",
        "don't",
        "can't",
        "was",
        "were",
        "i",
        "you",
        "the",
        "what",
        "why",
        "okay",
        "ok",
        "a",
        "an",
        "is",
        "are",
        "and",
        "or",
        "to",
        "of",
        "in",
        "on",
        "at",
        "it",
        "that",
        "this",
        "there",
        "he",
        "she",
        "they",
        "them",
        "we",
        "us",
        "my",
        "your",
        "his",
        "her",
        "their",
        "our"
      ]
    },
    es: {
      strongInterruptions: {
        baseScore: 0.95,
        phrases: [
          'para',
          'para rowan',
          'rowan para',
          'espera',
          'espera rowan',
          'rowan espera',
          'un segundo',
          'un momento',
          'silencio',
          'cállate',
          'deja de hablar',
          'déjame hablar',
          'déjame terminar',
          'espera un segundo',
          'espera un momento'
        ]
      },
      strongCorrections: {
        baseScore: 0.85,
        phrases: [
          'eso no es lo que quería decir',
          'eso no es lo que pregunté',
          'te has equivocado',
          'estás equivocado',
          'eso está mal',
          'no es así',
          'eso no es correcto',
          'me has entendido mal',
          'no me has entendido',
          'escúchame',
          'déjame explicar',
          'déjame aclarar'
        ]
      },
      directAddresses: {
        baseScore: 0.75,
        phrases: [
          'rowan',
          'oye rowan',
          'hola rowan',
          'escucha rowan',
          'rowan escucha',
          'rowan espera'
        ]
      },
      contextWords: [
        'no',
        'pero',
        'espera',
        'escucha',
        'sí',
        'ya',
        'vale',
        'bueno',
        'qué',
        'cómo',
        'por qué'
      ],
      ordinaryWords: [
        'yo',
        'tú',
        'él',
        'ella',
        'nosotros',
        'mi',
        'tu',
        'el',
        'la',
        'los',
        'las',
        'un',
        'una',
        'y',
        'o',
        'pero'
      ]
    }
  }
};
