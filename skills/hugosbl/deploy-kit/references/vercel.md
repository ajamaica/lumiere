# Vercel CLI — Référence

## Installation

```bash
npm i -g vercel
```

## Authentification

```bash
vercel login                    # Login interactif (navigateur)
vercel login --token <token>    # Login avec token
vercel whoami                   # Vérifier le compte connecté
```

## Déploiement

```bash
vercel                          # Deploy preview (auto-detect framework)
vercel --prod                   # Deploy en production
vercel --yes                    # Skip les confirmations
vercel --force                  # Force un nouveau build
vercel deploy --prebuilt        # Deploy un build pré-existant
```

### Premier déploiement

Vercel détecte automatiquement le framework. Il suffit de lancer `vercel` dans le dossier du projet. Il demandera :

1. Le scope (team/personal)
2. Lier à un projet existant ou en créer un nouveau
3. Les settings de build (auto-détectés)

## Variables d'environnement

```bash
vercel env ls                           # Lister les variables
vercel env add NOM                      # Ajouter (interactif: valeur + environnements)
vercel env add NOM production           # Ajouter pour production uniquement
vercel env rm NOM                       # Supprimer
vercel env pull .env.local              # Télécharger les env vars en local
```

Environnements : `production`, `preview`, `development`

## Domaines

```bash
vercel domains ls                       # Lister les domaines
vercel domains add monsite.com          # Ajouter un domaine
vercel domains inspect monsite.com      # Infos DNS
vercel domains rm monsite.com           # Supprimer
```

Pour pointer un domaine custom :

1. `vercel domains add monsite.com`
2. Configurer le DNS (CNAME → `cname.vercel-dns.com` ou A → `76.76.21.21`)

## Gestion de projets

```bash
vercel ls                       # Lister les déploiements récents
vercel inspect <url>            # Détails d'un déploiement
vercel logs <url>               # Logs d'un déploiement
vercel logs <url> --follow      # Logs en temps réel
vercel rm <url>                 # Supprimer un déploiement
vercel rollback                 # Rollback au déploiement précédent
```

## Frameworks supportés

Auto-détection pour : Next.js, Astro, Vite, SvelteKit, Nuxt, Remix, Gatsby, Angular, Ember, Hugo, Jekyll, Eleventy, Hexo, Docusaurus, et plus.

## Fichier de config

`vercel.json` à la racine du projet :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "X-Frame-Options", "value": "DENY" }]
    }
  ]
}
```

## Serverless Functions

Fichiers dans `/api/` sont auto-déployés comme serverless functions :

```javascript
// api/hello.js
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello!' })
}
```

## Tips

- `vercel dev` lance un serveur de dev local qui simule l'environnement Vercel
- `vercel build` fait un build local sans déployer
- Projet monorepo : `vercel --cwd packages/web`
- Le free tier inclut : 100 GB bandwidth, 100 GB-hours serverless
