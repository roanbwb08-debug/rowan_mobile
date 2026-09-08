import { Router } from 'express'
import cors from 'cors'
import { z } from 'zod'
import { getWebsiteBySiteId, searchWebsiteKnowledge } from '../services/websites.js'
import { RowanOrchestrator } from '../services/ai/orchestration.js'
import { appendConversationMessage } from '../services/db.js'

const router = Router()
const orchestrator = new RowanOrchestrator()

// Enable open CORS for all public widget endpoints
router.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }))

// In-memory rate limiting for widget endpoints: max 30 requests per minute per IP
const widgetRequests = new Map<string, { count: number; reset: number }>()

function widgetRateLimit(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'widget_client'
  const now = Date.now()
  const current = widgetRequests.get(ip) ?? { count: 0, reset: now + 60_000 }

  if (now > current.reset) {
    current.count = 0
    current.reset = now + 60_000
  }

  if (++current.count > 35) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down and try again shortly.'
    })
  }

  widgetRequests.set(ip, current)
  next()
}

/**
 * GET /widget.js
 * Serves the embeddable JavaScript client loader for Rowan.
 */
router.get('/widget.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=600')

  const widgetScript = `
(function() {
  if (window.__ROWAN_WIDGET_LOADED__) return;
  window.__ROWAN_WIDGET_LOADED__ = true;

  // 1. Detect configuration from current script tag
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var siteId = currentScript ? (currentScript.getAttribute('data-rowan-site') || currentScript.getAttribute('data-site-id')) : null;
  if (!siteId && window.ROWAN_SITE_ID) {
    siteId = window.ROWAN_SITE_ID;
  }

  if (!siteId) {
    console.warn('[Rowan Widget] Missing data-rowan-site attribute on script tag.');
    return;
  }

  var scriptSrc = currentScript ? currentScript.src : window.location.origin;
  var apiBase = window.ROWAN_HOST || scriptSrc.replace(/\\/widget\\.js.*$/, '');
  if (!apiBase || apiBase === '' || apiBase === '.') apiBase = window.location.origin;

  // 2. Initialize Session
  var storageKey = 'rowan_session_' + siteId;
  var sessionId = sessionStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = 'wsess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    sessionStorage.setItem(storageKey, sessionId);
  }

  // 3. Create Widget Host Element with Isolated Shadow DOM
  var container = document.createElement('div');
  container.id = 'rowan-ai-widget-host';
  document.body.appendChild(container);

  var shadow = container.attachShadow ? container.attachShadow({ mode: 'open' }) : container;

  // 4. Inject Styles & Markup into Shadow DOM
  var style = document.createElement('style');
  style.textContent = \`
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .rowan-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 58px;
      height: 58px;
      border-radius: 29px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25), 0 2px 6px rgba(0,0,0,0.1);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      z-index: 2147483640;
      border: 1px solid rgba(255, 255, 255, 0.15);
      outline: none;
    }
    .rowan-launcher:hover {
      transform: scale(1.06);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.35);
    }
    .rowan-launcher:active {
      transform: scale(0.96);
    }
    .rowan-launcher svg {
      width: 26px;
      height: 26px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .rowan-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      background: #10b981;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
    }
    .rowan-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 580px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483645;
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .rowan-panel.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .rowan-header {
      padding: 16px 18px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
    }
    .rowan-brand-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .rowan-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
      border: 1px solid #334155;
    }
    .rowan-avatar svg {
      width: 20px;
      height: 20px;
    }
    .rowan-title-group h3 {
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
      line-height: 1.2;
    }
    .rowan-title-group p {
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .rowan-title-group p::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .rowan-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .rowan-close-btn:hover {
      background: #1e293b;
      color: #ffffff;
    }
    .rowan-close-btn svg {
      width: 18px;
      height: 18px;
    }
    .rowan-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    .rowan-msg-row {
      display: flex;
      flex-direction: column;
      max-width: 88%;
      animation: msgFadeIn 0.2s ease-out;
    }
    @keyframes msgFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .rowan-msg-row.user {
      align-self: flex-end;
    }
    .rowan-msg-row.assistant {
      align-self: flex-start;
    }
    .rowan-bubble-user {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 16px 16px 3px 16px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .rowan-bubble-assistant {
      background: #ffffff;
      color: #1e293b;
      padding: 12px 15px;
      border-radius: 16px 16px 16px 3px;
      font-size: 13.5px;
      line-height: 1.5;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      word-break: break-word;
    }
    .rowan-bubble-assistant p {
      margin-bottom: 8px;
    }
    .rowan-bubble-assistant p:last-child {
      margin-bottom: 0;
    }
    .rowan-bubble-assistant strong {
      font-weight: 600;
      color: #0f172a;
    }
    .rowan-bubble-assistant ul {
      margin: 6px 0 6px 18px;
    }
    .rowan-bubble-assistant li {
      margin-bottom: 4px;
    }
    .rowan-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px 16px 16px 3px;
      width: fit-content;
    }
    .rowan-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
      animation: dotPulse 1.4s infinite ease-in-out both;
    }
    .rowan-dot:nth-child(1) { animation-delay: -0.32s; }
    .rowan-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.1); opacity: 1; background: #0284c7; }
    }
    .rowan-input-area {
      padding: 12px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rowan-form {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rowan-input {
      flex: 1;
      height: 40px;
      padding: 0 14px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      font-size: 13.5px;
      outline: none;
      background: #f8fafc;
      color: #0f172a;
      transition: border-color 0.15s, background 0.15s;
    }
    .rowan-input:focus {
      border-color: #0f172a;
      background: #ffffff;
    }
    .rowan-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      outline: none;
    }
    .rowan-send-btn:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
      opacity: 0.7;
    }
    .rowan-send-btn svg {
      width: 16px;
      height: 16px;
    }
    .rowan-footer {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    @media (max-width: 480px) {
      .rowan-panel {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
      }
      .rowan-launcher {
        bottom: 16px;
        right: 16px;
      }
    }
  \`;
  shadow.appendChild(style);

  // 5. HTML Shell
  var wrapper = document.createElement('div');
  wrapper.innerHTML = \`
    <button class="rowan-launcher" id="rowanLauncher" aria-label="Open Rowan AI Assistant">
      <svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      <div class="rowan-badge"></div>
    </button>
    <div class="rowan-panel" id="rowanPanel">
      <div class="rowan-header">
        <div class="rowan-brand-info">
          <div class="rowan-avatar">
            <svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6.2 4.5 2.4 7.3-6.2-4.5-6.2 4.5 2.4-7.3-6.2-4.5h7.6z"/></svg>
          </div>
          <div class="rowan-title-group">
            <h3 id="rowanBotName">Rowan Assistant</h3>
            <p>Online &bull; Ready to help</p>
          </div>
        </div>
        <button class="rowan-close-btn" id="rowanCloseBtn" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="rowan-messages" id="rowanMessages"></div>
      <div class="rowan-input-area">
        <form class="rowan-form" id="rowanForm">
          <input type="text" class="rowan-input" id="rowanInput" placeholder="Ask a question..." autocomplete="off" />
          <button type="submit" class="rowan-send-btn" id="rowanSendBtn" aria-label="Send message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
        <div class="rowan-footer">
          Powered by <strong>Rowan.AI</strong>
        </div>
      </div>
    </div>
  \`;
  shadow.appendChild(wrapper);

  var launcher = shadow.getElementById('rowanLauncher');
  var panel = shadow.getElementById('rowanPanel');
  var closeBtn = shadow.getElementById('rowanCloseBtn');
  var form = shadow.getElementById('rowanForm');
  var input = shadow.getElementById('rowanInput');
  var sendBtn = shadow.getElementById('rowanSendBtn');
  var messagesContainer = shadow.getElementById('rowanMessages');
  var botNameEl = shadow.getElementById('rowanBotName');

  var isOpen = false;
  var isSending = false;
  var websiteConfig = {
    name: 'Rowan Assistant',
    welcomeMessage: "Hi! I'm Rowan. How can I help you today?"
  };

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add('open');
      launcher.style.transform = 'scale(0.85)';
      launcher.style.opacity = '0.4';
      input.focus();
    } else {
      panel.classList.remove('open');
      launcher.style.transform = '';
      launcher.style.opacity = '';
    }
  }

  launcher.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatAssistantMarkdown(text) {
    var raw = escapeHtml(text);
    // Bold
    raw = raw.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    // Bullet points
    raw = raw.replace(/^[-*]\\s+(.*)$/gm, '<li>$1</li>');
    raw = raw.replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>');
    // Paragraphs
    var paragraphs = raw.split(/\\n\\n+/);
    return paragraphs.map(function(p) { return '<p>' + p.replace(/\\n/g, '<br/>') + '</p>'; }).join('');
  }

  function appendMessage(role, text) {
    var row = document.createElement('div');
    row.className = 'rowan-msg-row ' + role;
    if (role === 'user') {
      var bubble = document.createElement('div');
      bubble.className = 'rowan-bubble-user';
      bubble.textContent = text;
      row.appendChild(bubble);
    } else {
      var bubble = document.createElement('div');
      bubble.className = 'rowan-bubble-assistant';
      bubble.innerHTML = formatAssistantMarkdown(text);
      row.appendChild(bubble);
    }
    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTypingIndicator() {
    var typing = document.createElement('div');
    typing.id = 'rowanTypingIndicator';
    typing.className = 'rowan-msg-row assistant';
    typing.innerHTML = '<div class="rowan-typing"><div class="rowan-dot"></div><div class="rowan-dot"></div><div class="rowan-dot"></div></div>';
    messagesContainer.appendChild(typing);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function removeTypingIndicator() {
    var el = shadow.getElementById('rowanTypingIndicator');
    if (el) el.remove();
  }

  // Load website configuration
  fetch(apiBase + '/api/widget/config?siteId=' + encodeURIComponent(siteId))
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success && data.config) {
        websiteConfig = data.config;
        if (websiteConfig.name) {
          botNameEl.textContent = 'Rowan \\u2022 ' + websiteConfig.name;
        }
        var welcome = websiteConfig.welcomeMessage || "Hi! I'm Rowan. How can I help you today?";
        appendMessage('assistant', welcome);
      } else {
        appendMessage('assistant', "Hi! I'm Rowan, your website assistant. How can I help you today?");
      }
    })
    .catch(function(err) {
      console.warn('[Rowan Widget] Failed to fetch config:', err);
      appendMessage('assistant', "Hi! I'm Rowan. How can I help you today?");
    });

  // Handle Form Submit
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var query = input.value.trim();
    if (!query || isSending) return;

    appendMessage('user', query);
    input.value = '';
    isSending = true;
    sendBtn.disabled = true;
    showTypingIndicator();

    fetch(apiBase + '/api/widget/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteId: siteId,
        message: query,
        sessionId: sessionId,
        pageUrl: window.location.href
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      removeTypingIndicator();
      isSending = false;
      sendBtn.disabled = false;
      if (data.success && data.message) {
        appendMessage('assistant', data.message);
      } else {
        appendMessage('assistant', data.message || "I'm having trouble connecting right now. Please try again in a moment.");
      }
    })
    .catch(function(err) {
      console.error('[Rowan Widget] Chat error:', err);
      removeTypingIndicator();
      isSending = false;
      sendBtn.disabled = false;
      appendMessage('assistant', "I'm having trouble connecting right now. Please try again in a moment.");
    });
  });

})();
`
  return res.send(widgetScript)
})

/**
 * GET /api/widget/config
 * Public endpoint to retrieve widget display configuration for a site.
 */
router.get('/config', async (req, res) => {
  const siteId = req.query.siteId as string
  if (!siteId) {
    return res.status(400).json({ success: false, message: 'Missing siteId parameter.' })
  }

  try {
    const website = await getWebsiteBySiteId(siteId)
    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website connection not found for this siteId.'
      })
    }

    // Return safe public config ONLY (never return credentials or internal org IDs)
    return res.json({
      success: true,
      config: {
        siteId: website.id,
        name: website.name,
        domain: website.domain,
        welcomeMessage: website.welcomeMessage,
        personality: website.personality,
        language: website.language,
        status: website.status
      }
    })
  } catch (err: unknown) {
    console.error('[WIDGET CONFIG ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to retrieve widget config.' })
  }
})

const widgetChatSchema = z.object({
  siteId: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
  sessionId: z.string().min(1).max(256).optional(),
  pageUrl: z.string().optional()
}).strict()

/**
 * POST /api/widget/chat
 * Handles visitor chats on external connected websites with strict grounding and isolation.
 */
router.post('/chat', widgetRateLimit, async (req, res) => {
  const parsed = widgetChatSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid chat request body.' })
  }

  const { siteId, message, sessionId: rawSessionId, pageUrl } = parsed.data
  const sessionId = rawSessionId || `widget_${siteId}_${Date.now()}`

  try {
    const website = await getWebsiteBySiteId(siteId)
    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'This website is not registered with Rowan AI.'
      })
    }

    if (website.status === 'disconnected') {
      return res.json({
        success: true,
        message: 'This Rowan AI assistant has been temporarily paused by the website owner.'
      })
    }

    // Retrieve relevant knowledge chunks for this website
    const relevantKnowledge = await searchWebsiteKnowledge(siteId, message, 4)
    const knowledgeSnippets = relevantKnowledge.map(k => `[Title: ${k.title}]\n${k.content}`).join('\n\n---\n\n')

    // Build context object
    const customInstructions = website.instructions?.trim()
      ? website.instructions
      : 'Help visitors understand our content and assist them with their inquiries.'

    let systemContextPrompt = `You are Rowan, the AI assistant for ${website.name} (${website.domain}).\n`
    systemContextPrompt += `Operating Role & Goal: ${customInstructions}\n`
    if (website.personality) {
      systemContextPrompt += `Tone & Personality: ${website.personality}\n`
    }
    if (website.thingsToKnow && website.thingsToKnow.trim()) {
      systemContextPrompt += `Important Facts & Policies to Know:\n${website.thingsToKnow.trim()}\n`
    }
    if (website.thingsNotToSay && website.thingsNotToSay.trim()) {
      systemContextPrompt += `Strict Boundaries & Things NOT to Say:\n${website.thingsNotToSay.trim()}\n`
    }
    if (knowledgeSnippets) {
      systemContextPrompt += `\nIndexed Website Knowledge:\n${knowledgeSnippets}\n`
    }
    if (pageUrl) {
      systemContextPrompt += `\nVisitor is currently viewing page: ${pageUrl}\n`
    }

    systemContextPrompt += `\nGROUNDING RULES:
1. Always remain Rowan, the AI assistant for ${website.name}.
2. Answer the visitor's question clearly, concisely, and accurately based on the website knowledge and owner instructions above.
3. If the visitor asks about something specific to ${website.name} (e.g. specific custom pricing, unlisted policies, internal contact details) that is not in the provided knowledge or context, politely say: "I couldn't find that information on this website." Do NOT fabricate facts, pricing, or guarantees.
4. If the visitor asks a general question (e.g. explaining a concept or general research), provide a helpful, concise answer.`

    const orchestratorContext = {
      sessionId,
      history: [],
      connection: {
        connectionType: 'website' as const,
        connectionName: website.name,
        connectionUrl: website.url,
        instructions: systemContextPrompt,
        role: `AI Assistant for ${website.name}`,
        personality: website.personality
      },
      metadata: {
        storeId: siteId,
        organizationId: website.organizationId
      }
    }

    const result = await orchestrator.orchestrate(message, sessionId, orchestratorContext)
    const responseText = result.text?.trim() || "I'm here to help! How can I assist you with this website?"

    // Record message into tenant database under isolated organization
    await appendConversationMessage(sessionId, website.organizationId, 'user', message, [])
    await appendConversationMessage(sessionId, website.organizationId, 'assistant', responseText, [])

    return res.json({
      success: true,
      message: responseText,
      sessionId
    })
  } catch (err: unknown) {
    console.error('[WIDGET CHAT ERROR]:', err)
    return res.status(500).json({
      success: false,
      message: 'Rowan is momentarily unavailable. Please try again in a few seconds.'
    })
  }
})

export default router
