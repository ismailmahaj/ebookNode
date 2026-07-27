# Audit — Intégration Cloudflare R2

> **Date :** 27 juillet 2026  
> **Bucket cible :** `ebooks-storage` (privé)  
> **Statut :** Phase audit — avant implémentation

---

## 1. État actuel du projet

### 1.1 Architecture détectée

| Élément | Valeur |
|---------|--------|
| Langage | **JavaScript ESM** (`"type": "module"`) — pas de TypeScript |
| Framework | **Express 4.21** |
| Base de données | **PostgreSQL** via `pg` (Pool) — **aucun ORM** |
| Auth | JWT Bearer (`jsonwebtoken`) — `src/middleware/auth.js` |
| Rôles | `users.is_admin` + middleware `requireAdmin` |
| Upload | **Multer** `diskStorage` → `api/uploads/{covers,pdfs}/` |
| PDF metadata | `pdf-parse` (comptage pages) |
| Paiement | Airwallex (webhooks) |
| Tests | **Aucun** (pas de jest/mocha/vitest) |
| Déploiement | Railway (Nixpacks, root `api/`) |

### 1.2 Modèle ebook actuel

Colonnes pertinentes (`src/db/init.js`) :

- `cover_image_path` — chemin local `/uploads/covers/...`
- `pdf_file_path` — chemin local `/uploads/pdfs/...`
- `pdf_file_size`, `total_pages`, `preview_pages`
- **Pas d’EPUB, pas d’audio, pas de table d’assets**

### 1.3 Accès lecture actuel

| Route | Auth | Abonnement | Comportement |
|-------|------|------------|--------------|
| `GET /api/ebooks/:id/preview` | Oui | Non | Stream PDF **complet** (local) |
| `GET /api/ebooks/:id/stream` | Oui | Oui (`hasActiveSubscription`) | Stream PDF complet + vues |

**Problèmes critiques :**

1. Fichiers sur disque local Railway (éphémère).
2. `express.static('/uploads')` expose PDF + covers sans auth.
3. `preview_pages` non appliqué côté serveur.
4. Pas d’URLs signées.

### 1.4 Auth / droits réutilisables

- `authenticate`, `requireAdmin` — `src/middleware/auth.js`
- `hasActiveSubscription(user)` — `src/utils/user.js` (admin OU abonnement actif/canceled avec date future)
- Format erreurs : 401 / 403 / 404 / 422 JSON `{ message, errors? }`

### 1.5 Admin upload actuel

`POST /api/admin/ebooks` + `POST /api/admin/ebooks/:id` avec multer fields `pdf_file` + `cover_image` (max 50 Mo).

---

## 2. Fichiers qui seront créés

```
api/src/config/r2.js                    # S3Client R2 centralisé
api/src/services/storage/r2StorageService.js
api/src/services/storage/objectKeys.js  # génération des clés
api/src/services/storage/fileValidation.js
api/src/services/ebookAssetService.js   # logique métier assets
api/src/routes/assets.js                # read-url, preview-url (user)
api/src/routes/adminAssets.js           # upload / confirm / delete (admin)
api/scripts/test-r2-connection.js
docs/R2_INTEGRATION_AUDIT.md            # ce fichier
docs/CLOUDFLARE_R2_SETUP.md
api/src/__tests__/...                   # tests unitaires (node:test)
```

---

## 3. Fichiers qui seront modifiés

| Fichier | Modification |
|---------|--------------|
| `api/package.json` | deps AWS SDK + script `r2:test` |
| `api/src/config.js` | config R2 + validation démarrage |
| `api/src/db/init.js` | colonnes R2 + table `ebook_assets` |
| `api/src/middleware/upload.js` | memoryStorage + limites par type |
| `api/src/routes/admin.js` | upload vers R2 (rétrocompat local) |
| `api/src/routes/ebooks.js` | stream/preview via R2 ou signed URL |
| `api/src/utils/ebook.js` | ne plus exposer chemins PDF ; covers via API |
| `api/src/index.js` | monter nouvelles routes ; static uploads conditionnel |
| `api/.env.example` | variables R2 |
| `api/railway.env` | template R2 |

**Frontend web / Flutter :** non modifiés dans cette phase (contrat API documenté). Les routes `/preview` et `/stream` restent pour compatibilité, en s’appuyant sur R2.

---

## 4. Dépendances nécessaires

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Réutilisation : `multer` (memoryStorage), `pdf-parse`, Express, `pg`.

---

## 5. Migration base de données (non destructive)

### 5.1 Colonnes ajoutées sur `ebooks`

```sql
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS pdf_object_key VARCHAR(500);
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS cover_object_key VARCHAR(500);
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS preview_pdf_object_key VARCHAR(500);
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS epub_object_key VARCHAR(500);
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS preview_epub_object_key VARCHAR(500);
```

Conservation de `cover_image_path` et `pdf_file_path` pour les anciens fichiers locaux.

### 5.2 Table `ebook_assets`

```sql
CREATE TABLE IF NOT EXISTS ebook_assets (
  id SERIAL PRIMARY KEY,
  ebook_id INTEGER NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500),
  mime_type VARCHAR(100),
  size_bytes BIGINT DEFAULT 0,
  checksum VARCHAR(128),
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'cloudflare-r2',
  status VARCHAR(50) NOT NULL DEFAULT 'READY',
  is_preview BOOLEAN NOT NULL DEFAULT FALSE,
  chapter_number INTEGER,
  duration_seconds INTEGER,
  metadata JSONB,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Types : `COVER`, `PDF`, `EPUB`, `PDF_PREVIEW`, `EPUB_PREVIEW`, `AUDIO_CHAPTER`, `AUDIO_PREVIEW`  
Status : `PENDING`, `UPLOADING`, `READY`, `FAILED`, `DELETED`

---

## 6. Structure des object keys

```
ebooks/{ebookId}/original/book.pdf
ebooks/{ebookId}/original/book.epub
ebooks/{ebookId}/preview/preview.pdf
ebooks/{ebookId}/covers/cover.{ext}
ebooks/{ebookId}/audio/full/chapter-{nnn}.mp3
ebooks/{ebookId}/audio/preview/preview.mp3
test/{uuid}.txt   # script de diagnostic uniquement
```

---

## 7. Endpoints prévus

### Utilisateur

| Méthode | Path | Droits |
|---------|------|--------|
| GET | `/api/ebooks/:id/read-url?format=pdf\|epub` | Auth + abonnement |
| GET | `/api/ebooks/:id/preview-url` | Auth (extrait seulement) |
| GET | `/api/ebooks/:id/cover-url` | Auth (cover signée) |
| GET | `/api/ebooks/:id/assets/:assetId/url` | Selon type asset |

### Admin

| Méthode | Path |
|---------|------|
| POST | `/api/admin/ebooks/:ebookId/assets/presign-upload` |
| POST | `/api/admin/ebooks/:ebookId/assets/confirm-upload` |
| POST | `/api/admin/ebooks/:ebookId/assets/upload` (multipart mémoire → R2) |
| GET | `/api/admin/ebooks/:ebookId/assets` |
| DELETE | `/api/admin/ebooks/:ebookId/assets/:assetId` |

Les routes admin CRUD existantes (`POST /api/admin/ebooks`) seront adaptées pour uploader vers R2 quand configuré.

### Compatibilité

- `GET /preview` et `GET /stream` : continuent de fonctionner (stream depuis R2 ou local).

---

## 8. Stratégie couvertures

- Bucket **entier privé**.
- Couvertures servies via `GET /api/ebooks/:id/cover-url` (URL signée courte) ou stream proxy.
- **Pas** de bucket public pour les covers.

---

## 9. Stratégie extraits

- Asset `PDF_PREVIEW` / clé `preview_pdf_object_key` si fourni.
- Sinon : tant qu’aucun preview dédié n’existe, `preview-url` refuse d’exposer le PDF complet et retourne 404/422 avec message clair **OU** applique une politique documentée temporaire.
- **Décision d’implémentation :** si `preview_pdf_object_key` absent, générer URL signée uniquement pour un objet preview ; si absent, l’endpoint `/preview-url` retourne 404. Les routes legacy `/preview` streameront depuis R2 le PDF stocké mais le front/mobile devront migrer vers `/preview-url` + asset preview.  
- Pour ne pas casser la prod actuelle : `/preview` reste fonctionnel (comportement actuel) tant qu’un preview dédié n’est pas uploadé ; `/preview-url` préfère l’asset preview.

---

## 10. Risques

| Risque | Mitigation |
|--------|------------|
| Timeouts Railway sur gros uploads | Presigned upload direct + confirm |
| Mémoire (pdf-parse) | Buffer limité ; pages optionnelles |
| Ebooks locaux existants | Fallback `storage_provider=local` |
| Fuite `/uploads` static | Désactiver static PDF ; covers via signed URL |
| Config R2 incomplète | Validation au boot (erreur claire) |
| Remplacement asset interrompu | Upload nouveau → DB → delete ancien |
| Pas de tests existants | Ajouter `node:test` + mocks |

---

## 11. Plan d’implémentation

1. Dépendances + `.env.example` + `config.js`
2. Client R2 + `r2StorageService` + object keys + validation
3. Migration `ebook_assets` + colonnes
4. Adapter multer (memory) + admin upload R2
5. Routes user read-url / preview-url / cover-url
6. Routes admin assets (presign, confirm, upload, list, delete)
7. Adapter stream/preview legacy
8. Script `r2:test` + documentation
9. Tests unitaires (mocks)
10. Lint / smoke check

---

## 12. Variables d’environnement

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=ebooks-storage
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_SIGNED_URL_EXPIRATION_SECONDS=300
R2_MAX_PDF_SIZE_MB=100
R2_MAX_EPUB_SIZE_MB=100
R2_MAX_COVER_SIZE_MB=10
R2_MAX_AUDIO_SIZE_MB=500
R2_REQUIRED=false   # true en production Railway
```

---

## 13. Décisions d’architecture

1. **JS ESM** — pas de migration TypeScript.
2. **Rétrocompatibilité** locale si R2 non configuré et `R2_REQUIRED≠true`.
3. **Multer memoryStorage** pour PDF/covers admin classiques ; **presign** pour gros fichiers / audio.
4. **URLs signées** jamais en DB ni en logs.
5. **Table `ebook_assets`** + colonnes clés sur `ebooks` pour accès rapide PDF/cover.

---

*Fin de l’audit. Implémentation à suivre.*
