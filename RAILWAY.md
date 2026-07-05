# Déploiement Railway — E-BOOK (Netflix pour ebooks)

## Architecture (2 services + PostgreSQL)

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│  FRONT (react-web)          │     │  API (api)                  │
│  ebookreact-production      │────▶│  ebooknode-production       │
│  .up.railway.app            │     │  .up.railway.app            │
└─────────────────────────────┘     └──────────────┬──────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │  PostgreSQL Railway │
                                        └─────────────────────┘
```

---

## 1. PostgreSQL

1. Railway → **New** → **Database** → **PostgreSQL**
2. Note le nom du service (ex. `Postgres`)

---

## 2. Service API (`ebooknode`)

### Création
1. **New** → **GitHub Repo** → `ismailmahaj/ebookNode`
2. **Settings** → **Root Directory** → `api`
3. **Settings** → **Networking** → **Generate Domain**
   - Exemple : `https://ebooknode-production.up.railway.app`

### Variables (onglet Variables)

Copier-coller (adapter l’URL API si différente) :

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=ebook-jwt-secret-changez-moi-32-caracteres-min
JWT_EXPIRES_IN=7d
APP_URL=https://ebooknode-production.up.railway.app
CORS_ORIGINS=https://ebookreact-production.up.railway.app
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=AdminExample2024!
ADMIN_NAME=Administrateur
ADMIN_SYNC_PASSWORD=false
ADMIN_SETUP_SECRET=SetupSecret2024!
```

> Remplace `${{Postgres.DATABASE_URL}}` par la référence Railway :
> clique **Add Reference** → sélectionne ton PostgreSQL → `DATABASE_URL`

### Vérification
Ouvre : `https://ebooknode-production.up.railway.app/api/health`

Réponse attendue :
```json
{
  "status": "ok",
  "service": "ebook-api",
  "adminEmailConfigured": "admin@example.com",
  "adminsInDatabase": ["admin@example.com"],
  "hasAdmin": true
}
```

---

## 3. Service Front (`ebookreact`)

### Création
1. **New** → **GitHub Repo** → même repo
2. **Settings** → **Root Directory** → `react-web`
3. Domaine déjà existant : `https://ebookreact-production.up.railway.app`

### Variables (AVANT le build)

```env
VITE_API_URL=https://ebooknode-production.up.railway.app
```

⚠️ **Obligatoire avant le deploy** — Vite intègre cette URL au build.
Si tu modifies `VITE_API_URL`, **redéploie** le front.

### Vérification
1. Ouvre https://ebookreact-production.up.railway.app
2. Connecte-toi :
   - Email : `admin@example.com`
   - Mot de passe : `AdminExample2024!`
3. Lien **Admin** visible → `/admin/ebooks/new`

---

## 4. Compte admin

| Champ | Valeur |
|-------|--------|
| Email | `admin@example.com` |
| Mot de passe | `AdminPassword` défini dans `ADMIN_PASSWORD` |

Créé automatiquement au démarrage de l’API.

### Secours — promouvoir admin manuellement

```bash
curl -X POST https://ebooknode-production.up.railway.app/api/setup/promote-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "secret": "SetupSecret2024!",
    "password": "AdminExample2024!"
  }'
```

---

## 5. Checklist rapide

- [ ] PostgreSQL créé
- [ ] Service **api** → Root Directory = `api` → domaine public généré
- [ ] Variables API configurées (`DATABASE_URL`, `ADMIN_EMAIL`, `CORS_ORIGINS`, etc.)
- [ ] `/api/health` retourne `"hasAdmin": true`
- [ ] Service **react-web** → Root Directory = `react-web`
- [ ] `VITE_API_URL` = URL publique de l’API (sans `/api` à la fin)
- [ ] Front redéployé après ajout de `VITE_API_URL`
- [ ] Connexion admin OK + lien **Admin** visible

---

## 6. Erreurs fréquentes

| Symptôme | Cause | Fix |
|----------|-------|-----|
| Pas de lien Admin | Front sans `VITE_API_URL` | Ajouter variable + redéployer front |
| Login ne marche pas | API sans domaine public | Generate Domain sur service `api` |
| CORS error | API down ou mauvaise URL | Vérifier `/api/health` — doit retourner JSON, pas 404 |
| CORS error | `CORS_ORIGINS` incorrect | `https://ebookreact-production.up.railway.app` (sans `/` à la fin) |
| Images cassées | `APP_URL` incorrect | = URL publique de l’API |
| `hasAdmin: false` | Seed pas exécuté | Redéployer API ou route `/api/setup/promote-admin` |

---

## 7. URLs de ton projet

| Service | URL |
|---------|-----|
| Front | https://ebookreact-production.up.railway.app |
| API | https://ebooknode-production.up.railway.app *(à générer)* |
| Health | https://ebooknode-production.up.railway.app/api/health |
| Admin | https://ebookreact-production.up.railway.app/admin/ebooks |
