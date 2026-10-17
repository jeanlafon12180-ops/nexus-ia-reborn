export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      configured: Boolean(process.env.GROQ_API_KEY),
      provider: "Groq",
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b"
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      code: "AI_NOT_CONFIGURED",
      error: "Le moteur IA n'est pas configuré. Vérifie GROQ_API_KEY dans les variables d'environnement de Vercel, puis redéploie."
    });
  }

  const body = req.body || {};
  if (!Array.isArray(body.messages)) {
    return res.status(400).json({ code: "INVALID_MESSAGES", error: "Format de conversation invalide." });
  }

  const messages = body.messages
    .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }))
    .filter((m) => m.content.length > 0);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ code: "EMPTY_MESSAGE", error: "Écris un message avant de l'envoyer." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": "Bearer " + apiKey,
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
      const providerMessage = String(data?.error?.message || "").toLowerCase();
      console.error("Groq API error:", response.status, data?.error?.message || "unknown");

      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          code: "GROQ_AUTH_ERROR",
          error: "Groq a refusé l'authentification. Vérifie que GROQ_API_KEY est correcte et active dans Vercel."
        });
      }
      if (response.status === 429) {
        return res.status(429).json({
          code: "GROQ_RATE_LIMIT",
          error: "La limite gratuite de Groq est atteinte temporairement. Attends un peu avant de réessayer."
        });
      }
      if (providerMessage.includes("model") && (providerMessage.includes("decommission") || providerMessage.includes("not found") || providerMessage.includes("does not exist"))) {
        return res.status(502).json({
          code: "GROQ_MODEL_ERROR",
          error: "Le modèle Groq configuré n'est pas disponible. Vérifie la variable GROQ_MODEL dans Vercel."
        });
      }
      return res.status(502).json({
        code: "GROQ_PROVIDER_ERROR",
        error: "Groq n'a pas pu traiter la demande. Réessaie dans un instant."
      });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({
        code: "EMPTY_AI_RESPONSE",
        error: "Le modèle n'a pas renvoyé de réponse exploitable. Réessaie avec une autre formulation."
      });
    }

    return res.status(200).json({
      answer: answer.trim(),
      provider: "Groq",
      model: data.model || process.env.GROQ_MODEL || "openai/gpt-oss-20b"
    });
  } catch (error) {
    console.error("Nexus IA request failed:", error?.message || error);
    if (error?.name === "AbortError") {
      return res.status(504).json({
        code: "GROQ_TIMEOUT",
        error: "Groq met trop de temps à répondre. Réessaie dans un instant."
      });
    }
    return res.status(502).json({
      code: "GROQ_CONNECTION_ERROR",
      error: "Impossible de joindre Groq pour le moment. Vérifie ta connexion et réessaie."
    });
  } finally {
    clearTimeout(timeout);
  }
}