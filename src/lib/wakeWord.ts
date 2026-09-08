/**
 * Global Wake Word Detection Utility for Rowan AI.
 * Uses the Web Speech API to listen for activation commands.
 */

export interface WakeWordConfig {
  wakeWord: string;
  onWake: () => void;
  enabled: boolean;
}

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

class WakeWordDetector {
  private recognition: SpeechRecognition | null = null;
  private isStarted: boolean = false;
  private lastTriggerTime: number = 0;
  private config: WakeWordConfig;

  constructor(config: WakeWordConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: Partial<WakeWordConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (!this.config.enabled && this.isStarted) {
      this.stop();
    } else if (this.config.enabled && !this.isStarted) {
      this.start();
    }
  }

  public start() {
    if (typeof window === 'undefined') return;
    if (this.isStarted) return;
    if (!this.config.enabled) return;

    const win = window as unknown as WindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('[WakeWord] SpeechRecognition not supported.');
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const latestResult = results[results.length - 1];
        const transcript = latestResult[0].transcript.toLowerCase().trim();

        // Matching "Rowan" and common variations
        const matches = [
          this.config.wakeWord.toLowerCase(),
          'rowen',
          'roan',
          'ron',
          'rhone',
          'rogan',
          'row'
        ];

        const found = matches.some(m => transcript.includes(m));

        if (found) {
          const now = Date.now();
          if (now - this.lastTriggerTime > 3000) {
            this.lastTriggerTime = now;
            this.config.onWake();
            
            // Abort and restart to clear buffer and allow UI state to settle
            this.stop();
            setTimeout(() => this.start(), 300);
          }
        }
      };

      this.recognition.onend = () => {
        this.isStarted = false;
        if (this.config.enabled) {
          // Auto-restart
          setTimeout(() => {
            if (this.config.enabled && !this.isStarted) {
              this.start();
            }
          }, 500);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech') {
          console.warn('[WakeWord] Error:', event.error);
        }
        if (event.error === 'not-allowed') {
          this.config.enabled = false;
        }
        this.isStarted = false;
      };

      this.recognition.start();
      this.isStarted = true;
    } catch (err) {
      console.error('[WakeWord] Initialization failed:', err);
      this.isStarted = false;
    }
  }

  public stop() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.isStarted = false;
  }

  public isListening() {
    return this.isStarted;
  }
}

// Singleton instance for global use
let instance: WakeWordDetector | null = null;

export const getWakeWordDetector = (config?: WakeWordConfig) => {
  if (!instance && config) {
    instance = new WakeWordDetector(config);
  } else if (instance && config) {
    instance.updateConfig(config);
  }
  return instance;
};
