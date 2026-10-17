const composer = document.querySelector("#composer");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector(".send-button");
const welcome = document.querySelector("#welcome");
const messageList = document.querySelector("#message-list");
const conversation = document.querySelector("#conversation");
const sidebar = document.querySelector("#sidebar");
const STORAGE_KEY = "nexus-ia-v001-messages";
let messages = [];
let waiting = false;

function demoAnswer(text) {
  const q = text.toLowerCase();
  if (/\b(bonjour|salut|hello|coucou)\b/.test(q)) {
    return "Salut ! 👋 Bienvenue dans Nexus IA V0.0.1.\n\nJe peux déjà tester le parcours de discussion, mais je reste en mode démo : aucun modèle d'intelligence artificielle n'est connecté pour le moment.";
  }
  if (q.includes("html") || q.includes("code") || q.includes("program")) {
    return "On peut organiser ton projet en étapes. 💻\n\n1. Définir le résultat attendu.\n2. Choisir les technologies adaptées.\n3. Écrire le code.\n4. Tester et corriger.\n\nCette réponse est prédéfinie : le vrai moteur IA reste à connecter.";
  }
  if (q.includes("intelligence artificielle") || q.includes(" ia ") || q === "ia") {
    return "L'intelligence artificielle regroupe des méthodes permettant à un ordinateur d'effectuer des tâches comme analyser du texte, reconnaître des images ou générer du contenu.\n\nNexus IA n'est pas encore relié à un modèle de langage. Cette version sert à améliorer l'interface et la gestion des conversations.";
  }
  if (q.includes("merci")) {
    return "Avec plaisir ! 😊 On construit Nexus IA progressivement. Petit rappel : cette réponse vient du mode démo, pas d'un modèle IA connecté.";
  }
  if (q.includes("qui es-tu") || q.includes("qui es tu") || q.includes("ton nom")) {
    return "Je suis l'interface prototype de Nexus IA, version 0.0.1. Mon objectif est de devenir un assistant utile, mais mon moteur IA n'est pas encore branché.";
  }
  return "Message reçu !\n\nLa version 0.0.1 améliore l'expérience de conversation et peut conserver l'historique sur cet appareil. En revanche, mes réponses restent des exemples prédéfinis : un véritable modèle IA devra être connecté dans une prochaine version. 🚀";
}

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
    tag.textContent = "MODE DÉMO";
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
  messages.forEach(renderMessage);
  const hasMessages = messages.length > 0;
  welcome.hidden = hasMessages;
  messageList.hidden = !hasMessages;
  conversation.classList.toggle("has-messages", hasMessages);
  conversation.scrollTop = conversation.scrollHeight;
}

function addMessage(role, content) {
  const message = { role, content, createdAt: new Date().toISOString() };
  messages.push(message);
  renderMessage(message);
  saveMessages();
  welcome.hidden = true;
  messageList.hidden = false;
  conversation.classList.add("has-messages");
}

function showTyping() {
  const row = document.createElement("article");
  row.className = "message-row assistant typing-row";
  row.id = "typing-indicator";
  row.innerHTML = '<div class="message-avatar assistant">n</div><div class="message-body"><div class="message-author">Nexus IA <span class="demo-tag">MODE DÉMO</span></div><p class="typing-dots" aria-label="Préparation de la réponse"><span></span><span></span><span></span></p></div>';
  messageList.appendChild(row);
  conversation.scrollTop = conversation.scrollHeight;
}

function sendMessage(value) {
  const text = (value === undefined ? input.value : value).trim();
  if (!text || waiting) return;
  waiting = true;
  addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;
  showTyping();
  window.setTimeout(() => {
    document.querySelector("#typing-indicator")?.remove();
    addMessage("assistant", demoAnswer(text));
    waiting = false;
    sendButton.disabled = !input.value.trim();
    conversation.scrollTop = conversation.scrollHeight;
    input.focus();
  }, 450);
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
  const content = messages.map((message) => (message.role === "user" ? "Vous" : "Nexus IA (mode démo)") + ":\n" + message.content).join("\n\n---\n\n");
  const blob = new Blob(["Nexus IA V0.0.1 — Historique de conversation\n\n" + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nexus-ia-conversation.txt";
  link.click();
  URL.revokeObjectURL(url);
}

try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (Array.isArray(stored)) {
    messages = stored.filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string");
  }
} catch {
  messages = [];
}
renderAll();

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
