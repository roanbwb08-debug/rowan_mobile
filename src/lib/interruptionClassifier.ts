/**
 * InterruptionClassifier
 * 
 * Monitors user speech during Rowan's response using the 100 requested stop/wait
 * keywords and sentences. Integrates directly with WebRTC data channels, HTMLAudioElement,
 * and Web Audio API AudioContext/GainNode to immediately cancel audio playback upon
 * high-confidence interruption.
 */

import {
  matchInterruptionWhitelist,
  normalizeInterruptionText
} from './interruptionVocabulary';

export {
  INTERRUPTION_WORDS_100,
  INTERRUPTION_SENTENCES_100,
  matchInterruptionWhitelist,
  normalizeInterruptionText
} from './interruptionVocabulary';

export interface ClassificationResult {
  isInterruption: boolean;
  confidence: number;
  reason: string;
  matchedKeyword: string | null;
  matchType: 'word' | 'sentence' | 'custom' | 'none';
  action: 'CANCEL_PLAYBACK' | 'IGNORE';
  timestamp: number;
}

export interface AudioCancellationTargets {
  audioContext?: AudioContext | null;
  gainNode?: GainNode | null;
  audioElement?: HTMLAudioElement | null;
  dataChannel?: RTCDataChannel | null;
  onStateTransition?: (state: 'listening' | 'interrupted') => void;
}

export class InterruptionClassifier {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private isCurrentlySpeaking = false;
  private lastCancellationTimestamp = 0;

  constructor(targets?: AudioCancellationTargets) {
    if (targets) {
      this.attachTargets(targets);
    }
  }

  /**
   * Attaches or updates target audio playback and communication channels.
   */
  public attachTargets(targets: AudioCancellationTargets): void {
    if (targets.audioContext !== undefined) this.audioContext = targets.audioContext;
    if (targets.gainNode !== undefined) this.gainNode = targets.gainNode;
    if (targets.audioElement !== undefined) this.audioElement = targets.audioElement;
    if (targets.dataChannel !== undefined) this.dataChannel = targets.dataChannel;
  }

  public attachAudioContext(context: AudioContext, gainNode?: GainNode): void {
    this.audioContext = context;
    if (gainNode) this.gainNode = gainNode;
  }

  public attachDataChannel(dc: RTCDataChannel): void {
    this.dataChannel = dc;
  }

  public attachAudioElement(el: HTMLAudioElement): void {
    this.audioElement = el;
  }

  public setSpeakingState(speaking: boolean): void {
    this.isCurrentlySpeaking = speaking;
  }

  /**
   * Evaluates user speech against the 100 keywords and 100 sentences whitelist.
   */
  public classifySpeech(
    rawText: string,
    options: {
      isSpeaking?: boolean;
      assistantText?: string;
      customKeyword?: string;
    } = {}
  ): ClassificationResult {
    const timestamp = Date.now();
    const isSpeaking = options.isSpeaking ?? this.isCurrentlySpeaking;
    const cleanUser = normalizeInterruptionText(rawText);

    if (!cleanUser) {
      return {
        isInterruption: false,
        confidence: 0,
        reason: 'Empty transcription',
        matchedKeyword: null,
        matchType: 'none',
        action: 'IGNORE',
        timestamp
      };
    }

    // 1. Assistant Echo Filtering:
    // If user's speech closely mirrors what Rowan is currently uttering, ignore as acoustic reflection
    if (isSpeaking && options.assistantText) {
      const cleanAssistant = normalizeInterruptionText(options.assistantText);
      if (cleanAssistant && cleanAssistant.includes(cleanUser) && cleanUser.length > 3) {
        // Double check it's not a stop word that happened to be in the assistant text
        const whitelistCheck = matchInterruptionWhitelist(cleanUser);
        if (!whitelistCheck.matched) {
          return {
            isInterruption: false,
            confidence: 0.1,
            reason: 'Acoustic echo reflection filtered',
            matchedKeyword: null,
            matchType: 'none',
            action: 'IGNORE',
            timestamp
          };
        }
      }
    }

    // 2. If Rowan is NOT speaking, user input is standard conversational prompt
    if (!isSpeaking) {
      return {
        isInterruption: true,
        confidence: 0.95,
        reason: 'Direct speech query while idle/listening',
        matchedKeyword: null,
        matchType: 'none',
        action: 'IGNORE',
        timestamp
      };
    }

    // 3. Rowan IS speaking: Check Custom Override Keyword from settings
    const customKeyword = (options.customKeyword || 'stop').toLowerCase().trim();
    if (customKeyword) {
      const escaped = customKeyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
      if (regex.test(cleanUser)) {
        console.log(`[InterruptionClassifier] Custom keyword match: "${customKeyword}"`);
        return {
          isInterruption: true,
          confidence: 1.0,
          reason: `Custom override keyword matched: "${customKeyword}"`,
          matchedKeyword: customKeyword,
          matchType: 'custom',
          action: 'CANCEL_PLAYBACK',
          timestamp
        };
      }
    }

    // 4. Rowan IS speaking: Whitelist check or general human barge-in
    const match = matchInterruptionWhitelist(cleanUser);
    if (match.matched && match.match) {
      console.log(`[InterruptionClassifier] Whitelist ${match.type} match: "${match.match}"`);
      return {
        isInterruption: true,
        confidence: 1.0,
        reason: `Whitelisted ${match.type} matched: "${match.match}"`,
        matchedKeyword: match.match,
        matchType: match.type,
        action: 'CANCEL_PLAYBACK',
        timestamp
      };
    }

    // 5. General Human Barge-In: Any non-echo speech while Rowan is speaking halts playback immediately
    console.log(`[InterruptionClassifier] General barge-in speech detected during response: "${cleanUser}"`);
    return {
      isInterruption: true,
      confidence: 1.0,
      reason: `General human barge-in during speech: "${cleanUser}"`,
      matchedKeyword: cleanUser,
      matchType: 'word',
      action: 'CANCEL_PLAYBACK',
      timestamp
    };
  }

  /**
   * Immediately halts current audio playback across Web Audio API AudioContext,
   * HTMLAudioElement, and WebRTC data channel response.cancel.
   */
  public cancelPlayback(targets?: AudioCancellationTargets): boolean {
    const now = Date.now();
    // Debounce duplicate cancellations within 80ms
    if (now - this.lastCancellationTimestamp < 80) {
      return false;
    }
    this.lastCancellationTimestamp = now;

    console.log('[InterruptionClassifier] EXECUTING IMMEDIATE AUDIO CANCELLATION');

    // 1. Web Audio API GainNode zero-out (0ms instant hardware mute)
    const ctx = targets?.audioContext ?? this.audioContext;
    const gain = targets?.gainNode ?? this.gainNode;
    if (ctx && gain) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        if (ctx.state === 'running') {
          ctx.suspend().catch(() => {});
        }
        console.log('[InterruptionClassifier] Web Audio GainNode set to 0 and AudioContext suspended');
      } catch (err) {
        console.warn('[InterruptionClassifier] Web Audio GainNode mute error:', err);
      }
    }

    // 2. HTMLAudioElement pause and mute
    const audioEl = targets?.audioElement ?? this.audioElement;
    if (audioEl) {
      try {
        audioEl.muted = true;
        audioEl.pause();
        audioEl.currentTime = 0;
        console.log('[InterruptionClassifier] HTMLAudioElement paused, muted, and reset');
      } catch (err) {
        console.warn('[InterruptionClassifier] HTMLAudioElement pause error:', err);
      }
    }

    // 3. WebRTC Data Channel response.cancel dispatch
    const dc = targets?.dataChannel ?? this.dataChannel;
    if (dc && dc.readyState === 'open') {
      try {
        dc.send(JSON.stringify({ type: 'response.cancel' }));
        console.log('[InterruptionClassifier] WebRTC DataChannel dispatched response.cancel');
      } catch (err) {
        console.warn('[InterruptionClassifier] WebRTC DataChannel send error:', err);
      }
    }

    // 4. Web Speech Synthesis cancellation (fallback engine)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          console.log('[InterruptionClassifier] window.speechSynthesis canceled');
        }
      } catch (err) {
        console.warn('[InterruptionClassifier] window.speechSynthesis cancel error:', err);
      }
    }

    // 5. Notify state transition
    targets?.onStateTransition?.('listening');
    return true;
  }

  /**
   * Processes speech transcript and automatically executes audio cancellation
   * if classification determines an intentional interruption.
   */
  public processAndCancelIfInterruption(
    rawText: string,
    options: {
      isSpeaking?: boolean;
      assistantText?: string;
      customKeyword?: string;
    } = {},
    targets?: AudioCancellationTargets
  ): ClassificationResult {
    const classification = this.classifySpeech(rawText, options);

    if (classification.isInterruption && classification.action === 'CANCEL_PLAYBACK') {
      console.log(`[InterruptionClassifier] Confirmed intentional interruption (${classification.matchedKeyword}). Executing 0ms audio cancellation.`);
      this.cancelPlayback(targets);
    }

    return classification;
  }
}

// Global singleton instance for easy cross-module sharing
export const interruptionClassifier = new InterruptionClassifier();
