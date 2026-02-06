# Deploy Kit — Skill de Déploiement Web

Simplifie le déploiement d'apps web sur **Vercel**, **Railway** et **Supabase** via leurs CLIs.

## Quand utiliser ce skill

L'utilisateur demande de déployer une app, créer une base de données, configurer un hébergement, ou gérer des variables d'environnement sur ces plateformes.

## Workflow principal

### 1. Détecter le projet

```bash
python3 skills/deploy-kit/scripts/deploy.py detect <chemin>
```

Retourne : framework, langage, fichiers clés trouvés.

### 2. Vérifier les CLIs disponibles

```bash
python3 skills/deploy-kit/scripts/deploy.py check
```

Si un CLI manque, guide l'installation (voir références).

### 3. Recommander une plateforme

```bash
python3 skills/deploy-kit/scripts/deploy.py recommend <chemin>
```

| Type de projet                                            | Plateforme recommandée     |
| --------------------------------------------------------- | -------------------------- |
| Frontend statique / SSR (Next, Astro, Vite, Svelte, Nuxt) | **Vercel**                 |
| Backend / API (Express, Flask, FastAPI, Django)           | **Railway**                |
| App full-stack avec BDD                                   | **Railway** + **Supabase** |
| BDD / Auth / Storage / Edge Functions                     | **Supabase**               |

### 4. Déployer

```bash
python3 skills/deploy-kit/scripts/deploy.py deploy <chemin> --platform <vercel|railway|supabase>
```

⚠️ **TOUJOURS demander confirmation avant de déployer.** Le script demande aussi une confirmation interactive.

## Détection de projet — Règles

| Fichier trouvé                    | Framework détecté |
| --------------------------------- | ----------------- |
| `next.config.*`                   | Next.js           |
| `astro.config.*`                  | Astro             |
| `vite.config.*`                   | Vite              |
| `svelte.config.*`                 | SvelteKit         |
| `nuxt.config.*`                   | Nuxt              |
| `remix.config.*` / `app/root.tsx` | Remix             |
| `angular.json`                    | Angular           |
| `requirements.txt` / `Pipfile`    | Python            |
| `manage.py`                       | Django            |
| `package.json` → scripts.start    | Node.js app       |
| `Dockerfile`                      | Docker (Railway)  |
| `supabase/config.toml`            | Supabase project  |

## Variables d'environnement

- **Vercel** : `vercel env add NOM_VAR` ou via dashboard
- **Railway** : `railway variables set NOM=VALEUR`
- **Supabase** : secrets via `supabase secrets set NOM=VALEUR`

Toujours vérifier `.env` / `.env.local` pour les vars existantes avant déploiement.

## Domaines custom

- **Vercel** : `vercel domains add mondomaine.com`
- **Railway** : `railway domain` (génère un sous-domaine), custom via dashboard

## Références détaillées

Charger à la demande selon la plateforme :

- `skills/deploy-kit/references/vercel.md` — Vercel CLI complet
- `skills/deploy-kit/references/railway.md` — Railway CLI complet
- `skills/deploy-kit/references/supabase.md` — Supabase CLI complet

## Commandes rapides

| Action                | Commande                             |
| --------------------- | ------------------------------------ |
| Deploy preview Vercel | `vercel`                             |
| Deploy prod Vercel    | `vercel --prod`                      |
| Deploy Railway        | `railway up`                         |
| Push DB Supabase      | `supabase db push`                   |
| Deploy edge function  | `supabase functions deploy <nom>`    |
| Voir les logs         | `vercel logs <url>` / `railway logs` |
| Lister les projets    | `vercel ls` / `railway list`         |

## Règles pour l'agent

1. **Ne jamais déployer sans confirmation explicite** de l'utilisateur
2. Toujours détecter le projet avant de recommander
3. Vérifier que le CLI est installé et authentifié
4. Charger la référence détaillée de la plateforme si besoin de commandes avancées
5. Proposer un déploiement preview avant production
6. Mentionner les coûts potentiels si projet hors free tier
