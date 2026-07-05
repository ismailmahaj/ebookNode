# Liaison Frontend (React) ↔ Backend (Laravel API)

## Vérification effectuée

### Frontend (react-web)

| Élément | Configuration | Statut |
|--------|----------------|--------|
| **URL API** | `baseURL = VITE_API_URL ? VITE_API_URL + '/api' : '/api'` | OK |
| **En dev** | Sans `.env`, utilise `/api` → proxy Vite vers `http://localhost:8000` | OK |
| **En prod** | Définir `VITE_API_URL=https://votre-api.com` dans `.env` | À faire en déploiement |
| **Headers** | `Content-Type: application/json`, `Accept: application/json` | OK |
| **Token** | `Authorization: Bearer <token>` ajouté par interceptor depuis `localStorage` | OK |
| **401** | Redirection vers `/login` et suppression du token | OK |
| **Credentials** | `withCredentials: true` pour CORS + cookies si besoin | OK |

### Backend (laravel-api)

| Élément | Configuration | Statut |
|--------|----------------|--------|
| **CORS** | `paths: api/*, sanctum/csrf-cookie`, `supports_credentials: true` | OK |
| **Sanctum** | `stateful` inclut `localhost:5173` (port Vite) | OK |
| **Routes auth** | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | OK |

### Correspondance des appels

| Frontend | Backend |
|----------|---------|
| `api.post('/auth/register', data)` | `POST /api/auth/register` |
| `api.post('/auth/login', { email, password })` | `POST /api/auth/login` |
| `api.get('/auth/me')` | `GET /api/auth/me` (auth:sanctum) |
| `api.post('/auth/logout')` | `POST /api/auth/logout` (auth:sanctum) |

---

## Pour tester en local

1. **Démarrer le backend** (dans `laravel-api`) :
   ```bash
   php artisan serve
   ```
   → API sur **http://localhost:8000**

2. **Démarrer le frontend** (dans `react-web`) :
   ```bash
   npm run dev
   ```
   → App sur **http://localhost:5173**

3. **Ne pas définir** `VITE_API_URL` dans `react-web/.env` : le proxy Vite envoie `/api` vers `http://localhost:8000`.

4. Tester : inscription, connexion, puis accès à la page d’accueil (appel à `/auth/me`).

---

## En production

- Dans **react-web**, créer `.env` avec par exemple :
  ```env
  VITE_API_URL=https://ebook.ismservices.be
  ```
  Puis rebuilder : `npm run build`.

- Côté **laravel-api**, dans `.env` :
  ```env
  SANCTUM_STATEFUL_DOMAINS=votre-frontend.com,www.votre-frontend.com
  ```

La liaison entre le frontend et le backend est correctement configurée.
