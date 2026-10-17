# Nexus IA V0

Premier prototype de l'interface Nexus IA, construit en HTML, CSS et JavaScript natifs.

## Fonctionnalités
- Interface responsive pour mobile et ordinateur.
- Conversation interactive côté navigateur.
- Suggestions de démarrage et bouton nouvelle conversation.
- **Mode démo uniquement** : les réponses sont locales et prédéfinies. Aucun modèle d'IA n'est connecté pour le moment.

## Déploiement Vercel
Importe ce dépôt GitHub dans Vercel. Comme il s'agit d'un site statique sans étape de compilation, sélectionne le framework « Other » si Vercel ne le détecte pas automatiquement et laisse le répertoire racine à la valeur par défaut.

Une fois l'intégration Git activée, les nouveaux commits sur la branche principale peuvent déclencher un déploiement automatique.

## Prochaine étape
Connecter un modèle de langage via une route serveur sécurisée. Ne jamais exposer une clé API dans le code client.