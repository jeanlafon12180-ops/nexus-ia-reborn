export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: "Le moteur IA n'est pas encore configuré. Ajoute GROQ_API_KEY dans les variables d'environnement du projet Vercel."
    });
  }

  const body = req.body || {};
  if (!Array.isArray(body.messages)) {
    return res.status(400).json({ error: "Format de conversation invalide." });
  }

  const messages = body.messages
    .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }))
    .filter((m) => m.content.length > 0);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Envoie d'abord un message." });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: "Tu es Nexus IA, un assistant utile, honnête et pédagogique. Réponds en français sauf si l'utilisateur demande une autre langue. Explique clairement, structure les réponses et adapte le niveau à la question. Pour le code, donne des exemples sûrs et explique où les placer. N'invente pas de faits et signale tes incertitudes. Tu n'as pas accès au Web en direct sauf si un outil te le permet, ce qui n'est pas le cas ici. Ne prétends pas avoir exécuté du code ni vérifié un site."
          },
          ...messages
        ],
        temperature: 0.6,
        max_completion_tokens: 1200
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Groq API error:", response.status, data?.error?.message || "unknown");
      return res.status(502).json({
        error: response.status === 429
          ? "La limite temporaire du service IA est atteinte. Réessaie un peu plus tard."
          : "Le service IA a rencontré une erreur. Vérifie la configuration et réessaie."
      });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: "Le modèle n'a pas renvoyé de réponse exploitable." });
    }
    return res.status(200).json({ answer: answer.trim(), model: data.model || process.env.GROQ_MODEL || "openai/gpt-oss-20b" });
  } catch (error) {
    console.error("Nexus IA request failed:", error?.message || error);
    return res.status(502).json({ error: "Impossible de joindre le service IA pour le moment." });
  }
}