# Guide : Ajouter un extracteur de prix

## Architecture

Chaque site supporté a une fonction `_extract_<site>(html)` dans `monitor.py` qui :

- Reçoit le HTML brut de la page
- Retourne `(price: float, source: str)` ou `(None, None)`
- `source` identifie la méthode d'extraction (pour debug)

Les extracteurs sont enregistrés dans le dict `EXTRACTORS`:

```python
EXTRACTORS = {
    "amazon": _extract_amazon,
    "fnac": _extract_fnac,
    # ...
}
```

## Ajouter un nouveau site

### 1. Détection du site

Dans `_detect_site(url)`, ajouter la détection du hostname :

```python
if "monsite" in host:
    return "monsite"
```

### 2. Créer l'extracteur

```python
def _extract_monsite(html):
    """MonSite.fr price extractor."""
    # Méthode 1 : sélecteur spécifique au site
    m = re.search(r'class="prix-produit"[^>]*>([^<]+)<', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "class-prix-produit"

    # Méthode 2 : meta tag ou itemprop
    m = re.search(r'itemprop="price"\s+content="([^"]+)"', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "itemprop-price"

    return None, None
```

### 3. Enregistrer

```python
EXTRACTORS["monsite"] = _extract_monsite
```

## Tips pour trouver les patterns

1. **Inspecter la page** avec les DevTools du navigateur
2. **Chercher le prix** dans le HTML source (Ctrl+U)
3. **Patterns courants** à chercher :
   - `itemprop="price"` (schema.org — très fiable)
   - `<meta property="og:price:amount">` (Open Graph)
   - `<script type="application/ld+json">` (JSON-LD — le plus fiable)
   - Classes CSS contenant "price", "prix", "cost", "amount"
4. **Attention** : certains sites chargent le prix en JS (pas dans le HTML initial)
   - `urllib` ne fait que le HTML statique
   - Si le prix est injecté en JS, l'extracteur ne le trouvera pas
   - Solution : chercher dans les données JSON-LD ou les meta tags (souvent présents quand même)

## Bonnes pratiques

- Toujours passer par `_parse_price()` pour normaliser (gère `,` vs `.`, espaces, etc.)
- Prévoir 2-3 patterns par site (les sites changent leur HTML)
- Le fallback vers `_extract_generic()` se fait automatiquement
- Tester avec `curl -s <url> | grep -i price` pour repérer les patterns
- Nommer la `source` de façon descriptive pour le debug

## Extracteur générique

Si le site n'a pas d'extracteur spécifique, `_extract_generic()` essaie dans l'ordre :

1. `og:price:amount` (Open Graph meta)
2. JSON-LD schema.org (le plus fiable cross-site)
3. `itemprop="price"` (microdata)
4. `product:price:amount` (Facebook meta)
5. Regex `(\d+[.,]\d+)\s*€` avec heuristique de fréquence

Pour la plupart des sites bien structurés, le générique suffit grâce aux standards schema.org.
