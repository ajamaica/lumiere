# Guide de configuration des API keys

## 🌤️ Météo (Open-Meteo)

**Aucune configuration nécessaire !** L'API Open-Meteo est gratuite et sans inscription.

```bash
python3 meteo.py Paris  # fonctionne directement
```

---

## 🚄 SNCF (Navitia)

### Inscription

1. Aller sur https://navitia.io
2. Créer un compte gratuit
3. Récupérer le token dans le dashboard

### Limites

- 5 000 requêtes/mois (gratuit)
- Suffisant pour un usage personnel

### Configuration

```bash
export SNCF_API_KEY="ton-token-navitia"
```

### Test

```bash
python3 sncf.py search Paris Lyon
```

---

## 📦 La Poste (Suivi de colis)

### Inscription

1. Aller sur https://developer.laposte.fr
2. Créer un compte
3. S'abonner au produit "Suivi v2" (gratuit)
4. Récupérer la clé API (X-Okapi-Key)

### Configuration

```bash
export LAPOSTE_API_KEY="ta-clé-okapi"
```

### Test

```bash
python3 laposte.py track 6A12345678901
```

---

## 🚇 IDFM / RATP (Transports IDF)

### Inscription

1. Aller sur https://prim.iledefrance-mobilites.fr
2. Créer un compte
3. S'abonner aux APIs :
   - "Prochains passages" (Navitia)
   - "Info trafic temps réel" (General Message SIRI)
4. Récupérer la clé API

### Configuration

```bash
export IDFM_API_KEY="ta-clé-prim"
```

### Test

```bash
python3 ratp.py traffic
python3 ratp.py next "Châtelet"
```

---

## Configuration permanente

Pour éviter de re-exporter les variables à chaque session, ajouter dans `~/.zshrc` ou `~/.bashrc` :

```bash
# French Services API Keys
export SNCF_API_KEY="ton-token-navitia"
export LAPOSTE_API_KEY="ta-clé-okapi"
export IDFM_API_KEY="ta-clé-prim"
```

Puis recharger :

```bash
source ~/.zshrc
```

## Clawdbot / OpenBot

Pour que Clawdbot puisse utiliser les scripts, les variables doivent être dans l'environnement du processus Clawdbot.
Ajouter les clés dans le fichier `.env` à la racine du workspace si supporté, ou dans le shell profile.
