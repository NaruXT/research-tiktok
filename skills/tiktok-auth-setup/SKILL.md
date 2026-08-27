---
name: tiktok-auth-setup
description: Registrar una TikTok Developer App y ejecutar el flujo OAuth 2.0 (Login Kit) para obtener, refrescar y revocar access tokens con los scopes correctos.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/getting-started-create-an-app
  - https://developers.tiktok.com/docs/en/login-kit-web
  - https://developers.tiktok.com/docs/en/oauth-user-access-token-management
  - https://developers.tiktok.com/docs/en/tiktok-api-scopes
scopes:
  - user.info.basic
  - user.info.profile
  - user.info.stats
  - video.list
  - video.upload
  - video.publish
tested_e2e: false
last_verified: 2026-08-26
---

## Overview

TikTok expone OAuth 2.0 (Authorization Code flow) vía Login Kit para autorizar una app en nombre de un usuario y obtener un `access_token`. Todo acceso a Display API, Content Posting API, Data Portability API, etc. depende de haber completado este flujo primero: registrar la app, redirigir al usuario a la pantalla de autorización de TikTok, intercambiar el `code` devuelto por un `access_token`/`refresh_token`, y luego refrescar o revocar esos tokens según haga falta.

## Scopes requeridos

| Scope | Qué habilita | Notas |
|---|---|---|
| `user.info.basic` | Perfil básico (open_id, avatar, display name) | Se agrega por default a toda app con Login Kit, sin necesidad de review |
| `user.info.profile` | `profile_web_link`, `profile_deep_link`, `bio_description`, `is_verified` | Requiere selección explícita al pedir el scope |
| `user.info.stats` | Contadores (likes, followers, following) | Requiere selección explícita |
| `video.list` | Leer videos públicos del usuario | Usado por Display API |
| `video.upload` | Subir contenido como borrador (Content Posting API) | Usado en Iteración 3 |
| `video.publish` | Publicar directo al perfil del usuario | Usado en Iteración 3 - ver guardarraíl de irreversibilidad en `.loop/HANDOFF.md`, nunca en modo público desde el loop |

La doc oficial (`tiktok-api-scopes`) no especifica cuáles de estos requieren app review individual más allá de `user.info.basic`; confirmar caso por caso en el Developer Portal al momento de agregar cada producto a la app.

## Endpoints

### 1. Registro de app (una sola vez, manual)
Ver `getting-started-create-an-app`. Pasos: crear cuenta de developer -> crear organización -> "Connect an app" -> completar nombre/categoría/ícono -> se autogeneran `client_key`/`client_secret` -> registrar `redirect_uri` (uno por plataforma) -> verificar URLs de Terms/Privacy -> agregar productos (Login Kit, etc.) -> **Sandbox mode** permite probar sin pasar por app review; producción sí lo requiere.

### 2. Autorización (redirect del usuario)
```
GET https://www.tiktok.com/v2/auth/authorize/
  ?client_key={CLIENT_KEY}
  &scope=user.info.basic,video.list
  &response_type=code
  &redirect_uri={REDIRECT_URI}
  &state={CSRF_STATE}
```
TikTok redirige de vuelta a `redirect_uri` con `?code=...&state=...` en éxito, o `?error=...&error_description=...` si el usuario no es elegible.

### 3. Intercambio de código por token
```
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

client_key=CLIENT_KEY
client_secret=CLIENT_SECRET
code=CODE
grant_type=authorization_code
redirect_uri=REDIRECT_URI
```
(`code_verifier` solo aplica a mobile/desktop con PKCE, no a web.)

### 4. Refresh de token
```
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

client_key=CLIENT_KEY
client_secret=CLIENT_SECRET
grant_type=refresh_token
refresh_token=REFRESH_TOKEN
```
El `refresh_token` devuelto puede ser distinto al enviado - siempre persistir el nuevo.

### 5. Revocación de token
```
POST https://open.tiktokapis.com/v2/oauth/revoke/
Content-Type: application/x-www-form-urlencoded

client_key=CLIENT_KEY
client_secret=CLIENT_SECRET
token=ACCESS_TOKEN
```
Respuesta exitosa: cuerpo vacío.

## Schemas (JSON)

Request de ejemplo (intercambio de código - form-urlencoded, no JSON, ver curl arriba). Response de éxito para intercambio y refresh:

```json
{
  "access_token": "act.example12345Example12345Example",
  "expires_in": 86400,
  "open_id": "afd97af1-b87b-48b9-ac98-410aghda5344",
  "refresh_expires_in": 31536000,
  "refresh_token": "rft.example12345Example12345Example",
  "scope": "user.info.basic,video.list",
  "token_type": "Bearer"
}
```

Response de error (cualquiera de los tres endpoints):

```json
{
  "error": "invalid_request",
  "error_description": "Redirect_uri is not matched with the uri when requesting code.",
  "log_id": "202206221854370101130062072500FFA2"
}
```

## Manejo de errores

- `error` / `error_description` / `log_id` es el formato uniforme de error en los tres endpoints de `/v2/oauth/*`.
- `access_token` expira a las **86400 segundos (24h)**; `refresh_token` a los **31536000 segundos (365 días)**.
- Los tokens pueden refrescarse sin consentimiento repetido del usuario mientras el `refresh_token` siga vigente.
- En el callback de autorización, `error`/`error_description` en la query string indica que el usuario no completó o no es elegible para la autorización - no confundir con el error JSON del endpoint de token (llegan por canales distintos: query string vs. body).
- Un `redirect_uri` que no coincide exactamente con el registrado en el Developer Portal produce `invalid_request` en el intercambio de código - causa común de fallos en desarrollo.

## Ejemplo end-to-end

```bash
# 1. Construir URL de autorización y abrir en el navegador del usuario
AUTH_URL="https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${TIKTOK_REDIRECT_URI}&state=$(openssl rand -hex 16)"
echo "Abrir: $AUTH_URL"

# 2. El servidor recibe el redirect con ?code=...&state=...
#    (verificar que state coincide con el generado en el paso 1)

# 3. Intercambiar el code por tokens
curl -s --location --request POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_key=${TIKTOK_CLIENT_KEY}" \
  --data-urlencode "client_secret=${TIKTOK_CLIENT_SECRET}" \
  --data-urlencode "code=${CODE}" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "redirect_uri=${TIKTOK_REDIRECT_URI}"

# 4. Guardar access_token / refresh_token de forma segura (nunca en texto plano en el repo)

# 5. Cuando access_token expire, refrescar:
curl -s --location --request POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_key=${TIKTOK_CLIENT_KEY}" \
  --data-urlencode "client_secret=${TIKTOK_CLIENT_SECRET}" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "refresh_token=${REFRESH_TOKEN}"
```

## Prueba E2E realizada

**`tested_e2e: false` - prerrequisito faltante, no un fallo silencioso.**

No se ejecutó todavía contra la API real porque el registro de la TikTok Developer App (paso 1 de "Endpoints" arriba) requiere una acción humana - login en developers.tiktok.com, verificación de cuenta, y aceptación de términos - que el loop no puede completar de forma autónoma. Esto está documentado como guardarraíl de irreversibilidad en `.loop/HANDOFF.md`: el registro de la app real es una acción explícita del usuario, no repetida automáticamente por reintentos.

**Para completar esta sección:**
1. El usuario registra la app en modo Sandbox (developers.tiktok.com -> Manage apps -> Connect an app) y coloca `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET`/`TIKTOK_REDIRECT_URI` en `.env`.
2. Se ejecuta el flujo de "Ejemplo end-to-end" de arriba contra la app real, en modo Sandbox, con la propia cuenta del usuario.
3. Se guarda evidencia del intercambio y refresh reales (request/response con `access_token`/`refresh_token`/`client_secret` reemplazados por `<REDACTED>`) en `.loop/evidence/tiktok-auth-setup-e2e.md`.
4. Se actualiza `tested_e2e: true` en el frontmatter de este archivo.
