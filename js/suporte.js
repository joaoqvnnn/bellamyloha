/* ============================================================
   SUPORTE — chat com IA STREAMLY
   O SYSTEM_PROMPT vive no BACKEND. O frontend NUNCA o envia.
   ============================================================ */

const MOCK_MODE = false;
window.STREAMLY_API_BASE =
  window.STREAMLY_API_BASE || 'https://streamly-backend.onrender.com/api';

/* ---------- Estado ---------- */
const conversationHistory = []; // [{ role, content }]
let isSending = false;
let transferred = false;

/* ---------- DOM (ajuste os IDs se necessário) ---------- */
const chatLog         = document.getElementById('chat-log');
const chatForm        = document.getElementById('chat-form');
const chatInput       = document.getElementById('chat-input');
const sendBtn         = document.getElementById('chat-send');
const typingIndicator = document.getElementById('typing');
const transferBanner  = document.getElementById('transfer-banner');

/* ---------- UI helpers ---------- */
function addMessage(role, content) {
  const el = document.createElement('div');
  el.className = `msg msg-${role}`;
  el.textContent = content;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function setTyping(on) {
  if (typingIndicator) typingIndicator.hidden = !on;
  if (on) chatLog.scrollTop = chatLog.scrollHeight;
}

function setSending(on) {
  isSending = on;
  if (sendBtn) sendBtn.disabled = on;
  if (chatInput) chatInput.disabled = on;
}

function showTransferBanner() {
  transferred = true;
  if (transferBanner) transferBanner.hidden = false;
}

/* ---------- Chamada real ao backend ---------- */
async function callSupportAPI(userMessage) {
  if (MOCK_MODE) {
    await new Promise(r => setTimeout(r, 600));
    return {
      reply: 'Modo de teste ativo (MOCK_MODE). Backend real desligado.',
      transfer: false,
    };
  }

  const res = await fetch(`${window.STREAMLY_API_BASE}/suporte/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message: userMessage,
      history: conversationHistory.slice(-20), // janela curta p/ economizar tokens
      context: { origin: 'web', page: location.pathname },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${txt.slice(0, 140)}`);
  }

  const data = await res.json();
  const raw = data.reply ?? data.content ?? data.message ?? '';

  // Backend sinaliza transferência com o marcador [TRANSFER]
  const transfer = typeof raw === 'string' && raw.startsWith('[TRANSFER]');
  const reply = transfer ? raw.replace('[TRANSFER]', '').trim() : raw;

  return { reply, transfer };
}

/* ---------- Envio ---------- */
async function handleSend(e) {
  if (e) e.preventDefault();
  if (isSending || transferred) return;

  const text = (chatInput?.value || '').trim();
  if (!text) return;

  addMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });
  chatInput.value = '';

  setSending(true);
  setTyping(true);

  try {
    const { reply, transfer } = await callSupportAPI(text);
    setTyping(false);
    addMessage('assistant', reply);
    conversationHistory.push({ role: 'assistant', content: reply });
    if (transfer) showTransferBanner();
  } catch (err) {
    setTyping(false);
    console.error('[suporte] erro:', err);
    addMessage(
      'assistant',
      'Tive um problema para responder agora. Tente novamente em instantes ou fale com um atendente humano.'
    );
  } finally {
    setSending(false);
    chatInput?.focus();
  }
}

/* ---------- Bind ---------- */
if (chatForm) chatForm.addEventListener('submit', handleSend);
if (chatInput) {
  chatInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      handleSend();
    }
  });
}

/* ---------- Mensagem inicial ---------- */
if (chatLog && chatLog.children.length === 0) {
  addMessage(
    'assistant',
    'Olá, Carlos! Sou a assistente da STREAMLY. Posso ajudar com compras, pagamentos, assinaturas ou acesso à sua conta. O que você precisa?'
  );
}
