# Architecture mobile Flutter — E-BOOK

## Vue d'ensemble

Application Flutter dans `mobile/` du monorepo `ebooknodejs`, consommant l'API Express existante.

## Stack

| Couche | Technologie |
|--------|-------------|
| UI | Flutter Material 3 |
| État | Riverpod 2 |
| Navigation | GoRouter (StatefulShellRoute) |
| HTTP | Dio |
| Tokens | flutter_secure_storage |
| Préférences | shared_preferences |
| Connectivité | connectivity_plus |
| Fonts | google_fonts (Bebas Neue, Source Sans 3) |

## Structure

```
lib/
  app/
    app.dart              # MaterialApp.router
    config/env_config.dart
    router/app_router.dart
    theme/                # Design system Netflix
  core/
    api/                  # Dio, exceptions
    auth/                 # Secure token storage
    constants/
    network/
    widgets/              # Button, skeleton, error, empty
  features/
    splash/
    onboarding/
    authentication/       # data + presentation
    home/, discovery/, library/, search/, profile/
    ebook_details/, reader/, subscription/
  shared/
    models/
    widgets/main_shell.dart
```

## Navigation

```
/splash → /onboarding | /login | /
/login, /register
/ (shell) → Accueil | Explorer | Bibliothèque | Rechercher | Profil
/ebook/:id, /reader/:id, /subscription
```

Le lecteur s'ouvre en fullscreen hors shell.

## Auth flow

1. Splash vérifie token via `GET /auth/me`
2. Si valide → accueil
3. Sinon onboarding (première fois) → login
4. Token stocké dans Keychain/Keystore

## API client

- Base URL : `{API_BASE_URL}/api`
- Intercepteur Bearer automatique
- Mapping erreurs → exceptions métier typées

## Prochaines étapes

- Phase 2 : finaliser auth (mot de passe oublié quand backend prêt)
- Phase 3 : brancher catalogue sur `GET /ebooks`
- Phase 5 : lecteur PDF (`pdfx` à benchmarker)
