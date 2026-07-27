# E-BOOK — Application mobile Flutter

Application mobile iOS/Android pour la plateforme E-BOOK.

## Prérequis

- Flutter stable (3.12+)
- Xcode (iOS) / Android Studio (Android)
- Backend API en cours d'exécution

## Installation

```bash
cd mobile
cp .env.example .env
flutter pub get
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | URL de l'API (sans `/api`) |
| `ENVIRONMENT` | `development`, `staging`, `production` |

Exemple local :
```env
API_BASE_URL=http://localhost:8000
ENVIRONMENT=development
```

> Sur simulateur iOS, utilisez `http://localhost:8000`.  
> Sur émulateur Android, utilisez `http://10.0.2.2:8000`.

## Lancement

```bash
# Android
flutter run

# iOS
flutter run -d ios

# Avec API locale (Android emulator)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

## Commandes qualité

```bash
dart format .
flutter analyze
flutter test
```

## Architecture

```
lib/
  app/          # config, thème, router
  core/         # API, auth, widgets partagés
  features/     # modules par fonctionnalité
  shared/       # modèles, widgets
```

Voir `docs/mobile/FLUTTER_MOBILE_AUDIT.md` pour l'audit complet.

## Phases de développement

| Phase | Statut |
|-------|--------|
| 0 — Audit | ✅ |
| 1 — Fondation | ✅ |
| 2 — Authentification | 🔄 En cours |
| 3 — Catalogue | ⏳ |
| 4 — Bibliothèque | ⏳ |
| 5 — Lecteur PDF | ⏳ |
| 6 — Hors ligne | ⏳ |
| 7 — Abonnement IAP | ⏳ |
