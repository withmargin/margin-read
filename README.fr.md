# Margin Read

Langues : [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Deutsch](README.de.md)

Margin Read est une extension de navigateur de traduction bilingue de pages web, concue avec la confidentialite comme priorite.

Margin conserve le texte original dans la page et insere la traduction sous les blocs sources correspondants, afin de comparer les deux versions sans perdre le contexte.

Repository: https://github.com/withmargin/margin-read

## Statut

Margin est un MVP precoce pour Chrome et les navigateurs Chromium, base sur Manifest V3.

L'extension est utilisable sur les pages d'articles classiques, les anciennes pages riches en texte et certaines pages dynamiques. Elle reste toutefois en developpement actif. Des aspérités peuvent subsister sur les Web apps tres interactives, les mises en page inhabituelles ou les sites qui reecrivent fortement le DOM.

## Fonctionnalites

- Traduire la page courante depuis le popup de l'extension.
- Conserver le texte original et inserer les traductions sous les blocs sources correspondants.
- Detecter les blocs lisibles comme les paragraphes, titres, listes et citations.
- Gerer les pages anciennes avec `table`, `font` et du texte separe par `br`.
- Eviter les zones non destinees a la lecture : navigation, formulaires, boutons, blocs de code, texte masque et interface de page.
- Utiliser les endpoints provider et API keys configures par l'utilisateur.
- Prendre en charge les adapters OpenAI, Anthropic Claude et Google Gemini.
- Prendre en charge les runtimes locaux OpenAI-compatible comme LM Studio, Ollama et llama.cpp server.
- Recuperer les listes de modeles depuis la page d'options.
- Choisir un affichage de traduction integre ou mis en evidence.
- Afficher optionnellement un bouton flottant dans la page qui ne lance la traduction qu'apres un clic utilisateur.
- Choisir un cache persistant, de session ou desactive.
- Afficher dans le popup les diagnostics de detection de texte, d'etat de file et d'erreurs provider.
- Observer le contenu insere dynamiquement.
- Optimiser les cartes de timeline X et les pages longform article en ciblant le contenu lisible et en evitant les noms de profil, compteurs, medias et controles.

Margin n'inclut pas la traduction PDF, EPUB, sous-titres, OCR, traduction de champs de saisie, synchronisation cloud, comptes, fonctions sociales, telemetry par defaut ni systeme officiel de quota de traduction payant.

## Installer depuis le code source

Margin n'est pas encore publie dans une boutique d'extensions. Chargez-le comme extension non empaquetee :

```sh
corepack enable
pnpm install
pnpm build
```

Puis :

1. Ouvrez `chrome://extensions`.
2. Activez Developer mode.
3. Selectionnez Load unpacked.
4. Choisissez le repertoire `apps/extension/dist/` genere.
5. Ouvrez Margin options.
6. Configurez provider, API key, model, langue cible et comportement du cache.
7. Ouvrez une page web et cliquez sur Translate this page dans le popup Margin.

## Configuration du provider

Margin n'integre aucune API key. Vous devez fournir votre propre API key provider brute, sans prefixe `Bearer`.

Les providers integres utilisent des endpoints par defaut :

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Le champ Endpoint n'apparait que pour OpenAI Compatible / Local LLM, ou l'utilisateur doit choisir ou saisir un endpoint local.

Fetch models lit les modeles disponibles depuis le provider selectionne :

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

Les modeles recuperes apparaissent dans le selecteur de modeles. Margin conserve le modele actuellement configure comme option si le modele par defaut ou enregistre n'est pas renvoye par le provider.

## Confidentialite

Margin envoie uniquement les segments de texte selectionnes au provider configure. Par defaut, il n'envoie pas le HTML complet, ne demande pas de connexion, n'utilise pas de synchronisation cloud et n'inclut pas de telemetry.

Les requetes provider sont effectuees par le service worker de l'extension avec l'endpoint et l'API key configures par l'utilisateur. La confidentialite cote provider depend de l'endpoint et du modele choisis.

Les API keys sont stockees dans l'extension storage du navigateur. Considerez le profil du navigateur comme une partie de votre environnement de confiance.

## Optimisation X

Margin inclut un detecteur X optionnel pour les cartes de timeline et les pages longform article. Une fois active, il cible le contenu `tweetText` dans les tweet articles et les blocs lisibles de X article view au lieu de scanner tous les noeuds de texte visibles.

Les quoted posts sont desactives par defaut et peuvent etre actives dans options. Les posts que X marque deja comme traduits sont ignores par defaut pour eviter une retraduction.

## LLM locaux

Margin prend en charge les runtimes LLM locaux via le provider OpenAI Compatible. Ce provider utilise l'API style OpenAI `/v1/chat/completions`, accepte une API key vide et emploie une concurrence par defaut plus basse pour l'inference locale.

Endpoints courants :

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

Pour utiliser un runtime local :

1. Lancez le serveur local du modele.
2. Ouvrez Margin options.
3. Selectionnez OpenAI Compatible comme provider.
4. Selectionnez un preset d'endpoint ou saisissez l'URL indiquee par votre runtime.
5. Laissez API key vide sauf si votre gateway locale l'exige.
6. Cliquez sur Fetch models et choisissez un modele dans le selecteur.
7. Gardez Request JSON mode active si possible. Desactivez-le si le runtime local rejette le champ `response_format`.

## Developpement local

```sh
corepack enable
pnpm install
pnpm check
pnpm lint
pnpm check:extension
pnpm test
pnpm build
```

Le build utilise Rolldown et ecrit l'extension non empaquetee dans `apps/extension/dist/`.

## Structure du projet

```text
apps/extension/src/background/     Service worker, requetes provider, settings et cache flow
apps/extension/src/content/        Detection de texte, file et insertion de traductions
apps/extension/src/options/        Page d'options de l'extension
apps/extension/src/popup/          Popup UI et diagnostics
apps/extension/src/background/providers/      Provider adapters
apps/extension/src/shared/         Types, defaults, storage et messages partages
apps/extension/public/             UI statique de l'extension et content CSS
apps/extension/scripts/            Build et extension validation scripts
docs/                              Product, roadmap, principles et threat model
```

## Depannage

Activez Debug mode dans Margin options lorsqu'une page semble active mais qu'aucune traduction n'est inseree. Le popup affichera le nombre de blocs detectes, la file, les requetes en cours, pending translations, completed translations, le nombre d'erreurs, la derniere erreur et un exemple de texte detecte.

## Limites connues

- Firefox n'est pas encore la cible principale.
- Le Site-specific DOM handling est limite a quelques cas de forte valeur.
- Les Web apps tres dynamiques peuvent deplacer ou supprimer les blocs de traduction.
- Les grandes pages sont traduites par lots, donc les traductions peuvent apparaitre progressivement.
- Les rate limits provider, la disponibilite des modeles et la qualite de sortie dependent du provider configure.

## Documentation

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
