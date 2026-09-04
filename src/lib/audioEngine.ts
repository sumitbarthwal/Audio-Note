import { DocumentItem, SectionItem, VoiceSettings, PlaybackState } from '../types';

export type PlaybackEventListener = (state: PlaybackState) => void;
export type SectionCompleteListener = (sectionIndex: number) => void;

class AudioEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activeDocument: DocumentItem | null = null;
  private currentSectionIdx = 0;
  private currentCharIdx = 0;
  private isSpeaking = false;
  private isPausedState = false;
  private voices: SpeechSynthesisVoice[] = [];
  private listeners: Set<PlaybackEventListener> = new Set();
  private sectionCompleteListeners: Set<SectionCompleteListener> = new Set();
  private audioContext: AudioContext | null = null;
  private silentGainNode: GainNode | null = null;
  private sleepTimerId: ReturnType<typeof setInterval> | null = null;
  private sleepTimerEnd: number | null = null;
  private sleepTimerMinutesRemaining = 0;
  private stopAtSectionEnd = false;

  private settings: VoiceSettings = {
    voiceURI: null,
    lang: 'en-US',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  private loadVoices() {
    if (!this.synth) return;
    const voiceList = this.synth.getVoices();
    if (voiceList.length > 0) {
      this.voices = voiceList;
      // Auto pick best matching voice if not set
      if (!this.settings.voiceURI) {
        const preferred =
          voiceList.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Enhanced'))) ||
          voiceList.find((v) => v.lang.startsWith('en')) ||
          voiceList[0];
        if (preferred) {
          this.settings.voiceURI = preferred.voiceURI;
          this.settings.lang = preferred.lang;
        }
      }
    }
  }

  public setVoiceSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    // If currently speaking, restart current section with new settings
    if (this.isSpeaking && !this.isPausedState) {
      this.speakSection(this.currentSectionIdx, this.currentCharIdx);
    }
  }

  public getVoiceSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public subscribe(listener: PlaybackEventListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public onSectionComplete(listener: SectionCompleteListener): () => void {
    this.sectionCompleteListeners.add(listener);
    return () => this.sectionCompleteListeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
    this.updateMediaSessionMetadata();
  }

  public getState(): PlaybackState {
    let currentWord = '';
    const section = this.getCurrentSection();
    if (section && this.currentCharIdx >= 0 && this.currentCharIdx < section.text.length) {
      const rest = section.text.slice(this.currentCharIdx);
      const match = rest.match(/^\S+/);
      currentWord = match ? match[0] : '';
    }

    return {
      isPlaying: this.isSpeaking && !this.isPausedState,
      isPaused: this.isPausedState,
      currentSectionIndex: this.currentSectionIdx,
      currentWordIndex: this.currentCharIdx,
      currentWord,
      elapsedSeconds: 0,
      autoScroll: true,
    };
  }

  public loadDocument(doc: DocumentItem, startSectionIndex?: number) {
    this.stop();
    this.activeDocument = doc;
    this.currentSectionIdx =
      startSectionIndex !== undefined
        ? startSectionIndex
        : Math.min(doc.currentSectionIndex || 0, Math.max(0, doc.sections.length - 1));
    this.currentCharIdx = 0;
    this.notify();
    this.setupMediaSession();
  }

  public getActiveDocument(): DocumentItem | null {
    return this.activeDocument;
  }

  public getCurrentSection(): SectionItem | null {
    if (!this.activeDocument || !this.activeDocument.sections) return null;
    return this.activeDocument.sections[this.currentSectionIdx] || null;
  }

  public play() {
    if (!this.activeDocument || this.activeDocument.sections.length === 0) return;

    if (this.isPausedState && this.synth) {
      this.synth.resume();
      this.isPausedState = false;
      this.isSpeaking = true;
      this.startBackgroundAudioAnchor();
      this.notify();
      return;
    }

    this.speakSection(this.currentSectionIdx, this.currentCharIdx);
  }

  public pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
      this.isPausedState = true;
      this.stopBackgroundAudioAnchor();
      this.notify();
    }
  }

  public togglePlayPause() {
    if (this.isSpeaking && !this.isPausedState) {
      this.pause();
    } else {
      this.play();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.isPausedState = false;
    this.currentCharIdx = 0;
    this.stopBackgroundAudioAnchor();
    this.notify();
  }

  public jumpToSection(index: number, charOffset = 0) {
    if (!this.activeDocument) return;
    const maxIdx = Math.max(0, this.activeDocument.sections.length - 1);
    const clamped = Math.max(0, Math.min(index, maxIdx));
    this.currentSectionIdx = clamped;
    this.currentCharIdx = charOffset;

    if (this.isSpeaking) {
      this.speakSection(clamped, charOffset);
    } else {
      this.notify();
    }
  }

  public skipForward() {
    // Jump to next section or skip 15 words forward
    if (!this.activeDocument) return;
    if (this.currentSectionIdx < this.activeDocument.sections.length - 1) {
      this.jumpToSection(this.currentSectionIdx + 1);
    }
  }

  public skipBackward() {
    if (!this.activeDocument) return;
    if (this.currentCharIdx > 30) {
      // Restart current section
      this.jumpToSection(this.currentSectionIdx, 0);
    } else if (this.currentSectionIdx > 0) {
      this.jumpToSection(this.currentSectionIdx - 1, 0);
    }
  }

  private speakSection(sectionIndex: number, startCharOffset = 0) {
    if (!this.synth || !this.activeDocument) return;

    this.synth.cancel();

    const section = this.activeDocument.sections[sectionIndex];
    if (!section || !section.text) {
      this.stop();
      return;
    }

    const textToSpeak =
      startCharOffset > 0 && startCharOffset < section.text.length
        ? section.text.slice(startCharOffset)
        : section.text;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Apply voice
    if (this.settings.voiceURI && this.voices.length > 0) {
      const selected = this.voices.find((v) => v.voiceURI === this.settings.voiceURI);
      if (selected) utterance.voice = selected;
    }

    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPausedState = false;
      this.startBackgroundAudioAnchor();
      this.notify();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word' || event.charIndex !== undefined) {
        this.currentCharIdx = startCharOffset + event.charIndex;
        this.notify();
      }
    };

    utterance.onend = () => {
      this.sectionCompleteListeners.forEach((fn) => fn(sectionIndex));

      if (this.stopAtSectionEnd) {
        this.stop();
        this.stopAtSectionEnd = false;
        return;
      }

      // Auto advance to next section
      if (this.activeDocument && sectionIndex < this.activeDocument.sections.length - 1) {
        this.currentSectionIdx = sectionIndex + 1;
        this.currentCharIdx = 0;
        this.speakSection(this.currentSectionIdx, 0);
      } else {
        // Document finished!
        this.stop();
      }
    };

    utterance.onerror = (err) => {
      // Canceled errors are expected during pause/stop
      if (err.error !== 'canceled' && err.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', err);
      }
      this.isSpeaking = false;
      this.notify();
    };

    this.currentUtterance = utterance;
    this.currentSectionIdx = sectionIndex;
    this.currentCharIdx = startCharOffset;
    this.synth.speak(utterance);
    this.notify();
  }

  // Sleep timer controls
  public setSleepTimer(minutes: number | 'end_of_section') {
    this.clearSleepTimer();
    if (minutes === 'end_of_section') {
      this.stopAtSectionEnd = true;
      return;
    }

    if (typeof minutes === 'number' && minutes > 0) {
      this.sleepTimerEnd = Date.now() + minutes * 60 * 1000;
      this.sleepTimerMinutesRemaining = minutes;
      this.sleepTimerId = setInterval(() => {
        if (!this.sleepTimerEnd) return;
        const diff = this.sleepTimerEnd - Date.now();
        if (diff <= 0) {
          this.pause();
          this.clearSleepTimer();
        } else {
          this.sleepTimerMinutesRemaining = Math.ceil(diff / 60000);
        }
      }, 5000);
    }
  }

  public clearSleepTimer() {
    if (this.sleepTimerId) {
      clearInterval(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    this.sleepTimerEnd = null;
    this.sleepTimerMinutesRemaining = 0;
    this.stopAtSectionEnd = false;
  }

  public getSleepTimerStatus(): { active: boolean; minutesRemaining: number; stopAtEndOfSection: boolean } {
    return {
      active: !!this.sleepTimerEnd || this.stopAtSectionEnd,
      minutesRemaining: this.sleepTimerMinutesRemaining,
      stopAtEndOfSection: this.stopAtSectionEnd,
    };
  }

  // Web Audio silent anchor to prevent mobile browser suspension in background
  private startBackgroundAudioAnchor() {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Create a near-silent oscillator (0.0001 volume) to keep mobile audio session warm
      if (!this.silentGainNode && this.audioContext) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.00001; // virtually inaudible
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        this.silentGainNode = gain;
      }
    } catch {
      // AudioContext background anchor is best-effort
    }
  }

  private stopBackgroundAudioAnchor() {
    try {
      if (this.audioContext && this.audioContext.state === 'running') {
        this.audioContext.suspend();
      }
    } catch {
      // Ignore
    }
  }

  // MediaSession API setup for lock screen & car bluetooth controls
  private setupMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.skipBackward());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.skipForward());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.skipBackward());
      navigator.mediaSession.setActionHandler('seekforward', () => this.skipForward());
    } catch (err) {
      console.warn('MediaSession action handler setup warning', err);
    }
  }

  private updateMediaSessionMetadata() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (!this.activeDocument) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const currentSec = this.getCurrentSection();
    const title = currentSec?.title || this.activeDocument.title;

    let voiceName = 'System Voice';
    if (this.settings.voiceURI && this.voices.length > 0) {
      const v = this.voices.find((voc) => voc.voiceURI === this.settings.voiceURI);
      if (v) voiceName = v.name;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: voiceName,
        album: this.activeDocument.title,
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState =
        this.isSpeaking && !this.isPausedState ? 'playing' : this.isPausedState ? 'paused' : 'none';
    } catch {
      // Ignore
    }
  }
}

export const audioEngine = new AudioEngine();
