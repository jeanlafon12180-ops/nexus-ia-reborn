const composer = document.querySelector("#composer");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector(".send-button");
const welcome = document.querySelector("#welcome");
const messageList = document.querySelector("#message-list");
const conversation = document.querySelector("#conversation");
const sidebar = document.querySelector("#sidebar");
const STORAGE_KEY = "nexus-ia-v002-messages";
const LEGACY_STORAGE_KEY = "nexus-ia-v001-messages";
let messages = [];
let waiting = false;

function saveMessages() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn("Impossible de sauvegarder la conversation sur cet appareil.", error);
  }
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
  const paragraph = document.createElement("p");
  paragraph.textContent = message.content;
  body.append(author, paragraph);
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

async function sendMessage(value) {
  const text = (value === undefined ? input.value : value).trim();
  if (!text || waiting) return;
  waiting = true;
  addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;
  showTyping();
  conversation.scrollTop = conversation.scrollHeight;

  try {
    const history = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-12)
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
  const blob = new Blob(["Nexus IA V0.0.2 — Historique de conversation\n\n" + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nexus-ia-conversation.txt";
  link.click();
  URL.revokeObjectURL(url);
}

try {
  const current = localStorage.getItem(STORAGE_KEY);
  const stored = JSON.parse(current || localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
  if (Array.isArray(stored)) {
    messages = stored.filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string");
  }
  if (!current && messages.length) saveMessages();
} catch {
  messages = [];
}
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
document.querySelector("#new-chat").addEventListener("click", resetChat);
document.querySelector("#reset-chat").addEventListener("click", resetChat);
document.querySelector("#assistant-tab").addEventListener("click", () => {
  sidebar.classList.remove("sidebar-open");
  renderAll();
});
document.querySelector("#brand-home").addEventListener("click", (event) => {
  event.preventDefault();
  sidebar.classList.remove("sidebar-open");
  renderAll();
});
document.querySelector("#mobile-menu").addEventListener("click", () => {
  sidebar.classList.toggle("sidebar-open");
});
document.querySelector("#conversation").addEventListener("click", (event) => {
  if (window.innerWidth <= 700 && !sidebar.contains(event.target)) sidebar.classList.remove("sidebar-open");
});
document.querySelector("#export-chat").addEventListener("click", exportConversation);
