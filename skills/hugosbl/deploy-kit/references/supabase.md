# Supabase CLI — Référence

## Installation

```bash
npm i -g supabase
# ou
brew install supabase/tap/supabase
```

## Authentification

```bash
supabase login                          # Login (génère un token via navigateur)
supabase login --token <access-token>   # Login avec token
```

## Projet local

```bash
supabase init                   # Initialiser un projet Supabase local
supabase start                  # Démarrer les services locaux (Docker requis)
supabase stop                   # Arrêter les services locaux
supabase status                 # Voir les URLs et clés locales
```

`supabase start` lance : PostgreSQL, Auth, Storage, Realtime, Edge Functions, Studio (dashboard local).

## Lier à un projet distant

```bash
supabase link --project-ref <ref>       # Lier au projet distant
supabase link --project-ref abcdefgh    # Le ref est dans l'URL du dashboard
```

Le project ref se trouve dans : `https://supabase.com/dashboard/project/<ref>`

## Base de données

### Migrations

```bash
supabase migration new nom_migration    # Créer une migration vide
supabase db push                        # Appliquer les migrations au projet distant
supabase db pull                        # Tirer le schéma distant en migration locale
supabase db reset                       # Reset la DB locale et rejouer les migrations
supabase db diff                        # Voir les différences schema local vs distant
supabase db lint                        # Linter le schéma SQL
```

Les migrations sont dans `supabase/migrations/` (fichiers SQL horodatés).

### SQL direct

```bash
supabase db execute "SELECT * FROM users LIMIT 5"
```

### Seed

```bash
# Le fichier supabase/seed.sql est exécuté automatiquement après les migrations
supabase db reset    # Rejoue migrations + seed
```

## Génération de types

```bash
supabase gen types typescript --linked > types/supabase.ts
supabase gen types typescript --local > types/supabase.ts
```

Génère des types TypeScript à partir du schéma de la base de données. Très utile avec `@supabase/supabase-js`.

## Edge Functions

```bash
supabase functions new ma-fonction              # Créer une nouvelle function
supabase functions serve                        # Servir localement
supabase functions deploy ma-fonction           # Déployer une function
supabase functions deploy --no-verify-jwt       # Déployer sans vérification JWT
supabase functions delete ma-fonction           # Supprimer
```

Les functions sont dans `supabase/functions/` (Deno/TypeScript).

Exemple de function :

```typescript
// supabase/functions/hello/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { name } = await req.json()
  return new Response(JSON.stringify({ message: `Hello ${name}!` }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Secrets (variables d'env pour functions)

```bash
supabase secrets list                           # Lister les secrets
supabase secrets set NOM=VALEUR                 # Définir un secret
supabase secrets set NOM1=V1 NOM2=V2            # Plusieurs secrets
supabase secrets unset NOM                      # Supprimer
```

## Auth

Configuration dans `supabase/config.toml` :

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/callback"]

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
```

## Storage

```bash
# Géré principalement via le dashboard ou l'API
# Les buckets et policies se configurent via migrations SQL
```

## Inspection et debug

```bash
supabase inspect db size            # Taille de la base
supabase inspect db table-sizes     # Taille par table
supabase inspect db index-sizes     # Taille des index
supabase inspect db bloat           # Tables avec bloat
supabase inspect db locks           # Locks actifs
```

## Tips

- `supabase start` nécessite Docker
- Le dashboard local est sur `http://localhost:54323`
- Les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont fournies par `supabase status`
- Free tier : 2 projets, 500 MB DB, 1 GB storage, 2 GB bandwidth
- `supabase db push` ne fait que les migrations, pas de données
- Utiliser `supabase db pull` avant de commencer pour synchroniser le schéma
- Les edge functions supportent npm via `esm.sh` : `import lodash from "https://esm.sh/lodash"`
