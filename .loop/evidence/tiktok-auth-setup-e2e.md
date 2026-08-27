# Evidencia E2E - tiktok-auth-setup

**Fecha:** 2026-08-27
**App:** TikTok Developer App en modo Sandbox, Login Kit, scope `user.info.basic`, Target User = cuenta de desarrollador propia.

## 1. Autorización

`GET https://www.tiktok.com/v2/auth/authorize/` con `client_key=<REDACTED>`, `scope=user.info.basic`, `response_type=code`, `redirect_uri=https://naruxt.github.io/research-tiktok/callback.html`, `state=<REDACTED>`.

Nota de calibración: el primer intento falló con "No se pudo iniciar sesión con TikTok... redirect_uri" porque el `redirect_uri` registrado en el Developer Portal (`https://naruxt.github.io/research-tiktok/`) no coincidía exactamente con el usado en la URL de autorización (`.../callback.html`). Se corrigió el registro en el portal para que coincida exacto. TikTok exige match exacto carácter por carácter, no solo mismo dominio/prefijo.

Resultado: usuario autorizó correctamente, redirect a `callback.html` con `code` y `state` reales en la query string.

## 2. Intercambio de código por token

`POST https://open.tiktokapis.com/v2/oauth/token/`, `grant_type=authorization_code`.

Response real (secrets redactados):
```json
{
    "access_token": "<REDACTED>",
    "expires_in": 86400,
    "open_id": "<REDACTED>",
    "refresh_expires_in": 31536000,
    "refresh_token": "<REDACTED>",
    "scope": "user.info.basic",
    "token_type": "Bearer"
}
```
Coincide exacto con el schema documentado en `skills/tiktok-auth-setup/SKILL.md` § Schemas (JSON).

## 3. Refresh de token

`POST https://open.tiktokapis.com/v2/oauth/token/`, `grant_type=refresh_token`, usando el `refresh_token` del paso 2.

Response real (secrets redactados):
```json
{
    "access_token": "<REDACTED>",
    "expires_in": 86400,
    "open_id": "<REDACTED>",
    "refresh_expires_in": 31535980,
    "refresh_token": "<REDACTED>",
    "scope": "user.info.basic",
    "token_type": "Bearer"
}
```
Refresh exitoso - nuevo `access_token` y `refresh_token` emitidos.

## Registros crudos (no commiteados, solo locales)

`.loop/evidence/token-exchange.raw.json`, `.loop/evidence/token-refresh.raw.json` - responses completas sin redactar, gitignored, quedan solo en esta máquina para debugging si hiciera falta.

## Conclusión

Flujo OAuth 2.0 completo (autorización -> intercambio -> refresh) ejecutado contra la API real de TikTok en modo Sandbox. `access_token`/`refresh_token` reales guardados en `.env` local (gitignored) para reuso en Iteración 2 (Display API) sin repetir el login.
