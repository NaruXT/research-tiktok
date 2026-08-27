---
name: tiktok-display-api
description: Consultar el perfil del usuario autorizado y sus videos (lista y por ID) usando la Display API de TikTok, sobre un access token ya obtenido con Login Kit.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/display-api-get-started
  - https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info
  - https://developers.tiktok.com/docs/en/tiktok-api-v2-video-list
  - https://developers.tiktok.com/docs/en/tiktok-api-v2-video-query
scopes:
  - user.info.basic
  - video.list
tested_e2e: true
last_verified: 2026-08-27
---

## Overview

La Display API deja mostrar el perfil de un usuario de TikTok y sus videos en una plataforma externa: perfil básico/extendido (`/v2/user/info/`), lista paginada de videos del usuario autorizado (`/v2/video/list/`), y consulta de videos puntuales por ID (`/v2/video/query/`). Los tres endpoints requieren el `access_token` obtenido vía el flujo OAuth de [`tiktok-auth-setup`](../tiktok-auth-setup/SKILL.md) - esta Skill no repite el login, asume que ya existe un token válido.

## Scopes requeridos

| Scope | Habilita | Notas |
|---|---|---|
| `user.info.basic` | Campos básicos de `/v2/user/info/` (`open_id`, `union_id`, `avatar_url`, `display_name`) | Ya agregado en la app de `tiktok-auth-setup` |
| `video.list` | `/v2/video/list/` y `/v2/video/query/` | Requiere agregarse como scope nuevo en el Developer Portal y volver a autorizar (el `access_token` existente con solo `user.info.basic` no alcanza) |

Campos de `/v2/user/info/` que requieren scopes adicionales no cubiertos acá (documentados en `tiktok-auth-setup` pero no habilitados en la app de prueba): `bio_description`/`profile_deep_link`/`is_verified` necesitan `user.info.profile`; `follower_count`/`following_count`/`likes_count`/`video_count` necesitan `user.info.stats`.

## Endpoints

### 1. Perfil del usuario
```
GET https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name
Authorization: Bearer {ACCESS_TOKEN}
```
`fields` es obligatorio. Campos disponibles (según scope otorgado): `open_id`, `union_id`, `avatar_url`, `avatar_url_100`, `avatar_large_url`, `display_name`, `bio_description`, `profile_deep_link`, `is_verified`, `username`, `follower_count`, `following_count`, `likes_count`, `video_count`.

### 2. Lista de videos del usuario
```
POST https://open.tiktokapis.com/v2/video/list/?fields=cover_image_url,id,title
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "max_count": 20
}
```
`max_count` default 10, máximo 20. Paginación con `cursor` (viene en la response, se reenvía en el próximo request si `has_more` es `true`).

### 3. Consulta de videos por ID
```
POST https://open.tiktokapis.com/v2/video/query/?fields=id,title,cover_image_url
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "filters": {
    "video_ids": ["7077642457847991554", "7080217258529737986"]
  }
}
```
Máximo 20 `video_ids` por request. Campos disponibles: `id`, `create_time`, `cover_image_url`, `share_url`, `video_description`, `duration`, `height`, `width`, `title`, `embed_html`, `embed_link`, `like_count`, `comment_count`, `share_count`, `view_count`, `is_aigc`.

## Schemas (JSON)

Response de `/v2/user/info/`:
```json
{
   "data": {
      "user": {
         "avatar_url": "https://p19-sign.tiktokcdn-us.com/tos-avt-0068-tx/b17f0e4b3a4f4a50993cf72cda8b88b8~c5_168x168.jpeg",
         "open_id": "723f24d7-e717-40f8-a2b6-cb8464cd23b4",
         "union_id": "c9c60f44-a68e-4f5d-84dd-ce22faeb0ba1"
      }
   },
   "error": {
      "code": "ok",
      "message": "",
      "log_id": "20220829194722CBE87ED59D524E727021"
   }
}
```

Response de `/v2/video/list/`:
```json
{
   "data": {
      "videos": [
         {
            "cover_image_url": "https://p16-sign.tiktokcdn-us.com/example.jpeg",
            "id": "12345123451234512345",
            "title": "Video Title"
         }
      ],
      "cursor": 1643332803000,
      "has_more": false
   },
   "error": {
      "code": "ok",
      "message": "",
      "log_id": "20220829194722CBE87ED59D524E727021"
   }
}
```

## Manejo de errores

- Los tres endpoints devuelven siempre un objeto `error` (a diferencia de los endpoints `/v2/oauth/*` que usan `error`/`error_description`/`log_id` a nivel raíz) con `code`, `message`, `log_id`. `code: "ok"` significa éxito - no confundir con ausencia de campo `error`, el campo siempre está presente.
- La doc oficial no lista una tabla exhaustiva de códigos de error específicos para estos tres endpoints (a diferencia del error `invalid_request` de OAuth) - solo confirma el formato del objeto. Cualquier `code` distinto de `"ok"` debe tratarse como fallo y logearse con su `log_id` para soporte.
- **Confirmado en prueba E2E real**: un `video_id` inexistente/inaccesible enviado a `/v2/video/query/` NO produce un error - la response viene con `code: "ok"` y el ID simplemente se omite del array `videos` (queda vacío si es el único ID pedido). Si el caller espera un error por ID inválido, tiene que inferirlo comparando cuántos IDs pidió vs. cuántos volvieron, no confiar en el campo `error`.
- **Confirmado en prueba E2E real**: la response de `/v2/video/query/` incluye `cursor` y `has_more`, aunque la doc oficial solo los muestra en el ejemplo de `/v2/video/list/` - están presentes en ambos endpoints.
- Un `access_token` sin el scope necesario para un campo pedido en `fields` probablemente lo omite de la response en vez de fallar el request completo - no confirmado por doc ni por la prueba E2E (no se llegó a probar este caso específico).
- `max_count` > 20 en `/v2/video/list/` o más de 20 `video_ids` en `/v2/video/query/` - la doc no especifica el comportamiento exacto (¿trunca o rechaza?), no probado en E2E (no se llegó a ese volumen de datos).

## Ejemplo end-to-end

```bash
# Requiere ACCESS_TOKEN ya obtenido/refrescado vía tiktok-auth-setup, con scope video.list agregado

# 1. Perfil del usuario autorizado
curl -s -L -X GET 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# 2. Lista de sus videos (primeros 20)
curl -s -L -X POST 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-raw '{"max_count": 20}'

# 3. Consulta puntual por ID (usando un id devuelto en el paso 2)
curl -s -L -X POST 'https://open.tiktokapis.com/v2/video/query/?fields=id,title,cover_image_url' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-raw '{"filters": {"video_ids": ["VIDEO_ID_DEL_PASO_2"]}}'
```

## Prueba E2E realizada

**`tested_e2e: true` - 2026-08-27.**

Se agregó el scope `video.list` a la app de Sandbox existente (sin repetir verificación de dominio ni el bloqueo de Production/video - ambos ya resueltos para esta app) y se re-autorizó para obtener un `access_token` con `scope=user.info.basic,video.list`. Los 3 endpoints respondieron con el schema documentado:

1. `/v2/user/info/`: perfil real devuelto correctamente.
2. `/v2/video/list/`: respuesta válida (`code: "ok"`) con `videos: []` - la cuenta de prueba no tiene videos públicos, así que no se pudo confirmar el caso "con datos", pero el schema de la respuesta (incluyendo paginación) es correcto.
3. `/v2/video/query/`: probado con un ID inexistente ya que no había IDs reales disponibles - reveló el comportamiento no documentado descrito en "Manejo de errores" (ID inválido se omite en silencio, no genera error).

Evidencia completa (requests/responses reales, secrets y datos personales `<REDACTED>`) en `.loop/evidence/tiktok-display-api-e2e.md`. Cobertura pendiente: el caso "video real encontrado" en `video/list`/`video/query`, bloqueado por falta de contenido de prueba en la cuenta usada, no por un problema de la Skill.
