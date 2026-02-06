# Price Monitor

Surveille les prix de produits sur des sites e-commerce et alerte quand ils baissent.

## Usage

```bash
python skills/price-monitor/scripts/monitor.py <command> [options]
```

## Commands

| Commande                                       | Description                        |
| ---------------------------------------------- | ---------------------------------- |
| `add <url> [--name "Nom"] [--target-price 50]` | Ajouter un produit à surveiller    |
| `list`                                         | Lister les produits surveillés     |
| `check [--all] [id]`                           | Vérifier les prix (un ou tous)     |
| `remove <id>`                                  | Supprimer un produit               |
| `history <id>`                                 | Historique des prix d'un produit   |
| `alerts`                                       | Voir les alertes de baisse de prix |

## Options globales

- `--json` — Output JSON au lieu du texte formaté

## Sites supportés

- **Amazon.fr** — `a-offscreen`, `data-a-color="price"`
- **Fnac.com** — meta tags, `f-priceBox-price`
- **Cdiscount** — `c-product__price`, itemprop
- **Boulanger** — `class="price"`, itemprop
- **Générique** — og:price → JSON-LD → itemprop → regex €

## Extracteur générique (ordre de priorité)

1. `<meta property="og:price:amount">`
2. JSON-LD schema.org (`"price":"XX.XX"`)
3. `itemprop="price"`
4. Regex fallback sur patterns `XX,XX €`

## Alertes

- **Prix cible atteint** : prix actuel ≤ target-price → 🎯
- **Baisse > 5%** par rapport au dernier check → 🔥
- Format : `Amazon PS5 : 449€ → 399€ (-11%) 🔥`

## Stockage

- `~/.price-monitor/products.json` — Liste des produits
- `~/.price-monitor/history/<id>.json` — Historique par produit
- `~/.price-monitor/alerts.json` — Alertes enregistrées

## Exemples

```bash
# Ajouter un produit
python monitor.py add "https://www.amazon.fr/dp/B0BN..." --name "PS5" --target-price 400

# Vérifier tous les prix
python monitor.py check --all

# Historique
python monitor.py history abc12345

# Alertes en JSON
python monitor.py --json alerts
```

## Technique

- Python stdlib uniquement (urllib, json, re)
- User-Agent Chrome réaliste
- Timeout 10s par requête
- Voir `references/extractors.md` pour ajouter des sites
