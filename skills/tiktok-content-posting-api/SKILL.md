---
name: tiktok-content-posting-api
description: Publicar contenido (Direct Post) o enviarlo como borrador (Upload API) al perfil de un usuario de TikTok, y hacer seguimiento del estado de publicación.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/content-posting-api-get-started
  - https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post
  - https://developers.tiktok.com/docs/en/content-posting-api-get-started-upload-content
  - https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status
scopes:
  - video.publish
  - video.upload
tested_e2e: true
last_verified: 2026-08-28
---

## Overview

La Content Posting API tiene dos modos: **Direct Post** publica contenido directamente al perfil del usuario (con caption, privacidad, y opciones de interacción), y **Upload API** manda el contenido a la app nativa de TikTok como borrador para que el usuario lo termine de editar y publique manualmente. Ambos flujos comparten el mismo patrón: `init` (crea la publicación y devuelve una `upload_url`) -> subir el archivo por chunks a esa URL -> `status/fetch` (polling) para confirmar el resultado. Antes del `init` de Direct Post hay que consultar `creator_info/query` para saber qué opciones de privacidad tiene habilitadas el creador.

## ⚠️ Guardarraíl de irreversibilidad (leer antes de tocar código)

Publicar contenido público en la cuenta real de un usuario es una acción externa, visible, difícil de deshacer del todo (se puede borrar, pero fue público mientras tanto). **Ningún script de esta Skill puede usar `privacy_level` distinto de `SELF_ONLY`** - ver `.loop/HANDOFF.md` § Guardarraíles de irreversibilidad. Esto es además reforzado por `.loop/verify.sh`, que greppea el directorio de esta Skill en busca de `privacy_level` público y marca ROJO si aparece.

Dato de la propia doc oficial que refuerza esto en la práctica: **las apps sin auditar (todas las apps en Sandbox) ya vienen restringidas por TikTok a "private viewing mode" del lado del servidor** - un intento de publicar público desde una app no auditada devuelve `403 unaudited_client_can_only_post_to_private_accounts`. Esto no reemplaza nuestro guardarraíl (que es defensa en profundidad, no depende de que TikTok lo bloquee del lado de ellos), pero confirma que el límite es real y doble.

## Scopes requeridos

| Scope | Habilita | Notas |
|---|---|---|
| `video.publish` | Direct Post (`/v2/post/publish/video/init/`) | "Tu app debe estar aprobada para el scope, y el usuario debe haberlo autorizado" - en Sandbox alcanza con autorización del usuario, sin aprobación de TikTok |
| `video.upload` | Upload API / borradores (`/v2/post/publish/inbox/video/init/`) | Igual que arriba, en Sandbox mode |

## Endpoints

### 1. Consultar info del creador (antes de Direct Post)
```
POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/
Authorization: Bearer {ACCESS_TOKEN}
```
Response incluye `creator_avatar_url`, `creator_username`, `creator_nickname`, `privacy_level_options` (array - las opciones de privacidad realmente disponibles para ese creador, hay que ofrecer solo esas en cualquier UI), `comment_disabled`, `duet_disabled`, `stitch_disabled`, `max_video_post_duration_sec`. Rate limit: 20 requests/minuto por `access_token`.

### 2. Iniciar Direct Post
```
POST https://open.tiktokapis.com/v2/post/publish/video/init/
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json; charset=UTF-8

{
  "post_info": {
    "title": "caption con #hashtags y @menciones, máx 2200 runas UTF-16",
    "privacy_level": "SELF_ONLY",
    "disable_duet": false,
    "disable_comment": false,
    "disable_stitch": false,
    "video_cover_timestamp_ms": 1000
  },
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_size": 50000123,
    "chunk_size": 10000000,
    "total_chunk_count": 5
  }
}
```
`privacy_level` acepta `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY` según la doc - **en esta Skill se usa siempre `SELF_ONLY`**, ver guardarraíl arriba. `source` puede ser `FILE_UPLOAD` (subida por chunks) o `PULL_FROM_URL` (TikTok descarga desde una URL pública - requiere verificación de dominio de esa URL, igual que la de `tiktok-auth-setup`, o falla con `url_ownership_unverified`).

### 3. Iniciar Upload (borrador)
```
POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json; charset=UTF-8

{
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_size": 50000123,
    "chunk_size": 10000000,
    "total_chunk_count": 5
  }
}
```
No lleva `post_info`/`privacy_level` - queda como borrador en el inbox del usuario, quien lo termina de configurar y publicar manualmente dentro de TikTok.

### 4. Subir el archivo (ambos modos)
```
PUT {upload_url devuelta por init}
Content-Range: bytes 0-{size-1}/{total_size}
Content-Type: video/mp4
```
Se manda el archivo (o cada chunk) como body. Procesamiento asíncrono después.

### 5. Consultar estado de publicación
```
POST https://open.tiktokapis.com/v2/post/publish/status/fetch/
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json; charset=UTF-8

{ "publish_id": "{PUBLISH_ID}" }
```
`status` puede ser `PROCESSING_UPLOAD`, `PROCESSING_DOWNLOAD` (solo `PULL_FROM_URL`), `SEND_TO_USER_INBOX` (Upload API), `PUBLISH_COMPLETE`, `FAILED` (con `fail_reason`).

## Schemas (JSON)

Response de `init` (Direct Post o Upload, mismo formato):
```json
{
  "data": {
    "publish_id": "v_pub_file~v2-1.123456789",
    "upload_url": "https://open-upload.tiktokapis.com/video/?upload_id=67890&upload_token=Xza123"
  },
  "error": {
    "code": "ok",
    "message": "",
    "log_id": "202210112248442CB9319E1FB30C1073F3"
  }
}
```

Response de `status/fetch`:
```json
{
  "data": {
    "status": "FAILED",
    "fail_reason": "picture_size_check_failed",
    "publicaly_available_post_id": [],
    "uploaded_bytes": 10000
  },
  "error": {
    "code": "ok",
    "message": "",
    "log_id": "202210112248442CB9319E1FB30C1073F3"
  }
}
```

## Manejo de errores

| HTTP | `error.code` | Significado |
|---|---|---|
| 400 | `invalid_param` | Ver `message` para el detalle |
| 401 | `access_token_invalid` | Token inválido o expirado |
| 401 | `scope_not_authorized` | Al `access_token` le falta `video.publish`/`video.upload` |
| 403 | `spam_risk_too_many_posts` | Tope diario de posts alcanzado |
| 403 | `spam_risk_user_banned_from_posting` | Usuario baneado de publicar |
| 403 | `reached_active_user_cap` | Cuota diaria de usuarios activos alcanzada |
| 403 | `unaudited_client_can_only_post_to_private_accounts` | App sin auditar - **confirmado en prueba E2E real que esto ocurre incluso con `privacy_level: "SELF_ONLY"`** en Direct Post, con una cuenta de TikTok configurada como pública. La doc oficial sugiere que basta con un `privacy_level` privado, pero en la práctica parece depender de la configuración de privacidad de la propia cuenta del creador (pública vs. privada), no solo del `privacy_level` del post - no confirmado el mecanismo exacto sin cambiar la privacidad de la cuenta de prueba. Upload API (borrador) SÍ funciona sin este problema. Ver `.loop/evidence/tiktok-content-posting-api-e2e.md`. |
| 403 | `url_ownership_unverified` | `PULL_FROM_URL` sin verificar dominio de la URL |
| 403 | `privacy_level_option_mismatch` | El `privacy_level` pedido no está en `privacy_level_options` de ese creador |
| 429 | `rate_limit_exceeded` | 6 requests/minuto en `init`, 20/minuto en `creator_info/query` |
| 5xx | - | Error de servidor, reintentar más tarde |

Para `status/fetch`: `invalid_publish_id`, `token_not_authorized_for_specified_publish_id`, `access_token_invalid`, `scope_not_authorized`, `rate_limit_exceeded`, `internal_error`.

## Ejemplo end-to-end

```bash
# GUARDARRAÍL: "privacy_level": "SELF_ONLY" va literal en el JSON de abajo,
# nunca por variable/parámetro/env var - así ningún override externo puede cambiarlo.

# 0. Consultar qué privacy_level_options tiene realmente habilitadas el creador
curl -s -X POST 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
# Confirmar que "SELF_ONLY" está en privacy_level_options antes de seguir.

# 1. Iniciar Direct Post (o inbox/video/init si es borrador, sin post_info)
VIDEO_SIZE=$(stat -f%z video.mp4 2>/dev/null || stat -c%s video.mp4)
INIT_RESPONSE=$(curl -s -X POST 'https://open.tiktokapis.com/v2/post/publish/video/init/' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json; charset=UTF-8' \
  --data-raw "{
    \"post_info\": {\"title\": \"prueba E2E - Sandbox\", \"privacy_level\": \"SELF_ONLY\", \"disable_comment\": true},
    \"source_info\": {\"source\": \"FILE_UPLOAD\", \"video_size\": ${VIDEO_SIZE}, \"chunk_size\": ${VIDEO_SIZE}, \"total_chunk_count\": 1}
  }")
PUBLISH_ID=$(echo "$INIT_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['publish_id'])")
UPLOAD_URL=$(echo "$INIT_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['upload_url'])")

# 2. Subir el archivo completo (1 chunk en este ejemplo)
curl -s -X PUT "$UPLOAD_URL" \
  -H "Content-Range: bytes 0-$((VIDEO_SIZE-1))/${VIDEO_SIZE}" \
  -H 'Content-Type: video/mp4' \
  --data-binary @video.mp4

# 3. Polling de estado hasta PUBLISH_COMPLETE o FAILED
curl -s -X POST 'https://open.tiktokapis.com/v2/post/publish/status/fetch/' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json; charset=UTF-8' \
  --data-raw "{\"publish_id\": \"${PUBLISH_ID}\"}"
```

## Prueba E2E realizada

**`tested_e2e: true` - 2026-08-28.**

Se agregó el producto "Content Posting API" a la app (habilitando Upload por default y Direct Post manualmente), se agregaron los scopes `video.publish`/`video.upload`, se re-autorizó, y se generó un video sintético de prueba con `ffmpeg` (sin contenido real, solo para probar el flujo técnico).

1. **`creator_info/query`**: confirmó `SELF_ONLY` disponible en `privacy_level_options` antes de intentar publicar nada.
2. **Upload API (borrador)**: flujo completo exitoso - `init` -> subida del archivo (`PUT`, HTTP 201) -> `status/fetch` en polling hasta `SEND_TO_USER_INBOX`. El video quedó como borrador real en el inbox de TikTok de la cuenta de prueba.
3. **Direct Post con `privacy_level: "SELF_ONLY"`**: falló con `unaudited_client_can_only_post_to_private_accounts` - **hallazgo real no anticipado por la doc**, ver "Manejo de errores" arriba. No es un fallo del guardarraíl del proyecto (que exige `SELF_ONLY` de todas formas) - es una restricción de TikTok más estricta de lo documentado, que ni con `SELF_ONLY` deja publicar por Direct Post desde una app sin auditar hacia una cuenta configurada como pública.

Evidencia completa (requests/responses reales, secrets/PII `<REDACTED>`) en `.loop/evidence/tiktok-content-posting-api-e2e.md`. No se intentó cambiar la configuración de privacidad de la cuenta de prueba para forzar el éxito de Direct Post - queda documentado como limitación real, no simulada.
