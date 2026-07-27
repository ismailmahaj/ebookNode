# Audit mobile Flutter — Plateforme E-BOOK

> **Date :** 27 juillet 2026  
> **Statut :** Phase 0 — Audit terminé, aucune implémentation Flutter démarrée  
> **Repository :** `ebooknodejs` (monorepo)

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Architecture existante](#2-architecture-existante)
3. [Fonctionnalités actuellement disponibles](#3-fonctionnalités-actuellement-disponibles)
4. [Cartographie des endpoints](#4-cartographie-des-endpoints)
5. [Analyse UX de la webapp](#5-analyse-ux-de-la-webapp)
6. [Formats d'ebooks et lecteur actuel](#6-formats-debooks-et-lecteur-actuel)
7. [Risques techniques](#7-risques-techniques)
8. [Contraintes App Store et Google Play](#8-contraintes-app-store-et-google-play)
9. [Architecture Flutter proposée](#9-architecture-flutter-proposée)
10. [Plan d'implémentation par phases](#10-plan-dimplémentation-par-phases)
11. [Fichiers à créer / modifier](#11-fichiers-à-créer--modifier)
12. [Décisions bloquantes avant Phase 1](#12-décisions-bloquantes-avant-phase-1)

---

## 1. Résumé exécutif

Le projet **E-BOOK** est une plateforme de lecture numérique style Netflix, déployée sur Railway avec :

- **Backend** : Node.js + Express + PostgreSQL (`api/`)
- **Frontend web** : React + TypeScript + Vite + Tailwind (`react-web/`)
- **Paiement** : Airwallex (checkout web, webhooks)
- **Format unique** : **PDF uniquement**
- **Modèle économique** : aperçu gratuit → paywall abonnement (3,99 €/mois)

L'API est **fonctionnelle pour un MVP catalogue + lecture PDF + abonnement**, mais **incomplète pour une app mobile premium** : pas de progression de lecture, favoris, historique, signets, refresh token, mot de passe oublié, ni limitation réelle de l'aperçu côté serveur.

**Recommandation :** réutiliser l'API existante pour les phases 1 à 4, documenter les endpoints manquants avant modification backend, et traiter l'abonnement mobile comme un sujet distinct (IAP vs web) avant publication stores.

---

## 2. Architecture existante

### 2.1 Stack frontend web

| Composant | Technologie |
|-----------|-------------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router DOM 6 |
| État | Zustand (persist localStorage) |
| HTTP | Axios |
| Styles | Tailwind CSS 3 (thème Netflix) |
| Lecteur | `react-pdf` + `pdfjs-dist` |
| PWA | `vite-plugin-pwa` + Workbox |
| Offline | IndexedDB (`ebook-offline`) |
| Icônes | Lucide React |
| Déploiement | Railway (static `serve`) |

**URLs production :**
- Front : `https://ebookreact-production.up.railway.app`
- API : `https://ebooknode-production-06ee.up.railway.app`

### 2.2 Stack backend

| Composant | Technologie |
|-----------|-------------|
| Runtime | Node.js (ES modules) |
| Framework | Express 4 |
| Base de données | PostgreSQL (`pg`) |
| Auth | JWT Bearer (`jsonwebtoken`) |
| Hash mots de passe | bcryptjs (cost 12) |
| Upload | Multer (disque local) |
| PDF metadata | `pdf-parse` |
| Paiement | Airwallex Billing API |
| Déploiement | Railway + Nixpacks |

**Structure clé :**
```
api/src/
  index.js          # bootstrap, CORS, routes
  config.js         # variables d'environnement
  db/init.js        # schéma + migrations inline + seed
  middleware/       # auth, cors, upload
  routes/           # auth, ebooks, categories, admin, subscription, webhooks, setup
  services/         # airwallex.js
  utils/            # user, ebook, pagination, slug
```

### 2.3 Base de données

Schéma défini dans `api/src/db/init.js` (migrations au démarrage).

| Table | Rôle |
|-------|------|
| `users` | Comptes, rôles, abonnement, IDs Airwallex |
| `categories` | Catégories éditoriales |
| `ebooks` | Métadonnées + chemins fichiers PDF/couverture |
| `ebook_category` | Liaison many-to-many |
| `billing_events` | Idempotence webhooks Airwallex |

**Colonnes `users` pertinentes mobile :**
- `subscription_status` : `active`, `inactive`, `canceled`, `past_due`
- `subscription_ends_at`
- `airwallex_customer_id`, `airwallex_subscription_id`
- `trial_ends_at` (colonne présente, **non utilisée** dans `hasActiveSubscription`)

**Colonnes `ebooks` pertinentes mobile :**
- `preview_pages` (défaut 10) — **exposé en JSON mais non appliqué au streaming**
- `total_pages`, `pdf_file_size`, `is_featured`, `total_views`

### 2.4 Authentification

| Aspect | Implémentation actuelle |
|--------|----------------------|
| Méthode | JWT Bearer dans header `Authorization` |
| Payload | `{ sub: userId }` |
| Expiration | `JWT_EXPIRES_IN` (défaut `7d`) |
| Refresh token | **Absent** |
| Révocation | **Absente** (`/logout` cosmétique) |
| Stockage web | `localStorage` (token + user Zustand) |
| Routes protégées | Middleware `authenticate` |
| Admin | `requireAdmin` (`is_admin = true`) |

**Réponse `formatAuthUser` :**
```json
{
  "id": 1,
  "name": "Jean",
  "email": "jean@exemple.com",
  "is_admin": false,
  "subscription_status": "inactive",
  "subscription_ends_at": null,
  "has_active_subscription": false
}
```

### 2.5 Système d'abonnement

| Aspect | Détail |
|--------|--------|
| Fournisseur | **Airwallex** (Billing Checkout, mode `SUBSCRIPTION`) |
| Prix affiché | 3,99 €/mois (`SUBSCRIPTION_PRICE_EUR`) |
| Inscription | `subscription_status = inactive` (plus d'essai 7 jours) |
| Accès complet | `hasActiveSubscription()` : admin OU `active`/`canceled` avec date future |
| Checkout | `POST /api/subscription/checkout` → redirect URL Airwallex |
| Webhook | `POST /api/webhooks/airwallex` (HMAC SHA-256) |
| Sync secours | `POST /api/subscription/sync` après retour paiement |
| Gestion admin | `PATCH /api/admin/users/:id/subscription` (manuel) |

**Non présent :** Stripe, Apple IAP, Google Play Billing, restauration achats mobile, annulation self-service.

### 2.6 Stockage des fichiers

| Type | Emplacement | Accès |
|------|-------------|-------|
| PDF | `api/uploads/pdfs/` | `GET /uploads/pdfs/{file}` (static) |
| Couvertures | `api/uploads/covers/` | `GET /uploads/covers/{file}` (static) |
| Limite upload | 50 Mo |
| Cloud | **Non** — disque local uniquement |

**Risque Railway :** sans volume persistant, les uploads peuvent être perdus au redéploiement.

### 2.7 Services externes

| Service | Usage |
|---------|-------|
| Airwallex | Abonnement récurrent |
| PostgreSQL (Railway) | Données |
| Google Fonts | Typographie web |
| unpkg CDN | Worker PDF.js (web uniquement) |
| Firebase | **Absent** |
| Sentry | **Absent** |
| Email (SMTP) | **Absent** |

### 2.8 Système de lecture actuel (web)

- Format : **PDF uniquement**
- Preview : `GET /ebooks/:id/preview` — envoie le **PDF complet** (pas de troncature)
- Stream : `GET /ebooks/:id/stream` — PDF complet si abonné
- Lecteur : navigation page par page (`react-pdf`)
- Offline : téléchargement blob → IndexedDB, lecture via `?offline=1`
- **Pas de** : progression sauvegardée, signets, zoom avancé, recherche dans le livre

### 2.9 Audio

**Aucune fonctionnalité audio** dans le backend ni le frontend. Pas de fichiers audio, TTS, ni chapitres audio.

---

## 3. Fonctionnalités actuellement disponibles

Légende : ✅ Présent et utilisable | ⚠️ Partiel | ❌ Absent

| Fonctionnalité | Frontend web | Backend | Endpoint | Mobile immédiat | Adaptation mobile | État |
|----------------|-------------|---------|----------|-----------------|-------------------|------|
| Inscription | ✅ | ✅ | `POST /auth/register` | ✅ | UI native | Complet |
| Connexion | ✅ | ✅ | `POST /auth/login` | ✅ | UI native | Complet |
| Déconnexion | ✅ | ✅ | `POST /auth/logout` | ✅ | Supprimer token local | Complet |
| Session / profil | ✅ | ✅ | `GET /auth/me` | ✅ | Secure storage | Complet |
| Catalogue ebooks | ✅ | ✅ | `GET /ebooks` | ✅ | Carrousels, pagination | Complet |
| Fiche ebook | ✅ | ✅ | `GET /ebooks/:id` | ✅ | Hero, métadonnées | Complet |
| Catégories | ✅ (dérivées) | ✅ | `GET /categories` | ✅ | Pills, filtres | Complet |
| Recherche | ❌ UI | ⚠️ | `GET /ebooks?search=` | ⚠️ | Écran dédié | Backend OK, UI absente |
| Aperçu gratuit | ✅ | ⚠️ | `GET /ebooks/:id/preview` | ⚠️ | Limiter pages côté app | **Preview non limité serveur** |
| Lecture complète | ✅ | ✅ | `GET /ebooks/:id/stream` | ✅ | Lecteur PDF natif | Complet |
| Abonnement checkout | ✅ | ✅ | `POST /subscription/checkout` | ⚠️ | **Stores IAP requis** | Web only |
| Statut abonnement | ✅ | ✅ | `GET /subscription/status` | ✅ | Paywall | Complet |
| Téléchargement offline | ✅ | ✅ | stream → cache local | ✅ | Download manager | Complet (web PWA) |
| Progression lecture | ❌ | ❌ | — | ❌ | **Nouveau endpoint** | Absent |
| Favoris | ❌ | ❌ | — | ❌ | **Nouveau endpoint** | Absent |
| Historique | ❌ | ❌ | — | ❌ | **Nouveau endpoint** | Absent |
| Signets | ❌ | ❌ | — | ❌ | **Nouveau endpoint** | Absent |
| Recommandations | ⚠️ featured | ⚠️ | `?featured=true` | ⚠️ | Sections éditoriales | Basique |
| Mot de passe oublié | ❌ | ❌ | — | ❌ | Email service requis | Absent |
| Vérification email | ❌ | ❌ | — | ❌ | Email service requis | Absent |
| Suppression compte | ❌ | ❌ | — | ❌ | **Requis stores** | Absent |
| Refresh token | ❌ | ❌ | — | ❌ | Recommandé mobile | Absent |
| Connexion sociale | ❌ | ❌ | — | ❌ | — | Absent |
| Audio / TTS | ❌ | ❌ | — | ❌ | — | Absent |
| Notifications push | ❌ | ❌ | — | ❌ | FCM + backend | Absent |
| Admin | ✅ | ✅ | `/api/admin/*` | ❌ | Web only (OK) | Complet |

---

## 4. Cartographie des endpoints

### 4.1 Endpoints publics (sans auth)

| Méthode | URL | Auth | Params / Body | Réponse | Écran mobile | État |
|---------|-----|------|---------------|---------|--------------|------|
| GET | `/api/health` | Non | — | `{ status, service, hasAdmin, ... }` | Debug | ✅ |
| POST | `/api/setup/promote-admin` | Secret | `{ email, secret, password? }` | `{ message, user }` | — | ✅ (ops) |
| POST | `/api/webhooks/airwallex` | Signature HMAC | Raw JSON | `200` | — | ✅ |

### 4.2 Authentification — `/api/auth`

| Méthode | URL | Auth | Params / Body | Réponse | Écran mobile | État |
|---------|-----|------|---------------|---------|--------------|------|
| POST | `/register` | Non | `{ name, email, password, password_confirmation }` | `201 { user, token }` | Inscription | ✅ |
| POST | `/login` | Non | `{ email, password }` | `{ user, token }` | Connexion | ✅ |
| GET | `/me` | Bearer | — | `formatAuthUser` | Splash, Profil | ✅ |
| POST | `/logout` | Bearer | — | `{ message }` | Profil | ✅ |

### 4.3 Catalogue — `/api/ebooks`

| Méthode | URL | Auth | Query | Réponse | Écran mobile | État |
|---------|-----|------|-------|---------|--------------|------|
| GET | `/` | Bearer | `page`, `per_page`, `search`, `category_id`, `featured`, `sort_by`, `sort_order` | Pagination `{ data[], current_page, last_page, per_page, total }` | Accueil, Explorer, Recherche | ✅ |
| GET | `/:id` | Bearer | — | Objet ebook | Fiche ebook | ✅ |
| GET | `/:id/preview` | Bearer | — | **Stream PDF binaire** | Lecteur (extrait) | ⚠️ PDF complet servi |
| GET | `/:id/stream` | Bearer + abonnement | — | **Stream PDF binaire** | Lecteur (complet) | ✅ |

**Shape ebook :**
```json
{
  "id": 1,
  "title": "Titre",
  "slug": "titre",
  "author": "Auteur",
  "description": "...",
  "isbn": "978-...",
  "cover_image_url": "https://.../uploads/covers/xxx.jpg",
  "pdf_file_path": "/uploads/pdfs/xxx.pdf",
  "pdf_file_size": 5242880,
  "total_pages": 320,
  "preview_pages": 10,
  "published_at": "2025-01-15",
  "is_featured": true,
  "is_active": true,
  "categories": [{ "id": 1, "name": "Roman", "slug": "roman" }],
  "total_views": 42
}
```

### 4.4 Catégories — `/api/categories`

| Méthode | URL | Auth | Réponse | Écran mobile | État |
|---------|-----|------|---------|--------------|------|
| GET | `/` | Bearer | `[{ id, name, slug, description?, image_url?, ebooks_count }]` | Explorer | ✅ |

### 4.5 Abonnement — `/api/subscription`

| Méthode | URL | Auth | Body | Réponse | Écran mobile | État |
|---------|-----|------|------|---------|--------------|------|
| GET | `/status` | Bearer | — | `{ user, plan, airwallex_configured }` | Paywall, Profil | ✅ |
| POST | `/checkout` | Bearer | — | `{ checkout_url, checkout_id }` | Abonnement | ⚠️ Web redirect |
| POST | `/sync` | Bearer | — | `{ user }` | Retour paiement | ✅ |

### 4.6 Admin — `/api/admin` (toutes : Bearer + `is_admin`)

| Méthode | URL | Query / Body | Réponse | Mobile |
|---------|-----|--------------|---------|--------|
| GET | `/categories` | — | `[category]` | Non (web admin) |
| GET | `/ebooks` | pagination, filtres | Pagination ebooks | Non |
| GET | `/ebooks/:id` | — | `{ ebook }` | Non |
| POST | `/ebooks` | multipart (pdf + cover) | `201 { ebook }` | Non |
| POST | `/ebooks/:id` | multipart | `{ ebook }` | Non |
| DELETE | `/ebooks/:id` | — | `{ message }` | Non |
| POST | `/ebooks/:id/toggle-visibility` | — | `{ message, ebook }` | Non |
| GET | `/users` | pagination, search, subscription_status | Pagination users | Non |
| PATCH | `/users/:id/subscription` | `{ subscription_status, subscription_ends_at? }` | `{ message, user }` | Non |

### 4.7 Fichiers statiques

| URL | Auth | Usage mobile |
|-----|------|--------------|
| `/uploads/covers/*` | Non (public) | `cached_network_image` |
| `/uploads/pdfs/*` | Non (public) | **Ne pas utiliser directement** — passer par `/stream` |

### 4.8 Incohérences détectées

| Problème | Impact mobile | Action recommandée |
|----------|---------------|-------------------|
| `preview_pages` non appliqué au stream preview | L'extrait "gratuit" peut être le PDF entier | **Backend** : tronquer ou servir range limité ; **Mobile** : limiter pages côté lecteur en attendant |
| PDFs accessibles via `/uploads/pdfs/` sans auth | Contournement paywall possible | **Backend** : protéger ou déplacer hors static public |
| Pas de refresh token | Reconnexion fréquente après 7j | **Backend** : ajouter refresh token (Phase 2) |
| `trial_ends_at` en DB mais ignoré | Confusion | Nettoyer ou réactiver |
| JWT 7j sans révocation | Sécurité limitée | Acceptable MVP, améliorer plus tard |

### 4.9 Endpoints manquants (à documenter avant modification backend)

| Besoin mobile | Endpoint proposé | Priorité |
|---------------|------------------|----------|
| Progression lecture | `GET/PUT /api/reading-progress/:ebookId` | **P0** |
| Liste progression | `GET /api/reading-progress` | **P0** |
| Favoris | `GET/POST/DELETE /api/favorites/:ebookId` | P1 |
| Historique | `GET /api/reading-history` | P1 |
| Signets | `GET/POST/DELETE /api/bookmarks` | P2 |
| Mot de passe oublié | `POST /api/auth/forgot-password` | P1 (stores) |
| Reset password | `POST /api/auth/reset-password` | P1 |
| Suppression compte | `DELETE /api/auth/account` | **P0** (stores) |
| Refresh token | `POST /api/auth/refresh` | P1 |
| Validation IAP Apple/Google | `POST /api/subscription/verify-iap` | P0 si stores |
| Device tokens push | `POST /api/devices` | P2 |
| Recommandations | `GET /api/recommendations` | P2 |

---

## 5. Analyse UX de la webapp

### 5.1 Parcours principaux actuels

```
Inscription → /subscription (paywall) → Catalogue → Fiche → Aperçu OU Lecture
Connexion → Catalogue → Fiche → Lecture (si abonné)
Admin → CRUD ebooks + gestion users
```

### 5.2 Écrans essentiels web

| Écran | Route | Rôle |
|-------|-------|------|
| Accueil | `/` | Hero + carrousels par catégorie |
| Login | `/login` | Connexion |
| Register | `/register` | Inscription → abonnement |
| Fiche ebook | `/ebook/:id` | Métadonnées + CTAs |
| Lecteur | `/ebook/:id/read` | PDF plein écran |
| Abonnement | `/subscription` | Paywall Airwallex |
| Admin | `/admin/*` | Back-office |

### 5.3 Points forts à transposer

- Identité visuelle Netflix cohérente (sombre, rouge `#e50914`, typo display)
- Carrousels horizontaux par catégorie
- Séparation claire aperçu / lecture complète
- Lecteur immersif sans navigation principale
- Offline PWA (IndexedDB) — modèle à reproduire en natif

### 5.4 Faiblesses / lenteurs

- Catalogue charge 100 ebooks d'un coup (pas de pagination UI)
- Recherche API disponible mais **aucune UI**
- Pas de reprise de lecture ("Continuer")
- Preview non limité côté serveur
- Worker PDF depuis CDN externe (fragile)
- Fichiers legacy `.jsx` en doublon des `.tsx`

### 5.5 Éléments à repenser pour mobile

| Web | Mobile |
|-----|--------|
| Header fixe + logout | Bottom navigation 5 onglets |
| Carrousels souris | Carrousels tactiles + snap |
| Lecteur page par page basique | Lecteur PDF premium (zoom, miniatures, progression) |
| Paywall redirect externe | IAP in-app + paywall natif |
| IndexedDB manuel | Download manager avec file d'attente |
| Pas de profil | Écran profil complet (stores) |
| PWA install banner | Store listing natif |

### 5.6 Comportements natifs attendus

- Safe areas iOS (notch, home indicator)
- Retour gestuel iOS dans le lecteur
- Pull-to-refresh sur catalogue
- Haptic feedback sur actions clés
- Share sheet pour fiche ebook (pas le PDF)
- Biométrie pour réouverture app (optionnel)

---

## 6. Formats d'ebooks et lecteur actuel

### 6.1 Format réel

| Format | Supporté | Notes |
|--------|----------|-------|
| **PDF** | ✅ Oui | Seul format en production |
| EPUB | ❌ Non | Ne pas implémenter en Phase 5 sauf ajout backend |
| MOBI | ❌ Non | — |
| Audio | ❌ Non | — |
| HTML | ❌ Non | — |

### 6.2 Implications lecteur Flutter

- **Package recommandé :** `syncfusion_flutter_pdfviewer` ou `pdfx` ou `flutter_pdfview` — à benchmarker (perf, zoom, mémoire)
- **Pas de lecteur EPUB** en Phase 5
- **Preview :** limiter à `preview_pages` côté app jusqu'à correction backend
- **Gros fichiers :** streaming par chunks, pas de chargement intégral en RAM
- **Offline :** stockage dans répertoire app privé (`path_provider` + chiffrement optionnel)

### 6.3 Règle extrait gratuit

Source de vérité actuelle : champ `preview_pages` dans la réponse API (défaut 10).

**Comportement serveur actuel :** ignore ce champ, sert le PDF complet sur `/preview`.

**Stratégie mobile MVP :**
1. Lire `preview_pages` depuis l'API
2. Bloquer navigation au-delà de cette page dans le lecteur
3. Afficher paywall natif à la fin de l'extrait
4. Demander correction backend en parallèle

---

## 7. Risques techniques

### 7.1 Lecture et fichiers

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| PDF volumineux (>50 Mo) | Haute | Streaming, cache pages, lib performante |
| OOM sur vieux appareils | Haute | Limiter cache, libérer pages hors écran |
| Preview non limité serveur | Haute | Garde côté app + fix backend |
| URLs PDF publiques `/uploads/` | **Critique** | Ne pas utiliser en mobile, exiger `/stream` |
| Pas de DRM réel | Moyenne | Documenter limites, stockage privé app |

### 7.2 Synchronisation et offline

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| Pas d'API progression | **Bloquant** | Créer endpoints avant Phase 4 |
| Conflits multi-appareils | Moyenne | Timestamp `updated_at`, last-write-wins |
| Token expiré offline | Moyenne | Lecture offline autorisée si fichier local + droits cachés |
| Abonnement expiré offline | Moyenne | Vérifier à l'ouverture lecteur, grace period configurable |

### 7.3 Auth et sécurité

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| Token en localStorage (web) | — | `flutter_secure_storage` sur mobile |
| Pas de refresh token | Moyenne | Ajouter refresh ou re-login silencieux |
| JWT 7 jours | Faible | Acceptable MVP |
| Secrets dans l'app | — | Jamais de clés API Airwallex côté mobile |

### 7.4 Stores et paiements

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| Airwallex web checkout interdit pour contenu digital in-app (Apple 3.1.1) | **Critique** | IAP Apple + Play Billing |
| Pas de suppression compte | **Bloquant** App Store | Endpoint + UI obligatoires |
| Pas de restauration achats | **Bloquant** iOS | `in_app_purchase` + validation serveur |
| Abonnement web vs mobile | Haute | Sync droits via backend |

### 7.5 Performance

| Risque | Mitigation |
|--------|------------|
| Listes longues | `ListView.builder`, pagination |
| Images couverture | `cached_network_image`, tailles adaptées |
| Rebuilds | Riverpod selectors, `const` widgets |
| Cold start | Splash léger, lazy init Firebase |

### 7.6 Compatibilité

| Plateforme | Points d'attention |
|------------|-------------------|
| iOS | Safe area, IAP, privacy manifest, background audio (futur) |
| Android | Permissions stockage (scoped), Play Billing, back gesture |
| Tablettes | Grille catalogue 3-4 colonnes, lecteur paysage |

---

## 8. Contraintes App Store et Google Play

### 8.1 Situation actuelle

- Paiement : **Airwallex checkout web** (redirect navigateur)
- Acceptable pour la **webapp PWA**
- **Non conforme** pour une app native distribuant du contenu numérique

### 8.2 Scénario recommandé

| Canal | Paiement | Droits |
|-------|----------|--------|
| Web (PWA) | Airwallex | `has_active_subscription` via webhook |
| iOS app | Apple IAP (abonnement) | Validation reçu → backend active user |
| Android app | Google Play Billing | Validation purchase token → backend |

**Lien web externe pour payer (iOS) :** interdit pour débloquer du contenu numérique sans IAP.

**Exception lecture seule :** l'app peut permettre la connexion à un compte déjà abonné via le web (login) **sans bouton "s'abonner sur le web"** — zone grise, à valider avec les guidelines actuelles.

### 8.3 Document complémentaire requis

Avant Phase 7, créer `docs/mobile/SUBSCRIPTION_AND_STORES_STRATEGY.md` avec :
- Flux IAP détaillé
- Validation serveur des reçus
- Restauration achats
- Sandbox vs production
- Gestion abonnement existant web → mobile

---

## 9. Architecture Flutter proposée

### 9.1 Structure cible

```
mobile/                          # Nouveau dossier à la racine du monorepo
  lib/
    app/
      app.dart
      router/app_router.dart
      theme/
        app_theme.dart
        app_colors.dart
        app_typography.dart
        reader_theme.dart
      config/env_config.dart
    core/
      api/
        dio_client.dart
        api_interceptors.dart
        api_exceptions.dart
      auth/
        auth_repository.dart
        secure_token_storage.dart
      constants/
      errors/
      extensions/
      local_storage/
        hive_boxes.dart
      network/connectivity_service.dart
      services/
      utils/
      widgets/
        app_button.dart
        app_skeleton.dart
        error_state.dart
        empty_state.dart
    features/
      splash/
      onboarding/
      authentication/
        data/ domain/ presentation/
      home/
      discovery/
      categories/
      search/
      ebook_details/
      library/
      reader/                    # PRIORITÉ ABSOLUE
        data/
        domain/
        presentation/
      downloads/
      favorites/
      history/
      subscription/
      profile/
      settings/
    shared/
      models/
      widgets/
      animations/
  test/
  integration_test/
  android/
  ios/
  .env.example
  pubspec.yaml
  README.md
```

### 9.2 Stack technique recommandée

| Besoin | Package | Justification |
|--------|---------|---------------|
| État | `flutter_riverpod` | Testable, scalable, pas de BuildContext |
| Navigation | `go_router` | Deep links, shell routes (bottom nav) |
| HTTP | `dio` | Intercepteurs, annulation, multipart |
| Modèles | `freezed` + `json_serializable` | Immutabilité, parsing sûr |
| Tokens | `flutter_secure_storage` | Keychain iOS / Keystore Android |
| Cache local structuré | `isar` ou `hive` | Progression, favoris offline |
| Préférences simples | `shared_preferences` | Onboarding vu, thème |
| Connectivité | `connectivity_plus` | Mode offline |
| Images | `cached_network_image` | Couvertures |
| PDF | `pdfx` ou `syncfusion_flutter_pdfviewer` | À benchmarker Phase 5 |
| IAP | `in_app_purchase` | Stores (Phase 7) |
| Analytics | `firebase_analytics` | Phase 9 |
| Crash | `firebase_crashlytics` | Phase 9 |
| Push | `firebase_messaging` | Phase 8+ |

**Non retenus au départ :** Sentry (absent du projet), bloc (Riverpod suffit), get_it (Riverpod suffit).

### 9.3 Design system mobile

Reprise de l'identité web :

| Token | Valeur web | Usage mobile |
|-------|-----------|--------------|
| `netflixBlack` | `#141414` | Fond principal |
| `netflixDark` | `#181818` | Surfaces, cartes |
| `netflixRed` | `#e50914` | CTA, accents |
| `netflixRedHover` | `#f40612` | Pressed state |
| `netflixWhite` | `#E5E5E5` | Texte principal |
| `netflixGray` | `#808080` | Texte secondaire |
| `netflixCardBg` | `#2F2F2F` | Cartes ebook |

**Typographie :**
- Display : Bebas Neue (titres, hero)
- Body : Source Sans 3 (texte courant)

**Thèmes :** clair, sombre, système — **thème lecteur indépendant** (blanc, sépia, gris, noir).

### 9.4 Navigation principale

Bottom bar (5 onglets, état préservé via `StatefulShellRoute`) :

1. **Accueil** — hero, continuer, carrousels
2. **Explorer** — catégories, tendances, nouveautés
3. **Bibliothèque** — en cours, terminés, téléchargements, favoris
4. **Rechercher** — recherche + historique
5. **Profil** — compte, abonnement, réglages

**Lecteur :** route fullscreen sans bottom bar (`/reader/:id`).

**Deep links :**
- `/ebook/:id` — fiche
- `/category/:slug` — explorer filtré
- `/subscription` — paywall
- `/reader/:id` — reprise lecture

---

## 10. Plan d'implémentation par phases

### Phase 0 — Audit ✅ (cette document)

Livrable : `docs/mobile/FLUTTER_MOBILE_AUDIT.md`

### Phase 1 — Fondation Flutter

- Créer projet `mobile/` (Flutter stable)
- Config env (dev / staging / prod)
- Design system (thème sombre Netflix)
- GoRouter + shell bottom nav
- Client Dio + intercepteurs JWT
- `flutter_secure_storage` pour token
- Exceptions métier (`SubscriptionRequiredException`, etc.)
- Architecture feature-first

**Durée estimée :** 1-2 semaines

### Phase 2 — Authentification

- Splash (vérif session `/auth/me`)
- Onboarding 3-4 écrans
- Login / Register (brancher API existante)
- Routes protégées
- Gestion 401 → login
- Biométrie optionnelle (réouverture)

**API utilisée :** `/auth/*` existant  
**Backend à ajouter :** forgot-password, delete-account (stores)

**Durée estimée :** 1-2 semaines

### Phase 3 — Catalogue

- Accueil (carrousels, featured, catégories)
- Explorer (filtres, tri)
- Recherche (debounce, `?search=`)
- Fiche ebook (métadonnées, CTAs)
- Pagination catalogue

**API utilisée :** `/ebooks`, `/categories` existants

**Durée estimée :** 2-3 semaines

### Phase 4 — Bibliothèque et progression

- **Backend requis :** endpoints `reading-progress`, `favorites`
- Bibliothèque (en cours, terminés)
- Favoris
- Historique
- Sync progression (local immédiat + API différée)

**Durée estimée :** 2-3 semaines (+ backend)

### Phase 5 — Lecteur avancé (PRIORITÉ)

- Lecteur PDF natif
- Zoom, pinch, double-tap
- Miniatures / accès rapide page
- Reprise exacte (page + pourcentage)
- Limite extrait (`preview_pages`)
- Paywall fin d'extrait
- Thèmes lecteur (blanc, sépia, sombre)
- Sauvegarde progression à la fermeture
- Wakelock pendant lecture

**API utilisée :** `/preview`, `/stream` + progression (Phase 4)

**Durée estimée :** 3-4 semaines

### Phase 6 — Mode hors ligne

- Download manager (file d'attente, pause, reprise)
- Stockage privé app
- Badge "disponible hors ligne"
- Vérification droits à l'ouverture
- Nettoyage si abonnement expiré

**Durée estimée :** 2 semaines

### Phase 7 — Abonnement

- Paywall natif
- `in_app_purchase` (Apple + Google)
- Validation reçus côté backend (nouveau endpoint)
- Restauration achats
- Sync droits web ↔ mobile
- **Document :** `SUBSCRIPTION_AND_STORES_STRATEGY.md`

**Durée estimée :** 3-4 semaines (+ backend IAP)

### Phase 8 — Profil et réglages

- Écran profil complet
- Statut abonnement, renouvellement
- Préférences (thème, notifications)
- Suppression compte
- Aide, CGU, confidentialité

**Durée estimée :** 1-2 semaines

### Phase 9 — Qualité

- Tests unitaires (auth, progression, parsing)
- Widget tests (login, fiche, lecteur, paywall)
- Integration tests (parcours complet)
- Firebase Analytics + Crashlytics
- Accessibilité
- Performance profiling

**Durée estimée :** 2-3 semaines

### Phase 10 — Publication

- Config iOS (certificats, App Store Connect, TestFlight)
- Config Android (keystore, Play Console, AAB)
- Privacy manifest, fiches stores
- Captures d'écran
- **Document :** `RELEASE_CHECKLIST.md`

**Durée estimée :** 2-3 semaines

**Estimation totale :** 20-28 semaines (équipe réduite, hors backend additions)

---

## 11. Fichiers à créer / modifier

### 11.1 À créer (Flutter — nouveau dossier `mobile/`)

```
mobile/
  pubspec.yaml
  .env.example
  README.md
  lib/... (voir section 9.1)
  test/...
  integration_test/...
  android/...
  ios/...
```

### 11.2 Documentation mobile (phases ultérieures)

```
docs/mobile/
  FLUTTER_MOBILE_AUDIT.md          ✅ Phase 0
  MOBILE_ARCHITECTURE.md           Phase 1
  API_MAPPING.md                   Phase 1
  READER_ARCHITECTURE.md           Phase 5
  OFFLINE_STRATEGY.md              Phase 6
  SUBSCRIPTION_AND_STORES_STRATEGY.md  Phase 7
  SECURITY.md                      Phase 2
  TESTING_STRATEGY.md              Phase 9
  RELEASE_CHECKLIST.md             Phase 10
```

### 11.3 Backend — modifications éventuelles (à documenter avant implémentation)

| Fichier | Modification | Phase |
|---------|-------------|-------|
| `api/src/db/init.js` | Tables `reading_progress`, `favorites`, `bookmarks` | 4 |
| `api/src/routes/reading-progress.js` | **Nouveau** | 4 |
| `api/src/routes/favorites.js` | **Nouveau** | 4 |
| `api/src/routes/auth.js` | forgot-password, delete-account, refresh | 2 |
| `api/src/routes/ebooks.js` | Limiter preview (range/pages) | 5 |
| `api/src/routes/subscription.js` | verify-iap (Apple/Google) | 7 |
| `api/src/index.js` | Monter nouvelles routes | 4+ |
| `api/src/middleware/upload.js` | Retirer PDF du static public | 5 |

### 11.4 Frontend web — modifications

**Aucune modification requise** pour les phases 1-6.

Modifications possibles plus tard (non bloquantes) :
- Exposer recherche dans `Home.tsx` (alignement UX)
- Corriger preview côté serveur (alignement sécurité)

---

## 12. Décisions bloquantes avant Phase 1

| # | Décision | Options | Recommandation |
|---|----------|---------|----------------|
| 1 | Emplacement projet Flutter | `mobile/` à la racine vs repo séparé | `mobile/` dans le monorepo |
| 2 | Package lecteur PDF | pdfx vs syncfusion vs flutter_pdfview | Benchmark en Phase 5 |
| 3 | Stratégie IAP | Apple/Google natif vs reader-only + login web | IAP natif (conformité stores) |
| 4 | Progression backend | Créer avant Phase 4 vs local-only d'abord | API dès Phase 4 |
| 5 | Preview serveur | Fix backend vs garde app seule | Fix backend (sécurité) |
| 6 | Firebase | Nouveau projet vs existant | Nouveau projet Firebase |
| 7 | Nom app / bundle ID | À définir | Ex: `com.ebook.app` |

---

## Annexe A — Variables d'environnement

### API (existant, `api/.env.example`)

```
PORT, NODE_ENV, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN
APP_URL, CORS_ORIGINS, FRONTEND_URL
ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_SYNC_PASSWORD, ADMIN_SETUP_SECRET
SUBSCRIPTION_PRICE_EUR
AIRWALLEX_API_BASE, AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY
AIRWALLEX_WEBHOOK_SECRET, AIRWALLEX_PRICE_ID
AIRWALLEX_LEGAL_ENTITY_ID, AIRWALLEX_LINKED_PAYMENT_ACCOUNT_ID
```

### Mobile (à créer, `mobile/.env.example`)

```
API_BASE_URL=https://ebooknode-production-06ee.up.railway.app
API_BASE_URL_DEV=http://localhost:8000
ENVIRONMENT=development
# Pas de secrets Airwallex côté mobile
# Firebase: google-services.json / GoogleService-Info.plist (fichiers, pas env)
```

---

## Annexe B — Identité visuelle (assets existants)

| Asset | Chemin | Usage mobile |
|-------|--------|--------------|
| Icône app | `react-web/public/icon.svg` | Adapter en PNG 1024×1024 pour stores |
| Logo UI | Texte « E-BOOK » + icône livre | Reprendre en Flutter (pas d'image) |
| Couvertures | API `/uploads/covers/` | `cached_network_image` |
| Fonts | Google Fonts (Bebas Neue, Source Sans 3) | `google_fonts` package |

---

*Fin de l'audit Phase 0. Aucune implémentation Flutter n'a été démarrée.*
