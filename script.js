const composer = document.querySelector("#composer");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector(".send-button");
const welcome = document.querySelector("#welcome");
const messageList = document.querySelector("#message-list");
const conversation = document.querySelector("#conversation");
const sidebar = document.querySelector("#sidebar");
const STORAGE_KEY = "nexus-ia-v010-chats";
const CURRENT_VERSION = "Nexus IA V0.1.1";
// Read all previous storage formats; never delete old keys during migration.
const OLD_STORAGE_KEYS = ["nexus-ia-v009-chats", "nexus-ia-v008-chats", "nexus-ia-v007-chats", "nexus-ia-v005-messages", "nexus-ia-v003-messages", "nexus-ia-v004-messages", "nexus-ia-v002-messages", "nexus-ia-v001-messages"];
const historySearch = document.querySelector("#history-search");
const importInput = document.querySelector("#import-history");
let chats = [];
let currentChatId = null;
const historyList = document.querySelector("#conversation-history");
let messages = [];
let waiting = false;

function saveMessages() {
  try {
    const current = chats.find((chat) => chat.id === currentChatId);
    if (current) { current.messages = messages; current.updatedAt = new Date().toISOString();
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser) current.title = lastUser.content.slice(0, 42); }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
    renderConversationHistory();
  } catch (error) { console.warn("Impossible de sauvegarder l’historique.", error); }
}
function renderConversationHistory() {
  if (!historyList) return;
  historyList.replaceChildren();
  const query = (historySearch?.value || "").trim().toLocaleLowerCase("fr");
  chats.slice().reverse().filter((chat) => !query || String(chat.title || "").toLocaleLowerCase("fr").includes(query) || (chat.messages || []).some((m) => String(m.content || "").toLocaleLowerCase("fr").includes(query))).forEach((chat) => {
    const button = document.createElement("button"); button.type = "button";
    button.className = "history-item" + (chat.id === currentChatId ? " active" : "");
    button.textContent = chat.title || "Nouvelle conversation";
    button.addEventListener("click", () => { if (waiting) return; currentChatId = chat.id; messages = chat.messages || []; saveMessages(); renderAll(); setMobileMenu(false); });
    historyList.appendChild(button);
  });
}
function createConversation() {
  if (waiting) return;
  const chat = { id: "chat-" + Date.now(), title: "Nouvelle conversation", messages: [], updatedAt: new Date().toISOString() };
  chats.push(chat); currentChatId = chat.id; messages = []; saveMessages(); renderAll();
  input.value = ""; sendButton.disabled = true; input.style.height = "auto"; setMobileMenu(false);
}


function renderInline(parent, text) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\`[^\`]+\`|\\\\\([^)]*\\\\\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    const token = match[0];
    let node;
    if (token.startsWith("**")) { node = document.createElement("strong"); node.textContent = token.slice(2, -2); }
    else if (token.startsWith("*")) { node = document.createElement("em"); node.textContent = token.slice(1, -1); }
    else if (token.startsWith("`")) { node = document.createElement("code"); node.textContent = token.slice(1, -1); }
    else { node = document.createElement("span"); node.className = "math-inline"; node.textContent = token.slice(2, -2); }
    parent.appendChild(node);
    last = match.index + token.length;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
}

function renderMarkdown(container, source) {
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  let paragraph = [], list = null, codeLines = null, codeLanguage = "";
  const flushParagraph = () => { if (!paragraph.length) return; const p = document.createElement("p"); renderInline(p, paragraph.join(" ")); container.appendChild(p); paragraph = []; };
  const flushList = () => { if (list) { container.appendChild(list); list = null; } };
  const flushCode = () => { const pre = document.createElement("pre"); const code = document.createElement("code"); if (codeLanguage) code.className = "language-" + codeLanguage; code.textContent = codeLines.join("\n"); const copyCode = document.createElement("button"); copyCode.type = "button"; copyCode.className = "code-copy-button"; copyCode.textContent = "Copier le code"; copyCode.addEventListener("click", async () => { try { await navigator.clipboard.writeText(code.textContent); copyCode.textContent = "Copié ✓"; } catch { copyCode.textContent = "Copie indisponible"; } window.setTimeout(() => { copyCode.textContent = "Copier le code"; }, 1600); }); pre.append(copyCode, code); container.appendChild(pre); codeLines = null; codeLanguage = ""; };
  for (const line of lines) {
    const fence = line.match(/^`{3,}([\w+-]*)\s*$/);
    if (codeLines !== null) { if (fence) { flushCode(); continue; } codeLines.push(line); continue; }
    if (fence) { flushParagraph(); flushList(); codeLines = []; codeLanguage = fence[1] || ""; continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    if (heading) { flushParagraph(); flushList(); const h = document.createElement("h" + Math.min(heading[1].length + 1, 4)); renderInline(h, heading[2]); container.appendChild(h); continue; }
    if (bullet || numbered) { flushParagraph(); const tag = numbered ? "ol" : "ul"; if (!list || list.tagName.toLowerCase() !== tag) { flushList(); list = document.createElement(tag); } const li = document.createElement("li"); renderInline(li, (bullet || numbered)[1]); list.appendChild(li); continue; }
    if (/^>\s?/.test(line)) { flushParagraph(); flushList(); const quote = document.createElement("blockquote"); renderInline(quote, line.replace(/^>\s?/, "")); container.appendChild(quote); continue; }
    flushList(); paragraph.push(line);
  }
  if (codeLines !== null) flushCode(); flushParagraph(); flushList();
}

function renderMessage(message) {
  const row = document.createElement("article");
  row.className = "message-row " + message.role;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar " + message.role;
  avatar.textContent = message.role === "assistant" ? "n" : "toi";
  const body = document.createElement("div");
  body.className = "message-body";
  const author = document.createElement("div");
  author.className = "message-author";
  const authorName = document.createElement("span");
  authorName.textContent = message.role === "assistant" ? "Nexus IA" : "Vous";
  author.appendChild(authorName);
  if (message.role === "assistant") {
    const tag = document.createElement("span");
    tag.className = "demo-tag";
    tag.textContent = message.mode === "error" ? "INFO" : (message.mode === "legacy" ? "ANCIEN MESSAGE" : "IA");
    author.appendChild(tag);
  }
  const content = document.createElement("div");
  content.className = "message-content";
  if (message.role === "assistant" && message.mode !== "error") renderMarkdown(content, message.content);
  else content.textContent = message.content;
  body.append(author, content);
  if (message.role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copy = document.createElement("button");
    copy.className = "copy-button";
    copy.type = "button";
    copy.textContent = "Copier la réponse";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        copy.textContent = "Copié ✓";
      } catch {
        copy.textContent = "Copie indisponible";
      }
      window.setTimeout(() => { copy.textContent = "Copier la réponse"; }, 1600);
    });
    actions.appendChild(copy);
    if (message.mode === "ai" && messages[messages.length - 1] === message) {
      const regenerate = document.createElement("button");
      regenerate.className = "copy-button";
      regenerate.type = "button";
      regenerate.textContent = "Régénérer";
      regenerate.addEventListener("click", () => regenerateLastAnswer());
      actions.appendChild(regenerate);
    }
    if (message.mode === "error") {
      const retry = document.createElement("button");
      retry.className = "copy-button";
      retry.type = "button";
      retry.textContent = "Réessayer";
      retry.addEventListener("click", () => {
        if (waiting) return;
        const errorIndex = messages.indexOf(message);
        let userIndex = errorIndex - 1;
        while (userIndex >= 0 && messages[userIndex].role !== "user") userIndex--;
        if (userIndex < 0) return;
        const prompt = messages[userIndex].content;
        messages = messages.slice(0, errorIndex);
        saveMessages();
        renderAll();
        sendMessage(prompt, { reuseLastUser: true });
      });
      actions.appendChild(retry);
    }
    body.appendChild(actions);
  }
  row.append(avatar, body);
  messageList.appendChild(row);
}

function renderAll() {
  messageList.replaceChildren();
  messages.forEach((message) => {
    if (message.role === "assistant" && !message.mode) message.mode = "legacy";
    renderMessage(message);
  });
  const hasMessages = messages.length > 0;
  welcome.hidden = hasMessages;
  messageList.hidden = !hasMessages;
  conversation.classList.toggle("has-messages", hasMessages);
  conversation.scrollTop = conversation.scrollHeight;
}

function addMessage(role, content, mode = "ai") {
  const message = { role, content, mode, createdAt: new Date().toISOString() };
  messages.push(message);
  renderMessage(message);
  saveMessages();
  welcome.hidden = true;
  messageList.hidden = false;
  conversation.classList.add("has-messages");
  return message;
}

function showTyping() {
  const row = document.createElement("article");
  row.className = "message-row assistant typing-row";
  row.id = "typing-indicator";
  row.innerHTML = '<div class="message-avatar assistant">n</div><div class="message-body"><div class="message-author">Nexus IA <span class="demo-tag">RÉFLEXION</span></div><p class="typing-dots" aria-label="Préparation de la réponse"><span></span><span></span><span></span></p></div>';
  messageList.appendChild(row);
  conversation.scrollTop = conversation.scrollHeight;
}

async function regenerateLastAnswer() {
  if (waiting) return;
  const lastAssistantIndex = [...messages].map((m) => m.role).lastIndexOf("assistant");
  if (lastAssistantIndex < 0) return;
  let userIndex = lastAssistantIndex - 1;
  while (userIndex >= 0 && messages[userIndex].role !== "user") userIndex--;
  if (userIndex < 0) return;
  const prompt = messages[userIndex].content;
  messages = messages.slice(0, lastAssistantIndex);
  saveMessages();
  renderAll();
  await sendMessage(prompt, { reuseLastUser: true });
}

async function sendMessage(value, options = {}) {
  const text = (value === undefined ? input.value : value).trim();
  if (!text || waiting) return;
  waiting = true;
  if (!options.reuseLastUser) addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;
  showTyping();
  conversation.scrollTop = conversation.scrollHeight;

  try {
    const history = messages
      .filter((message) => (message.role === "user" || message.role === "assistant") && message.mode !== "error")
      .slice(-16)
      .map(({ role, content }) => ({ role, content }));
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });
    const data = await response.json().catch(() => ({}));
    document.querySelector("#typing-indicator")?.remove();
    if (!response.ok) {
      addMessage("assistant", data.error || "Le service IA est momentanément indisponible. Réessaie dans un instant.", "error");
    } else {
      addMessage("assistant", data.answer, "ai");
    }
  } catch (error) {
    document.querySelector("#typing-indicator")?.remove();
    addMessage("assistant", "Je n'arrive pas à joindre le serveur Nexus IA. Vérifie ta connexion puis réessaie. Si le problème continue, regarde l'état du déploiement Vercel.", "error");
  } finally {
    waiting = false;
    sendButton.disabled = !input.value.trim();
    conversation.scrollTop = conversation.scrollHeight;
    input.focus();
  }
}

function resetChat() {
  if (messages.length && !window.confirm("Commencer une nouvelle conversation ? L'historique actuel sera effacé de cet appareil.")) return;
  messages = [];
  saveMessages();
  renderAll();
  input.value = "";
  sendButton.disabled = true;
  input.style.height = "auto";
  sidebar.classList.remove("sidebar-open");
}

function exportConversation() {
  if (!messages.length) {
    window.alert("Il n'y a pas encore de conversation à exporter.");
    return;
  }
  const content = messages.map((message) => (message.role === "user" ? "Vous" : "Nexus IA") + ":\n" + message.content).join("\n\n---\n\n");
  const blob = new Blob([CURRENT_VERSION + " — Historique de conversation\n\n" + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nexus-ia-conversation.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function exportAllHistory() {
  const backup = { app: "Nexus IA", version: CURRENT_VERSION, exportedAt: new Date().toISOString(), chats, currentChatId };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nexus-ia-sauvegarde.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importAllHistory(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const incoming = Array.isArray(backup) ? backup : backup.chats;
    if (!Array.isArray(incoming) || !incoming.every((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.messages))) {
      throw new Error("Format invalide");
    }
    const usedIds = new Set(chats.map((chat) => chat.id));
    const importStamp = Date.now();
    const imported = incoming.map((chat, index) => {
      const originalId = chat.id;
      let safeId = originalId;
      if (usedIds.has(safeId)) safeId = "import-" + importStamp + "-" + index + "-" + originalId;
      while (usedIds.has(safeId)) safeId = "import-" + importStamp + "-" + index + "-" + Math.random().toString(36).slice(2, 8);
      usedIds.add(safeId);
      return {
        ...chat,
        id: safeId,
        title: String(chat.title || "Conversation importée").slice(0, 100),
        messages: chat.messages.filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content, ...(typeof m.mode === "string" ? { mode: m.mode } : {}), ...(typeof m.createdAt === "string" ? { createdAt: m.createdAt } : {}) }))
      };
    });
    if (!imported.length) throw new Error("Aucune conversation");
    if (!window.confirm("Importer " + imported.length + " conversation(s) sans effacer l’historique actuel ?")) return;
    chats = [...chats, ...imported];
    currentChatId = imported[imported.length - 1].id;
    messages = chats.find((chat) => chat.id === currentChatId).messages;
    saveMessages();
    renderAll();
    window.alert("Import terminé : " + imported.length + " conversation(s) ajoutée(s).");
  } catch {
    window.alert("Impossible d’importer ce fichier. Choisis une sauvegarde JSON Nexus IA valide.");
  } finally {
    if (importInput) importInput.value = "";
  }
}

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { const saved = JSON.parse(raw); if (Array.isArray(saved.chats)) { chats = saved.chats; currentChatId = saved.currentChatId; } }
  if (!chats.length) {
    let legacyChats = null;
    let legacyMessages = null;
    for (const key of OLD_STORAGE_KEYS) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(data) && data.length) { legacyMessages = data; break; }
        if (data && Array.isArray(data.chats) && data.chats.length) { legacyChats = data.chats; currentChatId = data.currentChatId; break; }
      } catch {}
    }
    if (legacyChats) {
      chats = legacyChats.filter((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.messages));
    } else {
      const legacy = legacyMessages || [];
      chats = [{ id: "chat-migrated-" + Date.now(), title: (legacy.find((m) => m.role === "user") || {}).content?.slice(0, 42) || "Conversation précédente", messages: legacy, updatedAt: new Date().toISOString() }];
      currentChatId = chats[0].id;
    }
  }
  const active = chats.find((chat) => chat.id === currentChatId) || chats[0];
  currentChatId = active.id;
  messages = Array.isArray(active.messages) ? active.messages : [];
  // Keep every old storage key intact; the new format is an additional copy.
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
} catch {
  chats = [{ id: "chat-" + Date.now(), title: "Nouvelle conversation", messages: [], updatedAt: new Date().toISOString() }];
  currentChatId = chats[0].id;
  messages = [];
}
renderConversationHistory();
renderAll();

async function refreshAIStatus() {
  const label = document.querySelector(".online-label");
  const dot = document.querySelector(".online-dot");
  try {
    const response = await fetch("/api/chat", { method: "GET" });
    const data = await response.json();
    if (data.configured) {
      label.textContent = "IA configurée";
      dot.style.background = "#74d9b6";
      dot.title = "Le serveur indique que le moteur IA est configuré.";
    } else {
      label.textContent = "IA à configurer";
      dot.style.background = "#e6b86b";
      dot.title = "Ajoute GROQ_API_KEY dans les variables d’environnement Vercel pour activer les réponses IA.";
    }
  } catch {
    label.textContent = "Serveur indisponible";
    dot.style.background = "#e68181";
  }
}
refreshAIStatus();

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});
input.addEventListener("input", () => {
  sendButton.disabled = !input.value.trim() || waiting;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
document.querySelector("#new-chat").addEventListener("click", createConversation);
document.querySelector("#reset-chat").addEventListener("click", createConversation);
document.querySelector("#assistant-tab").addEventListener("click", () => {
  sidebar.classList.remove("sidebar-open");
  renderAll();
});
document.querySelector("#brand-home").addEventListener("click", (event) => {
  event.preventDefault();
  sidebar.classList.remove("sidebar-open");
  renderAll();
});
const mobileMenu = document.querySelector("#mobile-menu");
function setMobileMenu(open) {
  sidebar.classList.toggle("sidebar-open", open);
  mobileMenu.setAttribute("aria-expanded", String(open));
  mobileMenu.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
}
mobileMenu.addEventListener("click", () => {
  setMobileMenu(!sidebar.classList.contains("sidebar-open"));
});
document.querySelector("#conversation").addEventListener("click", (event) => {
  if (window.innerWidth <= 700 && !sidebar.contains(event.target)) setMobileMenu(false);
});
document.querySelector("#export-chat").addEventListener("click", exportConversation);
document.querySelector("#export-all-history")?.addEventListener("click", exportAllHistory);
document.querySelector("#import-history-button")?.addEventListener("click", () => importInput?.click());
importInput?.addEventListener("change", () => importAllHistory(importInput.files?.[0]));
historySearch?.addEventListener("input", renderConversationHistory);
