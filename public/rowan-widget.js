(function() {
  // Prevent duplicate initialization
  if (window.__RowanWidgetLoaded__) return;
  window.__RowanWidgetLoaded__ = true;

  // Retrieve store/merchant configuration from script data attribute
  const currentScript = document.currentScript;
  const storeId = currentScript ? currentScript.getAttribute('data-store-id') : 'default';

  // Create containment host for Shadow DOM
  const container = document.createElement('div');
  container.id = 'rowan-widget-host';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  // Embedded Widget Stylesheet for complete CSS containment
  const styles = `
    :host {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --bg-panel: #ffffff;
      --text-main: #1f2937;
      --text-muted: #6b7280;
      --border-color: #e5e7eb;
      --bubble-user: #4f46e5;
      --bubble-bot: #f3f4f6;
      --font-stack: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: var(--font-stack);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Floating Bubble Launcher */
    .rowan-launcher {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .rowan-launcher:hover {
      transform: scale(1.06);
      box-shadow: 0 20px 35px -10px rgba(79, 70, 229, 0.5), 0 12px 15px -8px rgba(79, 70, 229, 0.4);
    }

    .rowan-launcher:active {
      transform: scale(0.95);
    }

    .rowan-launcher svg {
      width: 24px;
      height: 24px;
      animation: floatPulse 3s ease-in-out infinite;
    }

    .status-badge {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #10b981;
      border: 2px solid #ffffff;
      position: absolute;
      top: 1px;
      right: 1px;
    }

    /* Floating Chat Panel */
    .rowan-panel {
      position: absolute;
      bottom: 72px;
      right: 0;
      width: 400px;
      height: 600px;
      background: var(--bg-panel);
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform-origin: bottom right;
      transform: scale(0.8) translateY(20px);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .rowan-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      visibility: visible;
    }

    /* Responsive Fullscreen on Mobile */
    @media (max-width: 480px) {
      :host {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
      }
      .rowan-launcher {
        display: none;
      }
      .rowan-launcher.always-hide {
        display: none !important;
      }
      .rowan-panel {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
        border: none;
      }
      .rowan-panel.open {
        transform: none;
      }
    }

    /* Header Panel */
    .rowan-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(to right, rgba(79, 70, 229, 0.03), rgba(99, 102, 241, 0.03));
    }

    .merchant-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .merchant-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: bold;
    }

    .merchant-details h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .merchant-details p {
      font-size: 10px;
      color: var(--text-muted);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #10b981;
      display: inline-block;
      animation: pulseAnim 2s infinite;
    }

    .header-actions {
      display: flex;
      gap: 6px;
    }

    .header-btn {
      background: transparent;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-muted);
      transition: background-color 0.2s;
    }

    .header-btn:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--text-main);
    }

    /* Chat Messages Body */
    .rowan-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background-color: #fafafa;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .msg-row {
      display: flex;
      width: 100%;
    }

    .msg-row.user {
      justify-content: flex-end;
    }

    .msg-row.assistant {
      justify-content: flex-start;
    }

    .msg-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.5;
      word-wrap: break-word;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .msg-row.user .msg-bubble {
      background-color: var(--bubble-user);
      color: #ffffff;
      border-bottom-right-radius: 0;
    }

    .msg-row.assistant .msg-bubble {
      background-color: var(--bubble-bot);
      color: var(--text-main);
      border-top-left-radius: 0;
      border: 1px solid var(--border-color);
    }

    /* Rich Recommendations list */
    .widget-products-grid {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .widget-product-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 8px;
      background-color: #ffffff;
      border: 1px solid var(--border-color);
      font-size: 12px;
      transition: border-color 0.2s;
    }

    .widget-product-card:hover {
      border-color: var(--primary);
    }

    .wp-details {
      display: flex;
      flex-direction: column;
    }

    .wp-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .wp-price {
      color: var(--primary);
      font-weight: 500;
      font-size: 11px;
    }

    .wp-category {
      font-size: 10px;
      padding: 2px 6px;
      background-color: rgba(79,70,229,0.08);
      color: var(--primary);
      border-radius: 4px;
      font-weight: 500;
    }

    /* Thinking state loader */
    .thinking-bubble {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 12px;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(79, 70, 229, 0.1);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Footer Input */
    .rowan-footer {
      padding: 12px;
      border-top: 1px solid var(--border-color);
      background-color: #ffffff;
    }

    .rowan-form {
      display: flex;
      gap: 8px;
    }

    .rowan-input {
      flex: 1;
      height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      font-size: 13.5px;
      outline: none;
      transition: all 0.2s;
    }

    .rowan-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    }

    .rowan-send {
      width: 38px;
      height: 38px;
      background-color: var(--primary);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .rowan-send:hover {
      background-color: var(--primary-hover);
    }

    .rowan-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .rowan-send svg {
      width: 16px;
      height: 16px;
    }

    /* Rowan Voice (Orange-Style Assistant) CSS */
    .rowan-voice-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #ff5411; /* Vibrant Tactile Orange */
      z-index: 100;
      display: flex;
      flex-direction: column;
      color: #ffffff;
      opacity: 0;
      transform: translateY(100%);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      visibility: hidden;
    }

    .rowan-voice-overlay.active {
      opacity: 1;
      transform: translateY(0);
      visibility: visible;
    }

    .voice-header {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    .voice-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .voice-dot {
      width: 8px;
      height: 8px;
      background-color: #ffffff;
      border-radius: 50%;
    }

    .voice-close-btn {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #ffffff;
      transition: background 0.2s;
    }

    .voice-close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .voice-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 24px 20px;
      text-align: center;
    }

    /* Orange Visualizer Ring */
    .visualizer-container {
      margin-top: 5px;
      position: relative;
      width: 140px;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .visualizer-circle {
      width: 100px;
      height: 100px;
      background: #111111; /* Contrasting solid tactile core */
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), inset 0 2px 5px rgba(255, 255, 255, 0.1);
      z-index: 5;
    }

    .visualizer-mic-icon {
      color: #ff5411;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .visualizer-mic-icon svg {
      width: 32px;
      height: 32px;
    }

    /* Ripple Wave animations */
    .visualizer-wave {
      position: absolute;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-radius: 50%;
      width: 100px;
      height: 100px;
      opacity: 0;
      z-index: 1;
      pointer-events: none;
    }

    /* Wave pulsing patterns for active states */
    .rowan-voice-overlay.state-listening .visualizer-mic-icon {
      transform: scale(1.15);
      color: #ffffff;
    }

    .rowan-voice-overlay.state-listening .wave-1 {
      animation: ripple 1.8s infinite linear;
    }
    .rowan-voice-overlay.state-listening .wave-2 {
      animation: ripple 1.8s infinite linear 0.6s;
    }
    .rowan-voice-overlay.state-listening .wave-3 {
      animation: ripple 1.8s infinite linear 1.2s;
    }

    .rowan-voice-overlay.state-speaking .wave-1 {
      animation: rippleActive 1.2s infinite ease-out;
      border-color: rgba(255, 255, 255, 0.65);
    }
    .rowan-voice-overlay.state-speaking .wave-2 {
      animation: rippleActive 1.2s infinite ease-out 0.4s;
      border-color: rgba(255, 255, 255, 0.65);
    }

    .rowan-voice-overlay.state-thinking .visualizer-circle {
      animation: rotatingRing 2s infinite linear;
      border: 3px dashed rgba(255, 255, 255, 0.6);
    }

    .rowan-voice-overlay.state-error .visualizer-circle {
      background: #7f1d1d;
    }
    .rowan-voice-overlay.state-error .visualizer-mic-icon {
      color: #fca5a5;
    }

    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    @keyframes rippleActive {
      0% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.35); opacity: 0.4; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    @keyframes rotatingRing {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* State labels */
    .voice-state-label {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1.5px;
      background: rgba(0,0,0,0.2);
      padding: 5px 12px;
      border-radius: 20px;
      margin-top: 10px;
      text-transform: uppercase;
    }

    /* Subtitles & transcript scroll pane */
    .voice-transcript-container {
      width: 100%;
      max-height: 110px;
      overflow-y: auto;
      margin: 12px 0;
      padding: 0 10px;
    }

    .voice-subtitle {
      font-size: 13px;
      font-weight: 500;
      opacity: 0.95;
      line-height: 1.4;
    }

    .voice-transcript {
      font-size: 14px;
      font-weight: 700;
      margin-top: 8px;
      line-height: 1.4;
      background: rgba(255,255,255,0.15);
      padding: 8px 12px;
      border-radius: 8px;
      word-wrap: break-word;
      display: none;
    }

    .voice-transcript.has-content {
      display: block;
    }

    /* Control widgets */
    .voice-controls {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .voice-action-btn {
      width: 100%;
      background: #111111;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 11px 24px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      text-transform: uppercase;
    }

    .voice-action-btn:hover {
      background: #222222;
      transform: translateY(-1px);
    }

    .voice-action-btn:active {
      transform: translateY(1px);
    }

    /* Toggle Switches for continuous wake word */
    .wake-word-control {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      font-weight: 600;
      opacity: 0.95;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 34px;
      height: 20px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255,255,255,0.3);
      transition: .3s;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
    }

    input:checked + .slider {
      background-color: #111111;
    }

    input:checked + .slider:before {
      transform: translateX(14px);
    }

    .slider.round {
      border-radius: 34px;
    }

    .slider.round:before {
      border-radius: 50%;
    }

    /* Animations */
    @keyframes floatPulse {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    @keyframes pulseAnim {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.6; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  // Inject CSS styles into the Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  // Load existing session or establish a new UUID securely
  let sessionId = localStorage.getItem('rowan_widget_session_id') || null;

  // Initial greeting
  const initialMessages = [
    {
      role: 'assistant',
      text: "Hello! I'm Rowan, the storefront assistant. Ask me anything about our catalogs, return policies, or latest deals!"
    }
  ];

  // Load messages from localStorage to guarantee persistence across merchant navigation pages
  let chatHistory = [];
  try {
    const cached = localStorage.getItem('rowan_widget_chat_history');
    if (cached) {
      chatHistory = JSON.parse(cached);
    } else {
      chatHistory = [...initialMessages];
    }
  } catch(e) {
    chatHistory = [...initialMessages];
  }

  // Create UI Nodes
  const launcher = document.createElement('div');
  launcher.className = 'rowan-launcher';
  launcher.innerHTML = `
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
    <div class="status-badge"></div>
  `;

  const panel = document.createElement('div');
  panel.className = 'rowan-panel';
  panel.innerHTML = `
    <div class="rowan-header">
      <div class="merchant-info">
        <div class="merchant-logo">R</div>
        <div class="merchant-details">
          <h3>Rowan Shop Assistant <span class="pulse-dot"></span></h3>
          <p>Online & Ready</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="header-btn start-voice" title="Rowan Voice Mode">
          <svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 1v11m-4-6a4 4 0 008 0M19 10v2a7 7 0 01-14 0v-2" />
          </svg>
        </button>
        <button class="header-btn clear-history" title="Clear Chat History">
          <svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button class="header-btn close-panel" title="Close">
          <svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="rowan-messages"></div>
    
    <div class="rowan-footer">
      <form class="rowan-form">
        <input class="rowan-input" type="text" placeholder="Type a message..." required />
        <button class="rowan-send" type="submit">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    </div>

    <!-- Phase 9 — Rowan Voice Overlay (Tactile Orange hardware style) -->
    <div class="rowan-voice-overlay">
      <div class="voice-header">
        <div class="voice-brand">
          <span class="voice-dot"></span>
          <span>ROWAN VOICE</span>
        </div>
        <button class="voice-close-btn" title="Exit Voice Mode">
          <svg style="width:14px;height:14px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="voice-body">
        <!-- Circular tactile visualizer screen -->
        <div class="visualizer-container">
          <div class="visualizer-wave wave-1"></div>
          <div class="visualizer-wave wave-2"></div>
          <div class="visualizer-wave wave-3"></div>
          <div class="visualizer-circle">
            <div class="visualizer-mic-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 1v11m-4-6a4 4 0 008 0M19 10v2a7 7 0 01-14 0v-2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
        
        <!-- Interactive State HUD label -->
        <div class="voice-state-label">IDLE</div>
        
        <!-- Live speech caption box -->
        <div class="voice-transcript-container">
          <p class="voice-subtitle">Say "Rowan" or tap below to talk</p>
          <p class="voice-transcript"></p>
        </div>
        
        <!-- System Control Dashboard -->
        <div class="voice-controls">
          <button class="voice-action-btn mic-trigger" type="button">TAP TO TALK</button>
          
          <div class="wake-word-control">
            <label class="switch">
              <input type="checkbox" class="wake-word-toggle">
              <span class="slider round"></span>
            </label>
            <span class="wake-word-text">Continuous wake-word ("Rowan")</span>
          </div>
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(launcher);
  shadow.appendChild(panel);

  const messagesContainer = panel.querySelector('.rowan-messages');
  const inputEl = panel.querySelector('.rowan-input');
  const formEl = panel.querySelector('.rowan-form');
  const sendBtn = panel.querySelector('.rowan-send');
  const closeBtn = panel.querySelector('.close-panel');
  const clearBtn = panel.querySelector('.clear-history');

  // Voice elements selectors
  const startVoiceBtn = panel.querySelector('.start-voice');
  const voiceOverlay = panel.querySelector('.rowan-voice-overlay');
  const voiceCloseBtn = panel.querySelector('.voice-close-btn');
  const voiceMicBtn = panel.querySelector('.mic-trigger');
  const voiceStateLabel = panel.querySelector('.voice-state-label');
  const voiceSubtitle = panel.querySelector('.voice-subtitle');
  const voiceTranscript = panel.querySelector('.voice-transcript');
  const wakeWordToggle = panel.querySelector('.wake-word-toggle');

  // Voice Interaction State-Machine variables
  let voiceState = 'IDLE'; // IDLE, LISTENING, THINKING, RESPONDING, SPEAKING, ERROR
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  let activeRecognizer = null;
  let wakeWordRecognizer = null;
  let currentUtterance = null;

  // Synthesize rich native chimes & beeps to mimic hardware reactions
  function playChime(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'listening') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'speaking') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('[Rowan Voice] WebAudio chime blocked or unsupported:', e);
    }
  }

  // Update Voice Panel visual state classes & labels
  function setVoiceState(state) {
    voiceState = state;
    voiceStateLabel.textContent = state;
    
    // Clear state classes on overlay
    voiceOverlay.classList.remove('state-listening', 'state-thinking', 'state-speaking', 'state-error');
    
    if (state === 'LISTENING') {
      voiceOverlay.classList.add('state-listening');
      voiceMicBtn.textContent = 'STOP SPEAKING';
    } else if (state === 'THINKING') {
      voiceOverlay.classList.add('state-thinking');
      voiceMicBtn.textContent = 'ROWAN PROCESSING...';
    } else if (state === 'SPEAKING' || state === 'RESPONDING') {
      voiceOverlay.classList.add('state-speaking');
      voiceMicBtn.textContent = 'TAP TO INTERRUPT';
    } else if (state === 'ERROR') {
      voiceOverlay.classList.add('state-error');
      voiceMicBtn.textContent = 'RETRY';
    } else {
      // IDLE
      voiceMicBtn.textContent = 'TAP TO TALK';
    }
  }

  // Gracefully transition voice mode to error state
  function showVoiceError(message) {
    playChime('error');
    setVoiceState('ERROR');
    voiceSubtitle.textContent = message;
    voiceTranscript.textContent = "";
    voiceTranscript.classList.remove('has-content');
  }

  // 1. ACTIVE SPEECH-TO-TEXT SESSION (CAPTURING INPUT)
  function startActiveSpeechCapture() {
    // Interrupted any previous TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setVoiceState('LISTENING');
    playChime('listening');
    voiceSubtitle.textContent = "Listening to your voice...";
    voiceTranscript.textContent = "";
    voiceTranscript.classList.remove('has-content');

    if (!SpeechRecognition) {
      showVoiceError("Web Speech API is unsupported in this browser. Use Chrome or Safari.");
      return;
    }

    if (activeRecognizer) {
      try { activeRecognizer.stop(); } catch(e){}
    }

    activeRecognizer = new SpeechRecognition();
    activeRecognizer.continuous = false;
    activeRecognizer.interimResults = true;
    activeRecognizer.lang = 'en-US';

    let finalTranscript = '';

    activeRecognizer.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      const currentText = finalTranscript || interimTranscript;
      if (currentText) {
        voiceTranscript.textContent = currentText;
        voiceTranscript.classList.add('has-content');
      }
    };

    activeRecognizer.onerror = (err) => {
      console.warn('[Rowan active mic error]:', err.error);
      if (err.error === 'not-allowed') {
        showVoiceError("Microphone access denied. Please click the lock icon in your URL bar and allow microphone permissions.");
      } else if (err.error === 'no-speech') {
        setVoiceState('IDLE');
        voiceSubtitle.textContent = "No voice captured. Tap again or say 'Rowan' to speak.";
      } else {
        showVoiceError(`Voice Capture Error: ${err.error}`);
      }
    };

    activeRecognizer.onend = () => {
      if (voiceState === 'LISTENING') {
        const text = voiceTranscript.textContent.trim();
        if (text) {
          sendVoicePromptToAI(text);
        } else {
          setVoiceState('IDLE');
          voiceSubtitle.textContent = "Say 'Rowan' or tap to talk";
        }
      }
    };

    try {
      activeRecognizer.start();
    } catch(err) {
      showVoiceError(`Failed to initialize microphone stream: ${err.message}`);
    }
  }

  // 2. TRANSMIT TRANSCRIPT TO TENANT CHAT HANDLER
  async function sendVoicePromptToAI(text) {
    setVoiceState('THINKING');
    voiceSubtitle.textContent = "Processing response...";

    // Append to regular chat stream history in local storage
    const userMsg = { role: 'user', text };
    chatHistory.push(userMsg);
    localStorage.setItem('rowan_widget_chat_history', JSON.stringify(chatHistory));
    renderHistory();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        if (data.sessionId && !sessionId) {
          sessionId = data.sessionId;
          localStorage.setItem('rowan_widget_session_id', sessionId);
        }

        const botMsg = {
          role: 'assistant',
          text: data.message,
          products: data.products || []
        };
        chatHistory.push(botMsg);
        localStorage.setItem('rowan_widget_chat_history', JSON.stringify(chatHistory));
        renderHistory();

        setVoiceState('RESPONDING');
        speakAloud(data.message);
      } else {
        throw new Error(data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('[Rowan Voice AI error]:', err);
      showVoiceError("Sorry, we encountered a network issue communicating with Rowan's voice engine.");
    }
  }

  // 3. NATIVE TEXT-TO-SPEECH (SPEAKING ALOUD)
  function speakAloud(text) {
    if (!window.speechSynthesis) {
      setVoiceState('IDLE');
      voiceSubtitle.textContent = text;
      return;
    }

    // Clean text of markdown characters
    const cleanText = text.replace(/[\*\#\`\_\-\[\]]/g, '');

    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = 'en-US';

    currentUtterance.onstart = () => {
      setVoiceState('SPEAKING');
      playChime('speaking');
      voiceSubtitle.textContent = text;
    };

    currentUtterance.onend = () => {
      setVoiceState('IDLE');
      voiceSubtitle.textContent = "Say 'Rowan' or tap to speak";
      
      // Auto restart continuous wake-word listener if checked
      if (wakeWordToggle && wakeWordToggle.checked) {
        startWakeWordListening();
      }
    };

    currentUtterance.onerror = (err) => {
      console.warn('[Rowan TTS speech error]:', err);
      setVoiceState('IDLE');
      voiceSubtitle.textContent = "Finished speaking";
      if (wakeWordToggle && wakeWordToggle.checked) {
        startWakeWordListening();
      }
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  // 4. REAL WAKE-WORD LISTENER ("ROWAN")
  function startWakeWordListening() {
    if (!SpeechRecognition) return;
    
    // Stop any existing session
    if (wakeWordRecognizer) {
      try { wakeWordRecognizer.stop(); } catch(e){}
    }

    wakeWordRecognizer = new SpeechRecognition();
    wakeWordRecognizer.continuous = true;
    wakeWordRecognizer.interimResults = true;
    wakeWordRecognizer.lang = 'en-US';

    wakeWordRecognizer.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        console.log("[Wake Word Monitor] Captured:", transcript);
        if (transcript.includes('rowan')) {
          console.log("[Wake Word Monitor] Wake word triggered!");
          try { wakeWordRecognizer.stop(); } catch(e){}
          
          // Open widget launcher panel if collapsed
          if (!panel.classList.contains('open')) {
            panel.classList.add('open');
            scrollToBottom();
          }

          // Open voice overlay and capture speech
          openVoiceOverlay();
          startActiveSpeechCapture();
          break;
        }
      }
    };

    wakeWordRecognizer.onerror = (err) => {
      console.warn('[Wake Word Error]:', err.error);
      if (err.error === 'not-allowed') {
        showVoiceError("Microphone access denied for wake-word. Please grant permissions.");
        wakeWordToggle.checked = false;
      }
    };

    wakeWordRecognizer.onend = () => {
      if (wakeWordToggle && wakeWordToggle.checked && voiceState === 'IDLE') {
        try { wakeWordRecognizer.start(); } catch(e){}
      }
    };

    try {
      wakeWordRecognizer.start();
      console.log("[Wake Word Monitor] Ready to trigger on 'Rowan'...");
    } catch(err) {
      console.error("[Wake Word Monitor] Start failure:", err);
    }
  }

  // Stop all active microphone bindings safely
  function stopAllMicrophoneUsage() {
    if (activeRecognizer) {
      try { activeRecognizer.stop(); } catch(e){}
    }
    if (wakeWordRecognizer) {
      try { wakeWordRecognizer.stop(); } catch(e){}
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceState('IDLE');
  }

  function openVoiceOverlay() {
    voiceOverlay.classList.add('active');
    inputEl.disabled = true;
    sendBtn.disabled = true;
  }

  function closeVoiceOverlay() {
    stopAllMicrophoneUsage();
    voiceOverlay.classList.remove('active');
    inputEl.disabled = false;
    sendBtn.disabled = false;
  }

  // Bind Voice Overlay Buttons
  startVoiceBtn.addEventListener('click', () => {
    openVoiceOverlay();
    startActiveSpeechCapture();
  });

  voiceCloseBtn.addEventListener('click', () => {
    closeVoiceOverlay();
  });

  // Action Button for mic/mute/interruptions
  voiceMicBtn.addEventListener('click', () => {
    if (voiceState === 'LISTENING') {
      // Stop listening (this will trigger processing)
      if (activeRecognizer) {
        try { activeRecognizer.stop(); } catch(e){}
      }
    } else if (voiceState === 'SPEAKING' || voiceState === 'RESPONDING' || voiceState === 'THINKING') {
      // Interruption / Cancellation
      stopAllMicrophoneUsage();
      setVoiceState('IDLE');
      voiceSubtitle.textContent = "Interrupted. Tap to speak.";
    } else {
      // IDLE or ERROR -> start recording
      startActiveSpeechCapture();
    }
  });

  // Wake-word toggle change handler
  wakeWordToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      startWakeWordListening();
      voiceSubtitle.textContent = 'Continuous wake-word active. Say "Rowan" anytime!';
    } else {
      if (wakeWordRecognizer) {
        try { wakeWordRecognizer.stop(); } catch(e){}
      }
      voiceSubtitle.textContent = 'Say "Rowan" or tap below to talk';
    }
  });

  // Load chat history from Firestore if sessionId is already established
  if (sessionId) {
    fetch(`/api/tenant/conversations/${sessionId}/messages`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.messages && d.messages.length > 0) {
          chatHistory = d.messages;
          localStorage.setItem('rowan_widget_chat_history', JSON.stringify(chatHistory));
          renderHistory();
        }
      })
      .catch(e => console.error('[Rowan Widget] History fetch failed:', e));
  }

  function renderHistory() {
    messagesContainer.innerHTML = '';
    chatHistory.forEach(msg => {
      appendBubbleUI(msg.role, msg.text, msg.products);
    });
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
  }

  function appendBubbleUI(role, text, products = []) {
    const row = document.createElement('div');
    row.className = `msg-row ${role}`;
    
    let productsHTML = '';
    if (products && products.length > 0) {
      productsHTML = `<div class="widget-products-grid">`;
      products.forEach(p => {
        productsHTML += `
          <div class="widget-product-card">
            <div class="wp-details">
              <span class="wp-name">${escapeHTML(p.name)}</span>
              <span class="wp-price">$${p.price}</span>
            </div>
            <span class="wp-category">${escapeHTML(p.category)}</span>
          </div>
        `;
      });
      productsHTML += `</div>`;
    }

    row.innerHTML = `
      <div class="msg-bubble">
        <div>${escapeHTML(text)}</div>
        ${productsHTML}
      </div>
    `;
    messagesContainer.appendChild(row);
    scrollToBottom();
  }

  function appendThinkingBubble() {
    const row = document.createElement('div');
    row.className = 'msg-row assistant thinking-row';
    row.innerHTML = `
      <div class="msg-bubble thinking-bubble">
        <div class="spinner"></div>
        <span>Thinking...</span>
      </div>
    `;
    messagesContainer.appendChild(row);
    scrollToBottom();
  }

  function removeThinkingBubble() {
    const thinkingRow = messagesContainer.querySelector('.thinking-row');
    if (thinkingRow) {
      thinkingRow.remove();
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toggle Panel Open/Close
  launcher.addEventListener('click', () => {
    panel.classList.toggle('open');
    scrollToBottom();
    setTimeout(() => inputEl.focus(), 150);
  });

  closeBtn.addEventListener('click', () => {
    closeVoiceOverlay();
    panel.classList.remove('open');
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your current conversation history?')) {
      closeVoiceOverlay();
      sessionId = null;
      localStorage.removeItem('rowan_widget_session_id');
      chatHistory = [...initialMessages];
      localStorage.setItem('rowan_widget_chat_history', JSON.stringify(chatHistory));
      renderHistory();
    }
  });

  // Handle message sending securely
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    inputEl.disabled = true;
    sendBtn.disabled = true;

    // Add user message to history & view
    const userMsg = { role: 'user', text };
    chatHistory.push(userMsg);
    localStorage.setItem('rowan_widget_chat_history', JSON.stringify(chatHistory));
    appendBubbleUI('user', text);
    appendThinkingBubble();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId || undefined
        })
      });

      const data = await response.json();
      removeThinkingBubble();

      if (data.success) {
        if (data.sessionId && !sessionId) {
          sessionId = data.sessionId;
          localStorage.setItem('rowan_widget_session_id', sessionId);
        }

        const botMsg = {
          role: 'assistant',
          text: data.message,
          products: data.products || []
        };
        chatHistory.push(botMsg);
        localStorage.setItem('rowan_widget_chat_history', JSON.stringify(chatHistory));
        appendBubbleUI('assistant', data.message, data.products);
      } else {
        throw new Error(data.message || 'Operation failed');
      }
    } catch(err) {
      removeThinkingBubble();
      appendBubbleUI('assistant', 'Sorry, I am having trouble connecting to the network right now. Please try again later.');
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  });

  // Initial paint
  renderHistory();
})();
