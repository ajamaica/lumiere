# Freelance Toolkit

Boîte à outils pour freelances/indépendants en France : factures, time tracking, clients, dashboard.

## Scripts

Tous dans `scripts/`. Python 3 stdlib uniquement. Données dans `~/.freelance/`.

### config.py — Configuration prestataire

```bash
python3 config.py set --name "Hugo Dupont" --address "42 rue de la Paix, 75002 Paris" \
  --siret "98765432100010" --email "hugo@example.com" --phone "0600000000" \
  --iban "FR76 1234 5678 9012 3456 7890 123" --rate 80 --micro
python3 config.py show [--json]
```

Stockage : `~/.freelance/config.json`

### clients.py — Gestion clients

```bash
python3 clients.py add --name "Acme" --email "contact@acme.fr" --phone "0612345678" \
  --address "10 rue Example, 75001 Paris" --siret "12345678900010" --rate 80 --notes "Client fidèle"
python3 clients.py list [--json]
python3 clients.py show "Acme" [--json]
python3 clients.py edit "Acme" --rate 90 --notes "Nouveau taux"
python3 clients.py remove "Acme"
```

Stockage : `~/.freelance/clients.json`

### timetrack.py — Suivi du temps

```bash
python3 timetrack.py start "Site web Acme" [--client "Acme"]
python3 timetrack.py stop
python3 timetrack.py status [--json]
python3 timetrack.py log [--from 2026-01-01] [--to 2026-01-31] [--project "Site web"] [--json]
python3 timetrack.py report [--month 2026-01] [--json]
```

Stockage : `~/.freelance/timetrack.json`

### invoice.py — Génération de factures HTML

```bash
python3 invoice.py generate --client "Acme" --items "Dev site web:5:400" "Design logo:1:200" \
  [--number 2026-001] [--date 2026-02-15] [--due-days 30] [--no-open]
python3 invoice.py list [--json]
python3 invoice.py show 2026-001
python3 invoice.py paid 2026-001
```

- Génère un HTML professionnel dans `~/.freelance/invoices/`
- Auto-numérotation YYYY-NNN si `--number` omis
- Ouvre dans le navigateur par défaut (sauf `--no-open`)
- Pré-remplit les infos client depuis `clients.json` si trouvé
- Mentions légales françaises incluses (micro-entreprise par défaut)
- `paid` marque une facture comme payée (suivi dans dashboard)
- Montants au format français (2 900,00 €)
- Initiales du prestataire comme logo sur la facture

### dashboard.py — Tableau de bord revenus

```bash
python3 dashboard.py summary [--year 2026] [--json]
python3 dashboard.py monthly [--year 2026] [--json]
```

- Agrège factures + time tracking
- CA total, par mois, par client
- Heures travaillées, jours ouvrés (heures/7), taux horaire effectif
- Factures payées vs impayées
- Taux effectif calculé sur les mois avec CA uniquement

## Configuration

Fichier optionnel `~/.freelance/config.json` :

```json
{
  "provider": {
    "name": "Hugo Dupont",
    "address": "42 rue de la Paix, 75002 Paris",
    "siret": "98765432100010",
    "email": "hugo@example.com",
    "phone": "0600000000"
  },
  "default_rate": 80,
  "tva_rate": 0,
  "micro_entreprise": true,
  "payment_delay_days": 30,
  "payment_method": "Virement bancaire",
  "iban": "FR76 1234 5678 9012 3456 7890 123"
}
```

Si `micro_entreprise: true` → TVA = 0%, mention art. 293B du CGI.
Si `tva_rate > 0` → TVA calculée sur chaque facture.

## Données

Tout dans `~/.freelance/` :

```
~/.freelance/
├── config.json          — Configuration prestataire
├── clients.json         — Base clients
├── timetrack.json       — Entrées de temps
└── invoices/
    ├── 2026-001.html    — Factures HTML
    ├── 2026-001.json    — Métadonnées facture
    └── ...
```

## Notes

- Montants en euros (€), output en français
- `--json` disponible sur toutes les commandes pour usage machine
- Les factures HTML sont optimisées pour impression / export PDF via navigateur
- Voir `references/french-law.md` pour le détail des obligations légales
