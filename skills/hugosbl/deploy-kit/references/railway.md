# Railway CLI — Référence

## Installation

```bash
npm i -g @railway/cli
# ou
brew install railway
# ou
curl -fsSL https://railway.app/install.sh | sh
```

## Authentification

```bash
railway login                   # Login interactif (navigateur)
railway login --browserless     # Login avec code (sans navigateur)
railway whoami                  # Vérifier le compte
railway logout                  # Déconnexion
```

## Initialisation

```bash
railway init                    # Créer un nouveau projet Railway
railway link                    # Lier le dossier à un projet existant
railway status                  # Voir le projet/environnement actuel
```

## Déploiement

```bash
railway up                      # Déployer le dossier courant
railway up --detach             # Déployer sans suivre les logs
railway up -d ./path            # Déployer un dossier spécifique
```

Railway détecte automatiquement :

- **Node.js** : via `package.json`
- **Python** : via `requirements.txt` / `Pipfile` / `pyproject.toml`
- **Go** : via `go.mod`
- **Rust** : via `Cargo.toml`
- **Docker** : via `Dockerfile`
- **Static** : fichiers HTML/CSS/JS

### Nixpacks

Railway utilise [Nixpacks](https://nixpacks.com) pour builder automatiquement. Pas besoin de Dockerfile dans la plupart des cas.

## Variables d'environnement

```bash
railway variables                           # Lister les variables
railway variables set KEY=VALUE             # Définir une variable
railway variables set KEY1=V1 KEY2=V2       # Plusieurs à la fois
railway variables delete KEY                # Supprimer
```

Les variables sont injectées automatiquement au runtime.

## Bases de données

```bash
railway add                     # Menu interactif pour ajouter un service
```

Services disponibles :

- **PostgreSQL** — `railway add -d postgres`
- **MySQL** — `railway add -d mysql`
- **Redis** — `railway add -d redis`
- **MongoDB** — `railway add -d mongo`

Les variables de connexion sont auto-injectées :

- `DATABASE_URL` (Postgres/MySQL)
- `REDIS_URL`
- `MONGO_URL`

## Domaines

```bash
railway domain                  # Générer un domaine *.railway.app
```

Pour un domaine custom :

1. Aller dans le dashboard Railway → Settings → Domains
2. Ajouter le domaine custom
3. Configurer le DNS (CNAME vers le domaine railway fourni)

## Logs et monitoring

```bash
railway logs                    # Voir les logs
railway logs --follow           # Logs en temps réel
railway logs --lines 100        # Dernières 100 lignes
```

## Gestion de projet

```bash
railway list                    # Lister les projets
railway status                  # Projet et environnement courant
railway environment             # Changer d'environnement
railway open                    # Ouvrir le dashboard dans le navigateur
```

## Procfile

Pour spécifier la commande de démarrage (optionnel) :

```
# Procfile
web: node server.js
```

Ou dans `railway.toml` :

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/health"
restartPolicyType = "on_failure"
```

## Environnements

Railway supporte plusieurs environnements (staging, production) :

```bash
railway environment             # Switcher d'environnement (interactif)
railway environment production  # Switcher vers production
```

## Tips

- Railway facture à l'usage : CPU, RAM, bandwidth, storage
- Free tier : $5/mois de crédits gratuits
- `railway run <command>` exécute une commande avec les variables d'env Railway
- Les déploiements sont atomiques (zero downtime)
- Supporte le scaling horizontal via le dashboard
- Private networking entre services du même projet
