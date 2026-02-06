# Prompt MANUS — Site leadgen local (FR) A→Z (anti-doorway)

> Remplacer les variables entre {{...}}.

Tu es MANUS. Construis un site web complet (FR), mobile-first, ultra-rapide, destiné à générer des leads locaux.

## Contexte

- Marque : {{BRAND}}
- Modèle : {{BUSINESS_MODEL}} (ex: service de mise en relation avec artisans partenaires indépendants)
- Zone : {{CITY}} + {{RADIUS_KM}} km ({{ZONES_LIST}})
- Conversions : WhatsApp > appel > formulaire
- Contact : {{PHONE}} | {{WHATSAPP_LINK}} | {{EMAIL}} | {{HOURS}}

## Contraintes critiques (SEO PUR)

- Interdit : doorway pages (pages ville clonées), contenu scalé sans valeur, promesses de résultat.
- Chaque page doit être originale, utile, orientée intention.
- Transparence obligatoire du modèle (si mise en relation) sur toutes pages clés.

## Pages obligatoires

{{PAGES_LIST}}

## Structure imposée pages service

A) Hero (problème→solution + CTA)
B) Symptômes
C) Causes fréquentes
D) Ce que nous faisons (process + critères partenaires)
E) Délais & déroulé (3 étapes)
F) Tarifs indicatifs (fourchettes + variables + disclaimer)
G) Avant de nous écrire : 3 vérifs
H) Confiance : charte anti-arnaque + preuves
I) FAQ (5–7)
J) CTA final + mini-formulaire

## SEO technique

- Titles <= 60, metas <= 155, 1 H1/page
- canonicals, sitemap.xml, robots.txt
- OpenGraph/Twitter
- Images optimisées (lazyload, WebP)

## Tracking

- GTM : {{GTM_ID}} (placeholder)
- GA4 : {{GA4_ID}} (fallback)
- events dataLayer : click_whatsapp, click_call, form_submit, view_tarifs
- UTM hidden fields dans formulaire

## RGPD

- Bandeau cookies (Accepter/Refuser/Paramétrer)
- Ne pas charger analytics avant consentement
- Pages : confidentialité + cookies + mentions

## Livrables

- Site complet (toutes pages)
- Tableau URL/Title/Meta/H1
- JSON-LD (LocalBusiness/Service/FAQ/Breadcrumb)
- Checklist Go-live + mini guide 48h
