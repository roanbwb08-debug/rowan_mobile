/**
 * OpenAI Realtime Interruption Service
 * 
 * Orchestrates phrase matching against the requested 100-word and 100-sentence whitelist
 * to trigger instantaneous response cancellation via the WebRTC data channel and Web Audio API.
 * 
 * Core Behavioral Rule:
 * When Roan/Rowan is speaking (even if he has said a lot) and the user says "stop", "wait",
 * or any of the 100 designated interruption words/sentences:
 * 1. Roan stops speaking completely at 0ms latency.
 * 2. Active response generation is cancelled on the WebRTC data channel.
 * 3. Roan transitions to listening mode and WAITS for the user to finish talking.
 * 4. Roan does NOT answer directly to the interruption word itself; he remains attentive
 *    and listens until the user finishes formulating their statement/question.
 */

import {
  matchInterruptionWhitelist,
  normalizeInterruptionText
} from '../lib/interruptionVocabulary';

export interface InterruptionTargets {
  dataChannel?: RTCDataChannel | null;
  audioContext?: AudioContext | null;
  gainNode?: GainNode | null;
  audioElement?: HTMLAudioElement | null;
}

export interface InterruptionEvaluationResult {
  intercepted: boolean;
  matchedPhrase: string | null;
  matchType: 'word' | 'sentence' | 'none';
  confidence: number;
  reason: string;
}

export interface InterruptionServiceCallbacks {
  onInterrupted?: (phrase: string, matchType: string) => void;
  onStateChange?: (state: 'listening' | 'speaking' | 'thinking' | 'idle' | 'interrupted') => void;
  onDiagnostic?: (event: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export class RealtimeInterruptionService {
  private dataChannel: RTCDataChannel | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;

  // State flags
  private isSpeaking: boolean = false;
  private isWaitingForUserToFinish: boolean = false;
  private activeAssistantItemId: string | null = null;
  private activeResponseId: string | null = null;
  private speechStartTime: number = 0;
  private silenceWaitTimeout: NodeJS.Timeout | null = null;

  // Registered listeners / callbacks
  private callbacks: InterruptionServiceCallbacks = {};

  constructor(targets?: InterruptionTargets, callbacks?: InterruptionServiceCallbacks) {
    if (targets) {
      this.attachTargets(targets);
    }
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  /**
   * Attach or update active WebRTC and audio output references
   */
  public attachTargets(targets: InterruptionTargets): void {
    if (targets.dataChannel !== undefined) this.dataChannel = targets.dataChannel;
    if (targets.audioContext !== undefined) this.audioContext = targets.audioContext;
    if (targets.gainNode !== undefined) this.gainNode = targets.gainNode;
    if (targets.audioElement !== undefined) this.audioElement = targets.audioElement;
  }

  /**
   * Register state and diagnostic callbacks
   */
  public setCallbacks(callbacks: InterruptionServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Set assistant speaking status
   */
  public setSpeakingState(speaking: boolean): void {
    this.isSpeaking = speaking;
    if (speaking) {
      this.speechStartTime = Date.now();
      // Resume audio output hardware
      this.restoreAudioOutput();
    } else {
      this.activeResponseId = null;
    }
  }

  /**
   * Evaluate user speech against the 100-word and 100-sentence whitelist.
   * If matched while speaking or in active generation, immediately cancels playback
   * and prepares Rowan to listen for the user to finish talking.
   */
  public evaluateAndIntercept(
    transcript: string,
    options: {
      assistantText?: string;
      customKeyword?: string;
      forceSpeakingCheck?: boolean;
    } = {}
  ): InterruptionEvaluationResult {
    const rawTranscript = (transcript || '').trim();
    if (!rawTranscript) {
      return {
        intercepted: false,
        matchedPhrase: null,
        matchType: 'none',
        confidence: 0,
        reason: 'Empty speech transcript'
      };
    }

    const cleanInput = normalizeInterruptionText(rawTranscript);
    if (!cleanInput) {
      return {
        intercepted: false,
        matchedPhrase: null,
        matchType: 'none',
        confidence: 0,
        reason: 'Normalized transcript is empty'
      };
    }

    // 1. Assistant Echo Filtering:
    // Ensure Rowan's own loud voice reflection isn't misclassified as user barge-in
    if (this.isSpeaking && options.assistantText) {
      const cleanAssistant = normalizeInterruptionText(options.assistantText);
      if (cleanAssistant && cleanAssistant.includes(cleanInput) && cleanInput.length > 3) {
        // Double check it's not an explicit stop keyword
        const check = matchInterruptionWhitelist(cleanInput);
        if (!check.matched) {
          this.callbacks.onDiagnostic?.(
            'ASSISTANT_ECHO',
            `Filtered echo reflection: "${cleanInput}"`,
            'warning'
          );
          return {
            intercepted: false,
            matchedPhrase: null,
            matchType: 'none',
            confidence: 0.1,
            reason: 'Assistant echo reflection filtered'
          };
        }
      }
    }

    // 2. Evaluate against 100 Words and 100 Sentences Whitelist
    const match = matchInterruptionWhitelist(cleanInput);

    // Also test custom keyword if provided (e.g. user set custom stop word in settings)
    let isCustomMatch = false;
    let customWord = (options.customKeyword || 'stop').toLowerCase().trim();
    if (customWord) {
      customWord = normalizeInterruptionText(customWord);
      const escaped = customWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
      if (regex.test(cleanInput)) {
        isCustomMatch = true;
      }
    }

    const isMatch = match.matched || isCustomMatch;
    const matchedPhrase = match.match || (isCustomMatch ? customWord : null);
    const matchType = match.type !== 'none' ? match.type : (isCustomMatch ? 'word' : 'none');

    // If Rowan is NOT speaking and we're not currently waiting, normal conversation takes place
    if (!this.isSpeaking && !this.isWaitingForUserToFinish && !options.forceSpeakingCheck) {
      return {
        intercepted: false,
        matchedPhrase,
        matchType,
        confidence: isMatch ? 0.9 : 0.1,
        reason: 'User speaking while assistant is not answering'
      };
    }

    // Strict Rule: If assistant IS speaking, ONLY whitelisted 100 words/sentences can interrupt!
    if (!isMatch) {
      console.log(`[RealtimeInterruptionService] Utterance "${rawTranscript}" not in 100-word whitelist. Assistant will continue speaking.`);
      this.callbacks.onDiagnostic?.(
        'INTERRUPTION_IGNORED',
        `Ignored non-whitelisted speech: "${rawTranscript}". Rowan continuing.`,
        'info'
      );
      return {
        intercepted: false,
        matchedPhrase: null,
        matchType: 'none',
        confidence: 0.05,
        reason: 'Speech did not match 100-word interruption whitelist'
      };
    }

    // Execute instantaneous response cancellation
    return this.executeGeneralBargeIn(matchedPhrase || cleanInput);
  }

  /**
   * Execute immediate general human barge-in on user speech onset
   * Immediately mutes playback, sends response.cancel, clears audio buffers, and transitions to listening.
   */
  public executeGeneralBargeIn(triggerReason: string = 'USER_SPEECH_ONSET'): InterruptionEvaluationResult {
    const timestamp = new Date().toISOString();
    console.log(`[ROWAN VOICE] USER_SPEECH_ONSET | Timestamp: ${timestamp} | Reason: ${triggerReason}`);
    console.log(`[ROWAN VOICE] INTERRUPTION_DETECTED | State: ${this.isSpeaking ? 'SPEAKING' : 'LISTENING'} | Reason: ${triggerReason}`);

    // 1. Cancel playback and server response immediately
    this.cancelCurrentResponse();

    // 2. Set waiting state: Rowan yields immediately and listens for the user's complete statement
    this.isWaitingForUserToFinish = true;
    this.callbacks.onStateChange?.('interrupted');
    setTimeout(() => {
      this.callbacks.onStateChange?.('listening');
      console.log(`[ROWAN VOICE] LISTENING_RESUMED | Timestamp: ${new Date().toISOString()}`);
    }, 50);

    this.callbacks.onInterrupted?.(triggerReason, 'barge_in');

    if (this.silenceWaitTimeout) {
      clearTimeout(this.silenceWaitTimeout);
    }
    this.silenceWaitTimeout = setTimeout(() => {
      this.isWaitingForUserToFinish = false;
    }, 8000);

    return {
      intercepted: true,
      matchedPhrase: triggerReason,
      matchType: 'word',
      confidence: 1.0,
      reason: `General human barge-in on user speech onset: ${triggerReason}`
    };
  }

  /**
   * Cancel currently active response across WebRTC DataChannel, Web Audio API GainNode,
   * HTMLAudioElement, and browser SpeechSynthesis with 0ms latency.
   */
  public cancelCurrentResponse(): void {
    console.log('[RealtimeInterruptionService] Canceling active response and halting audio outputs.');

    // 1. Instant 0ms hardware mute via Web Audio API GainNode
    if (this.gainNode && this.audioContext) {
      try {
        const now = this.audioContext.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(0, now);
      } catch (err) {
        console.debug('[RealtimeInterruptionService] GainNode zero error:', err);
      }
    }

    // 2. Pause & mute HTMLAudioElement and clear audio buffer
    if (this.audioElement) {
      try {
        this.audioElement.muted = true;
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (err) {
        console.debug('[RealtimeInterruptionService] AudioElement pause error:', err);
      }
    }
    console.log('[ROWAN VOICE] PLAYBACK_STOPPED | Local playback muted at 0ms');
    console.log('[ROWAN VOICE] AUDIO_BUFFER_CLEARED | Audio buffer reset');

    // 3. WebRTC DataChannel: Send response.cancel and conversation.item.truncate
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        // Send response.cancel to OpenAI Realtime engine
        this.dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
        console.log('[ROWAN VOICE] RESPONSE_CANCEL_SENT | Sent response.cancel via WebRTC DataChannel');

        // Truncate the assistant item if known so OpenAI's context matches the interruption point
        if (this.activeAssistantItemId) {
          const elapsedMs = Math.max(100, Date.now() - this.speechStartTime);
          this.dataChannel.send(JSON.stringify({
            type: 'conversation.item.truncate',
            item_id: this.activeAssistantItemId,
            content_index: 0,
            audio_end_ms: elapsedMs
          }));
          console.log(`[RealtimeInterruptionService] Sent conversation.item.truncate for item ${this.activeAssistantItemId} at ${elapsedMs}ms`);
        }
      } catch (err) {
        console.warn('[RealtimeInterruptionService] Failed to dispatch cancel/truncate on DataChannel:', err);
      }
    }

    // 4. Cancel SpeechSynthesis failsafe
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore
      }
    }

    this.isSpeaking = false;
  }

  /**
   * Monitor OpenAI Realtime server events arriving over the WebRTC DataChannel.
   * Ensures that if an accidental or premature response is created immediately after
   * an interruption (before user finishes talking), it is suppressed.
   */
  public handleRealtimeEvent(event: { type: string; [key: string]: unknown }): void {
    if (!event || !event.type) return;

    switch (event.type) {
      case 'response.created': {
        const resp = event.response as { id?: string } | undefined;
        this.activeResponseId = resp?.id || null;

        // If user just interrupted Rowan with "stop" or "wait", Rowan should NOT answer directly!
        // He must wait for the user to finish talking.
        if (this.isWaitingForUserToFinish) {
          console.log('[RealtimeInterruptionService] Suppressing automatic response while user is formulating thought.');
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
              this.dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
              console.log('[RealtimeInterruptionService] Suppressed premature response.cancel');
            } catch (err) {
              console.debug('[RealtimeInterruptionService] Suppress error:', err);
            }
          }
          this.callbacks.onStateChange?.('listening');
        }
        break;
      }

      case 'response.output_item.added': {
        const item = event.item as { id?: string; role?: string } | undefined;
        if (item?.role === 'assistant' && item.id) {
          this.activeAssistantItemId = item.id;
        }
        break;
      }

      case 'response.done':
      case 'response.output_item.done': {
        if (!this.isWaitingForUserToFinish) {
          this.activeResponseId = null;
        }
        break;
      }

      case 'input_audio_buffer.speech_started': {
        // User resumed speaking
        if (this.silenceWaitTimeout) {
          clearTimeout(this.silenceWaitTimeout);
          this.silenceWaitTimeout = null;
        }
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const text = ((event.transcript as string) || '').trim();
        if (!text) break;

        // Check if this transcription is just the stop command or subsequent user speech
        if (this.isWaitingForUserToFinish) {
          const match = matchInterruptionWhitelist(text);
          // If the user's utterance contains more than just the stop word, they are explaining/talking!
          const words = text.split(/\s+/).filter(Boolean);
          if (!match.matched || words.length > 3) {
            console.log(`[RealtimeInterruptionService] User finished speaking follow-up: "${text}". Releasing waiting lock.`);
            this.isWaitingForUserToFinish = false;
            if (this.silenceWaitTimeout) {
              clearTimeout(this.silenceWaitTimeout);
              this.silenceWaitTimeout = null;
            }
          }
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Restore audio output gain and volume when assistant starts speaking
   */
  public restoreAudioOutput(): void {
    if (this.gainNode && this.audioContext) {
      try {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
        const now = this.audioContext.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(1.0, now);
      } catch (err) {
        console.debug('[RealtimeInterruptionService] Restore gain error:', err);
      }
    }

    if (this.audioElement) {
      try {
        this.audioElement.muted = false;
        this.audioElement.volume = 1.0;
      } catch (err) {
        console.debug('[RealtimeInterruptionService] Restore audioElement error:', err);
      }
    }
  }

  /**
   * Check if the service is currently waiting for user to finish speaking
   */
  public isAwaitingUserSpeech(): boolean {
    return this.isWaitingForUserToFinish;
  }

  /**
   * Explicitly clear user waiting lock
   */
  public releaseUserWaitingLock(): void {
    this.isWaitingForUserToFinish = false;
    if (this.silenceWaitTimeout) {
      clearTimeout(this.silenceWaitTimeout);
      this.silenceWaitTimeout = null;
    }
  }

  /**
   * Clean up all references and timers
   */
  public destroy(): void {
    if (this.silenceWaitTimeout) {
      clearTimeout(this.silenceWaitTimeout);
      this.silenceWaitTimeout = null;
    }
    this.dataChannel = null;
    this.audioContext = null;
    this.gainNode = null;
    this.audioElement = null;
    this.isSpeaking = false;
    this.isWaitingForUserToFinish = false;
  }
}

// Global default service instance
export const realtimeInterruptionService = new RealtimeInterruptionService();
