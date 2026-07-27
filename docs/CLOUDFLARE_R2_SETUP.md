# Cloudflare R2 — Configuration E-BOOK API

## Architecture

- Bucket **privé** : `ebooks-storage`
- Aucune URL permanente vers un ebook complet
- Accès via **URLs signées** (TTL 300s par défaut) générées par l’API après contrôle des droits
- Couvertures : aussi privées, servies via `GET /api/ebooks/:id/cover-url`
- Stockage local conservé uniquement en **fallback développement** si R2 n’est pas configuré

```
Client (Web / Flutter)
    │  JWT
    ▼
API Express ──► PostgreSQL (métadonnées + object keys)
    │
    └──► Cloudflare R2 (fichiers privés)
              ▲
Admin upload ─┘  (mémoire → PutObject, ou presign PUT)
```

## Variables d’environnement

```env
R2_REQUIRED=true
R2_ACCOUNT_ID=xxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxx
R2_BUCKET_NAME=ebooks-storage
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_SIGNED_URL_EXPIRATION_SECONDS=300
R2_MAX_PDF_SIZE_MB=100
R2_MAX_EPUB_SIZE_MB=100
R2_MAX_COVER_SIZE_MB=10
R2_MAX_AUDIO_SIZE_MB=500
```

**Important :**
- `R2_ENDPOINT` = endpoint du **compte**, sans le nom du bucket
- Ne jamais préfixer avec `VITE_` / `EXPO_PUBLIC_`
- Ne jamais committer `.env`

## Configuration Cloudflare

1. Créer un bucket `ebooks-storage` (privé)
2. Créer un token API R2 avec permissions Object Read & Write sur ce bucket
3. Récupérer Account ID, Access Key ID, Secret Access Key
4. Endpoint : `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

## Configuration locale

```bash
cd api
cp .env.example .env
# Renseigner les variables R2
npm install
npm run r2:test
npm run dev
```

Sans variables R2 et `R2_REQUIRED=false` : mode local (`api/uploads/`).

## Configuration Railway

Dans le service **API** → Variables, ajouter toutes les `R2_*` ci-dessus avec `R2_REQUIRED=true`.

Puis **redéployer**.

Health check enrichi : `"storage": "cloudflare-r2"`.

## Structure des object keys

```
ebooks/{ebookId}/original/book.pdf
ebooks/{ebookId}/original/book.epub
ebooks/{ebookId}/preview/preview.pdf
ebooks/{ebookId}/covers/cover.jpg
ebooks/{ebookId}/audio/full/chapter-001.mp3
ebooks/{ebookId}/audio/preview/preview.mp3
```

## Endpoints

### Utilisateur (Bearer JWT)

| Méthode | Path | Droits |
|---------|------|--------|
| GET | `/api/ebooks/:id/read-url?format=pdf\|epub` | Abonnement actif |
| GET | `/api/ebooks/:id/preview-url?format=pdf` | Auth — extrait dédié uniquement |
| GET | `/api/ebooks/:id/cover-url` | Auth |
| GET | `/api/ebooks/:id/assets/:assetId/url` | Selon type |
| GET | `/api/ebooks/:id/stream` | Abonnement — stream (compat) |
| GET | `/api/ebooks/:id/preview` | Auth — stream (compat) |

Réponse `read-url` :

```json
{
  "data": {
    "url": "https://…signed…",
    "expiresIn": 300,
    "contentType": "application/pdf",
    "format": "pdf",
    "ebookId": 1
  }
}
```

### Admin

| Méthode | Path |
|---------|------|
| POST | `/api/admin/ebooks` (multipart → R2 si configuré) |
| POST | `/api/admin/ebooks/:ebookId/assets/upload` |
| POST | `/api/admin/ebooks/:ebookId/assets/presign-upload` |
| POST | `/api/admin/ebooks/:ebookId/assets/confirm-upload` |
| GET | `/api/admin/ebooks/:ebookId/assets` |
| DELETE | `/api/admin/ebooks/:ebookId/assets/:assetId` |

## Upload admin classique

Champs multipart : `pdf_file`, `cover_image`, optionnel `epub_file`, `preview_pdf`, `preview_epub`, `audio_file`, `audio_preview`.

## Upload direct signé (gros fichiers)

1. `POST .../presign-upload` `{ asset_type, original_filename, mime_type, size }`
2. Client `PUT` vers `uploadUrl` avec le fichier
3. `POST .../confirm-upload` `{ asset_id }`
4. Backend vérifie `HeadObject` puis marque `READY`

## Extraits

Uploader un asset `PDF_PREVIEW` (ou `preview_pdf` en multipart).  
`/preview-url` ne renvoie **jamais** le PDF complet s’il n’y a pas d’extrait dédié.

## Flutter / Web

1. Appeler `GET /read-url` avec JWT
2. Ouvrir `data.url` dans le lecteur
3. Si 403 URL expirée → redemander une URL
4. Ne jamais stocker l’URL signée en base locale longue durée

## Test de connexion

```bash
cd api && npm run r2:test
```

## Dépannage

| Symptôme | Cause | Action |
|----------|-------|--------|
| Boot refuse de démarrer | `R2_REQUIRED` + vars manquantes | Compléter Railway Variables |
| 503 stockage | R2 mal configuré | Vérifier endpoint / bucket |
| 403 read-url | Pas d’abonnement | Activer abonnement user |
| 404 preview-url | Pas d’extrait uploadé | Uploader `preview_pdf` |
| Images cassées | Cover en R2, ancien path local | Utiliser `/cover-url` |

## Sécurité

- Bucket privé
- Pas de clés dans le frontend
- URLs signées jamais loguées ni stockées en DB
- `/uploads/pdfs` n’est plus servi en static
- Object keys générées côté serveur uniquement
