const composer = document.querySelector("#composer");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector(".send-button");
const welcome = document.querySelector("#welcome");
const messageList = document.querySelector("#message-list");
const conversation = document.querySelector("#conversation");
const sidebar = document.querySelector("#sidebar");

function demoAnswer(text) {
  const q = text.toLowerCase();
  if (q.includes("bonjour") || q.includes("salut") || q.includes("hello")) {
    return "Salut ! 👋 Bienvenue dans Nexus IA V0. Je suis le prototype de ton assistant. Pour le moment, l'interface fonctionne, mais aucun modèle d'IA n'est encore connecté.\n\nOn pourra ensuite brancher un modèle de langage pour produire de vraies réponses.";
  }
  if (q.includes("html") || q.includes("code") || q.includes("program")) {
    return "Très bien, on peut préparer ça ensemble. 💻\n\nÉtape 1 : précise le résultat que tu veux obtenir.\nÉtape 2 : on choisira les technologies adaptées.\nÉtape 3 : on écrira le code et on le testera.\n\nPrototype V0 : cette réponse est un exemple local, pas une génération par un modèle d'IA.";
  }
  if (q.includes("intelligence artificielle") || q.includes("ia")) {
    return "L'intelligence artificielle regroupe des techniques qui permettent à un système informatique d'effectuer des tâches comme analyser du texte, reconnaître des images ou générer du contenu.\n\nUn assistant conversationnel avancé s'appuie généralement sur un modèle de langage. Nexus IA n'est pas encore relié à un tel modèle : cette V0 sert à valider l'interface et le parcours de discussion.";
  }
  return "J'ai bien reçu ton message !\n\nNexus IA V0 est actuellement un prototype d'interface : l'envoi et l'affichage des messages fonctionnent, mais le moteur d'intelligence artificielle n'est pas encore connecté.\n\nProchaine étape : choisir et intégrer un modèle de langage, puis tester ses réponses. Je ne veux pas te faire croire que cette réponse a été générée par une IA alors que ce n'est pas encore le cas. 🚀";
}

function addMessage(role, content) {
  const row = document.createElement("article");
  row.className = "message-row " + role;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar " + role;
  avatar.textContent = role === "assistant" ? "n" : "toi";
  const body = document.createElement("div");
  body.className = "message-body";
  const author = document.createElement("div");
  author.className = "message-author";
  author.textContent = role === "assistant" ? "Nexus IA" : "Vous";
  if (role === "assistant") {
    const tag = document.createElement("span");
    tag.className = "demo-tag";
    tag.textContent = "MODE DÉMO";
    author.appendChild(tag);
  }
  const paragraph = document.createElement("p");
  paragraph.textContent = content;
  body.append(author, paragraph);
  row.append(avatar, body);
  messageList.appendChild(row);
}

function sendMessage(value) {
  const text = (value === undefined ? input.value : value).trim();
  if (!text) return;
  welcome.hidden = true;
  messageList.hidden = false;
  conversation.classList.add("has-messages");
  addMessage("user", text);
  addMessage("assistant", demoAnswer(text));
  input.value = "";
  sendButton.disabled = true;
  input.style.height = "auto";
  conversation.scrollTop = conversation.scrollHeight;
  input.focus();
}

function resetChat() {
  messageList.replaceChildren();
  messageList.hidden = true;
  welcome.hidden = false;
  conversation.classList.remove("has-messages");
  input.value = "";
  sendButton.disabled = true;
  sidebar.classList.remove("sidebar-open");
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});
input.addEventListener("input", () => {
  sendButton.disabled = !input.value.trim();
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 130) + "px";
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
document.querySelector("#assistant-tab").addEventListener("click", resetChat);
document.querySelector("#brand-home").addEventListener("click", (event) => {
  event.preventDefault();
  resetChat();
});
document.querySelector("#mobile-menu").addEventListener("click", () => {
  sidebar.classList.toggle("sidebar-open");
});
document.querySelector("#conversation").addEventListener("click", (event) => {
  if (window.innerWidth <= 700 && !sidebar.contains(event.target)) sidebar.classList.remove("sidebar-open");
});