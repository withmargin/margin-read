# Margin Read

[![CI](https://github.com/withmargin/margin-read/actions/workflows/ci.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/ci.yml)
[![Release](https://github.com/withmargin/margin-read/actions/workflows/release.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/release.yml)
[![CodeQL](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/withmargin/margin-read)](https://github.com/withmargin/margin-read/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/clgdnabgpfiffmfdboefecbhggbepjde?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/clgdnabgpfiffmfdboefecbhggbepjde)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Langues : [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Deutsch](README.de.md)

Margin Read est une extension de navigateur axée sur la confidentialité, conçue pour la traduction bilingue de pages web.

Une traduction web bilingue qui place la confidentialité au premier plan et conserve le texte original en place, afin que vous ne perdiez jamais le contexte.

Margin conserve le texte original de la page web en place et insère le texte traduit sous les blocs source correspondants, ce qui permet aux lecteurs de comparer les deux versions sans perdre le contexte de la page.

Dépôt : https://github.com/withmargin/margin-read

## État

Margin est un MVP à un stade précoce pour Chrome et les navigateurs Chromium, utilisant Manifest V3.

L'extension est utilisable pour les pages d'articles classiques, les pages anciennes riches en texte et certaines pages dynamiques, mais elle reste en développement actif. Attendez-vous à des imperfections sur les applications web très interactives, les pages dotées de systèmes de mise en page inhabituels et les sites qui réécrivent agressivement leur DOM.

## Fonctionnalités

- Traduire la page web actuelle depuis le popup de l'extension.
- Conserver le texte original et insérer les traductions sous les blocs source correspondants.
- Détecter les blocs de texte lisibles tels que les paragraphes, les titres, les éléments de liste et les citations.
- Gérer les pages anciennes basées sur `table`, `font` et les séparations par `br`.
- Éviter les zones courantes non destinées à la lecture, telles que la navigation, les formulaires, les boutons, les blocs de code, le texte masqué et l'interface de la page.
- Utiliser les endpoints de provider et les API keys configurés par l'utilisateur.
- Prendre en charge OpenAI, Anthropic Claude, Google Gemini et les adaptateurs de provider compatibles.
- Prendre en charge les runtimes locaux compatibles OpenAI tels que LM Studio, Ollama, le serveur llama.cpp et omlx (Apple Silicon), ainsi que les endpoints compatibles avec l'API Anthropic Messages.
- Récupérer les listes de modèles du provider depuis la page d'options.
- Choisir un style d'affichage de traduction intégré ou surligné.
- Afficher un bouton flottant sur la page (activé par défaut) qui ne démarre la traduction qu'après un clic de l'utilisateur. Le bouton peut être déplacé verticalement le long du bord de l'écran, mémorise sa position, adapte son apparence au fond clair ou sombre de la page, et peut être désactivé via sa commande de fermeture (×) ou depuis la page d'options.
- Utiliser par défaut une mise en cache des traductions limitée à la session, avec des options de cache persistant ou désactivé.
- Afficher des diagnostics dans le popup pour la détection de texte, l'état de la file d'attente et les erreurs du provider.
- Observer le contenu inséré dynamiquement.
- Optimiser les cartes de timeline X et les pages d'articles longs en ciblant le contenu lisible et en évitant les noms de profil, les compteurs d'actions, les médias et les contrôles.

Margin n'inclut pas la traduction de PDF, la traduction d'EPUB, la traduction de sous-titres, l'OCR, la traduction de champs de saisie, la synchronisation cloud, les comptes, les fonctionnalités sociales, la télémétrie par défaut, ni de système officiel de quota de traduction payant.

## Tests Bêta

Les bêta-testeurs peuvent installer Margin depuis la fiche bêta du Chrome Web Store
lorsqu'ils y sont invités, depuis un ZIP de GitHub Release, ou depuis une compilation
locale du code source. Consultez le [Guide de tests bêta](docs/BETA_TESTING.md) pour
le déroulé complet de l'installation et du retour d'expérience.

## Installer Depuis Le Code Source

Pour le développement local, chargez Margin en tant qu'extension non empaquetée :

```sh
corepack enable
pnpm install
pnpm build
```

Ensuite :

1. Ouvrez `chrome://extensions`.
2. Activez le mode développeur.
3. Sélectionnez Charger l'extension non empaquetée.
4. Choisissez le répertoire `apps/extension/dist/` généré.
5. Ouvrez les options de Margin.
6. Configurez un provider, une API key, un modèle, une langue cible et le comportement du cache.
7. Ouvrez une page web et cliquez sur Traduire cette page depuis le popup de Margin.

## Configuration Du Provider

Aucune API key n'est fournie avec Margin. Les utilisateurs fournissent leur propre API key brute du provider, sans préfixe `Bearer`.

Les providers intégrés utilisent des endpoints par défaut :

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Le champ d'endpoint n'est affiché que pour les configurations compatibles / LLM locales, où l'utilisateur est censé choisir ou saisir un endpoint local.

L'action Récupérer les modèles lit les modèles disponibles auprès du provider sélectionné :

- OpenAI : `GET /v1/models`
- Anthropic Claude : `GET /v1/models`
- Google Gemini : `GET /v1beta/models`
- OpenAI Compatible / Anthropic Compatible : `GET /v1/models`

Les modèles récupérés apparaissent dans le sélecteur de modèles. Margin conserve le modèle actuellement configuré comme option lorsqu'un modèle par défaut du provider ou un modèle précédemment enregistré n'est pas renvoyé par la liste du provider.

## Confidentialité

Margin n'envoie que les segments de texte sélectionnés au provider configuré. Il n'envoie pas le HTML complet de la page par défaut, ne nécessite pas de connexion, n'utilise pas de synchronisation cloud et n'inclut pas de télémétrie par défaut.

Les requêtes vers le provider sont effectuées par le service worker de l'extension en utilisant l'endpoint et l'API key configurés par l'utilisateur. La confidentialité du provider dépend de l'endpoint et du fournisseur de modèle que vous choisissez.

Les API keys sont stockées dans le stockage de l'extension du navigateur. Considérez le profil de navigateur comme faisant partie de votre environnement de confiance.

## Optimisation X

Margin inclut un détecteur optionnel propre à X pour les cartes de timeline et les pages d'articles longs. Lorsqu'il est activé, il cible le contenu `tweetText` à l'intérieur des articles de tweet et les blocs lisibles à l'intérieur des vues d'article X, au lieu d'analyser chaque nœud de texte visible.

Les publications citées sont désactivées par défaut et peuvent être activées depuis les options. Les publications que X marque déjà comme traduites sont ignorées par défaut afin d'éviter les traductions en double.

## LLM Locaux

Margin prend en charge les runtimes de LLM locaux via des providers compatibles :

- OpenAI Compatible utilise l'API `/v1/chat/completions` de type OpenAI.
- Anthropic Compatible utilise l'API `/v1/messages` de type Anthropic Messages avec une sortie structurée via l'outil `input_schema`. Il s'agit d'une option de protocole filaire pour les endpoints locaux ou de passerelle compatibles, et non d'un service distinct hébergé par Anthropic.

Les deux providers compatibles autorisent une API key vide et utilisent une concurrence de traduction par défaut plus faible pour l'inférence locale. Si une passerelle compatible Anthropic requiert une clé, Margin l'envoie sous la forme `Authorization: Bearer ...`.

Endpoints compatibles courants :

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
omlx: http://localhost:8000/v1/chat/completions
Generic Anthropic-compatible: http://localhost:8000/v1/messages
Ollama Anthropic compatibility: http://localhost:11434/v1/messages
```

Pour utiliser un runtime local :

1. Démarrez le serveur de modèle local.
2. Ouvrez les options de Margin.
3. Sélectionnez OpenAI Compatible pour `/v1/chat/completions`, ou Anthropic Compatible pour `/v1/messages`.
4. Sélectionnez un préréglage d'endpoint compatible OpenAI, ou saisissez l'URL de l'endpoint affichée par votre runtime.
5. Laissez l'API key vide, sauf si votre passerelle locale en requiert une.
6. Cliquez sur Récupérer les modèles et choisissez un modèle servi dans le sélecteur de modèles.
7. Pour OpenAI Compatible, conservez le mode JSON de requête activé lorsqu'il est pris en charge. Désactivez-le si le runtime local rejette le champ de requête `response_format`.

Notes sur les runtimes :

- LM Studio sert généralement les requêtes compatibles OpenAI à l'adresse `http://localhost:1234/v1/chat/completions`.
- Ollama nécessite que son API compatible OpenAI soit disponible à l'adresse `http://localhost:11434/v1/chat/completions`.
- Ollama peut également exposer des requêtes compatibles Anthropic à l'adresse `http://localhost:11434/v1/messages`. Margin envoie des outils pour la sortie structurée mais ne force pas `tool_choice` pour les endpoints compatibles Anthropic, car certains runtimes compatibles acceptent les outils sans prendre en charge la sélection forcée d'outil.
- Le serveur llama.cpp doit être démarré avec un serveur HTTP compatible OpenAI activé, généralement à l'adresse `http://localhost:8080/v1/chat/completions`.
- omlx est un serveur d'inférence MLX pour Apple Silicon. Démarrez-le avec `omlx serve` (sans configuration, modèles depuis `~/.omlx/models`) ou `omlx serve --model-dir /path/to/models` ; l'API compatible OpenAI devient disponible à l'adresse `http://localhost:8000/v1/chat/completions`.
- Si Récupérer les modèles échoue, vérifiez que le serveur local est en cours d'exécution, que l'URL de l'endpoint se termine par `/v1/chat/completions` ou `/v1/messages`, et que le runtime expose un endpoint `/v1/models` compatible.

La qualité, la vitesse, la longueur de contexte et la fiabilité du JSON des modèles locaux dépendent du modèle et du runtime. Les modèles à instruction dotés de solides capacités multilingues sont recommandés pour la traduction.

## Développement Local

Installez les dépendances :

```sh
corepack enable
pnpm install
```

Lancez le serveur de développement avec rechargement à chaud (Vite + CRXJS). Chargez `apps/extension/dist/`
en tant qu'extension non empaquetée une seule fois, puis modifiez le code source : l'extension se recharge
automatiquement :

```sh
pnpm --filter @margin/extension dev
```

Lancez les vérifications de types :

```sh
pnpm check
```

Lancez le lint :

```sh
pnpm lint
```

Lancez les vérifications du manifest de l'extension et de sécurité :

```sh
pnpm check:extension
```

Lancez les tests avec couverture :

```sh
pnpm test
```

Compilez l'extension :

```sh
pnpm build
```

La compilation utilise Vite avec le plugin CRXJS (Rolldown en arrière-plan) et écrit l'extension non empaquetée dans `apps/extension/dist/`.

## Structure Du Projet

```text
apps/extension/src/background/     Service worker, requêtes provider, paramètres et flux de cache
apps/extension/src/content/        Détection du texte de la page, mise en file et insertion des traductions
apps/extension/src/options/        Page d'options de l'extension
apps/extension/src/popup/          Interface du popup et diagnostics
apps/extension/src/background/providers/      Adaptateurs de provider
apps/extension/src/shared/         Types partagés, valeurs par défaut, stockage et messages
apps/extension/public/             Ressources statiques (icônes) copiées telles quelles dans la compilation
apps/extension/*.html              Points d'entrée HTML du popup et des options
apps/extension/scripts/            Scripts de compilation et de validation de l'extension
docs/                              Produit, feuille de route, principes et modèle de menaces
```

## Dépannage

Activez le mode Debug dans les options de Margin lorsqu'une page semble activée mais qu'aucune traduction n'est insérée. Le popup affichera le nombre de détections de la page actuelle, les blocs en file d'attente, les requêtes en cours, les traductions en attente, les traductions terminées, le nombre d'erreurs, la dernière erreur et un échantillon de bloc de texte détecté.

Utilisez ces valeurs pour distinguer les principaux modes de défaillance :

- `Detected blocks: 0` signifie que le content script n'a trouvé aucun texte lisible sur la page.
- Un nombre de détections positif sans aucune requête en cours indique généralement que la file d'attente de traduction nécessite une attention.
- Des blocs en erreur ou une dernière erreur pointent généralement vers des problèmes de configuration du provider, d'authentification, de modèle, d'endpoint ou de format de réponse.

## Limitations Connues

- Firefox n'est pas encore la cible principale.
- La gestion du DOM propre à certains sites se limite à quelques cas à forte valeur.
- Les applications web très dynamiques peuvent déplacer ou supprimer les blocs de traduction.
- Les grandes pages sont traduites par lots, de sorte que les traductions peuvent apparaître progressivement.
- Les limites de débit du provider, la disponibilité des modèles et la qualité des sorties dépendent du provider configuré.

## Documentation

- [Exigences produit](docs/PRD.md)
- [Principes du projet](docs/PRINCIPLES.md)
- [Modèle de menaces](docs/THREAT_MODEL.md)
- [Feuille de route](docs/ROADMAP.md)
- [Guide de tests bêta](docs/BETA_TESTING.md)
- [Checklist de release](docs/RELEASE_CHECKLIST.md)

## Licence

MIT
