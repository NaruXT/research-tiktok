---
name: tiktok-research-api
description: Consultar datos públicos de TikTok (videos, comentarios, info de cuentas) para investigación académica/vetted, usando un client access token (no OAuth de usuario).
tiktok_docs:
  - https://developers.tiktok.com/docs/en/research-api-get-started
  - https://developers.tiktok.com/docs/en/client-access-token-management
  - https://developers.tiktok.com/docs/en/research-api-specs-query-videos
scopes: []
tested_e2e: false
last_verified: 2026-08-28
---

## ⚠️ Prerrequisito de acceso distinto a todos los módulos anteriores

Research API **no se habilita agregando un producto/scope a una app normal de Sandbox** - requiere una aplicación separada como "investigador vetted" (`/application/research-api`), sujeta a aprobación de TikTok, típicamente atada a afiliación académica/institucional. Sin esa aprobación no existe un `client_key`/`client_secret` de Research API para probar nada de este módulo. Esto es estructuralmente distinto a los checkpoints anteriores (un click de portal, o desplegar un servidor) - es un proceso de aprobación externo con criterios de elegibilidad, no algo que se resuelva en la misma sesión.

## Overview

Permite consultar datos públicos de TikTok (no requiere autorización de un usuario final vía OAuth) para fines de investigación: videos por criterios de búsqueda, comentarios de un video, e info pública de cuentas. La autenticación es **client credentials**, no Authorization Code como Login Kit - no hay `redirect_uri` ni consentimiento de usuario, es un token a nivel de aplicación/proyecto de investigación aprobado.

## Scopes requeridos

Ninguno documentado como scope de OAuth de usuario - el acceso se controla por la aprobación del proyecto de investigación en sí, no por scopes que un usuario autoriza.

## Endpoints

### 1. Obtener client access token (autenticación)
```
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

client_key=CLIENT_KEY
client_secret=CLIENT_SECRET
grant_type=client_credentials
```
Mismo endpoint que Login Kit, pero `grant_type=client_credentials` en vez de `authorization_code`. Token válido por **2 horas (7200s)**, sin `refresh_token` (se vuelve a pedir uno nuevo cuando expira, no se refresca).

### 2. Consultar videos
```
POST https://open.tiktokapis.com/v2/research/video/query/?fields=id,video_description,create_time,region_code,share_count,view_count,like_count,comment_count,hashtag_names,username,video_duration
Authorization: Bearer {CLIENT_ACCESS_TOKEN}
Content-Type: application/json

{
  "query": {
    "and": [{"operation": "IN", "field_name": "region_code", "field_values": ["JP", "US"]}],
    "not": [{"operation": "EQ", "field_name": "video_length", "field_values": ["SHORT"]}]
  },
  "start_date": "20230101",
  "end_date": "20230115",
  "max_count": 100,
  "cursor": 0
}
```
`field_name` disponibles para condiciones: `create_date`, `username`, `region_code`, `video_id`, `hashtag_name`, `keyword`, `music_id`, `effect_id`, `video_length` (`SHORT`/`MID`/`LONG`/`EXTRA_LONG`), `view_count`, `comment_count`. Operadores: `IN`, `EQ`, `GT`, `GTE`, `LT`, `LTE`. `start_date`/`end_date` son obligatorios (formato `YYYYMMDD`), rango de búsqueda acotado.

### 3. Consultar comentarios de un video
```
POST https://open.tiktokapis.com/v2/research/video/comment/list/?fields=id,text
Authorization: Bearer {CLIENT_ACCESS_TOKEN}
```
Pide `video_id` **o** `comment_id` (no ambos a la vez) - `video_id` trae los comentarios de ese video, `comment_id` trae las respuestas a ese comentario puntual.

### 4. Consultar info de cuenta pública
```
POST https://open.tiktokapis.com/v2/research/user/info/?fields=...
Authorization: Bearer {CLIENT_ACCESS_TOKEN}
```
Consulta por `username`, no requiere que el usuario haya autorizado nada (es data pública).

## Schemas (JSON)

Response de `client_access_token`:
```json
{
  "access_token": "clt.example12345Example12345Example",
  "expires_in": 7200,
  "token_type": "Bearer"
}
```

Response de `video/query`:
```json
{
  "data": {
    "videos": [
      {
        "id": 702874395068494965,
        "create_time": 1633823999,
        "username": "creator_name",
        "region_code": "CA",
        "video_description": "video title text",
        "music_id": 703847506349838790,
        "like_count": 1050,
        "comment_count": 2,
        "share_count": 0,
        "view_count": 1050,
        "hashtag_names": ["hashtag1", "hashtag2"],
        "video_duration": 15
      }
    ],
    "cursor": 100,
    "search_id": "7201388525814961198",
    "has_more": true
  },
  "error": { "code": "ok", "message": "", "log_id": "20230113024658F0D7C5D6CA3A9B79C5B9" }
}
```
`search_id` hay que reenviarlo en requests de paginación siguientes (junto con `cursor`) para mantener consistencia del resultado paginado - no confirmado el comportamiento exacto si se omite, no hay evidencia E2E todavía.

## Manejo de errores

- Formato uniforme `error.code`/`error.message`/`error.log_id` en las llamadas de `/v2/research/*`, igual que Content Posting/Display API.
- El endpoint de `client_access_token` usa el formato distinto de OAuth (`error`/`error_description`/`log_id` a nivel raíz, sin objeto anidado) - ejemplo real de la doc: `{"error": "invalid_request", "error_description": "Client secret is missed in request.", "log_id": "..."}`. Ojo, es el mismo endpoint `/v2/oauth/token/` que Login Kit, así que reusa su formato de error, no el de `/v2/research/*`.
- No hay tabla de códigos de error específicos de `/v2/research/*` documentada más allá del formato genérico.

## Ejemplo end-to-end

```bash
# Requiere client_key/client_secret de un proyecto de investigación APROBADO
# (no el mismo tipo de app Sandbox usado en los módulos anteriores)

# 1. Obtener client access token
TOKEN_RESPONSE=$(curl -s --location --request POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_key=${RESEARCH_CLIENT_KEY}" \
  --data-urlencode "client_secret=${RESEARCH_CLIENT_SECRET}" \
  --data-urlencode 'grant_type=client_credentials')
CLIENT_ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

# 2. Consultar videos por criterios
curl -s -X POST 'https://open.tiktokapis.com/v2/research/video/query/?fields=id,username,region_code,like_count,view_count' \
  -H "Authorization: Bearer ${CLIENT_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "query": {"and": [{"operation": "EQ", "field_name": "region_code", "field_values": ["US"]}]},
    "start_date": "20260101", "end_date": "20260131", "max_count": 20
  }'
```

## Prueba E2E realizada

**`tested_e2e: false` - bloqueado por un proceso de aprobación externo, categoría de prerrequisito nueva.**

A diferencia de todos los módulos anteriores (donde el checkpoint era una acción puntual del usuario - un click, agregar un scope, desplegar un túnel temporal), este requiere que TikTok apruebe una aplicación de investigador vetted, un proceso que puede tomar tiempo, tener requisitos de elegibilidad (afiliación académica/institucional) fuera del control de esta sesión, y no garantiza aprobación. No se intentó iniciar ese proceso de aplicación en nombre del usuario - es una decisión que le corresponde a él, no algo para automatizar u omitir.

Si en el futuro se aprueba un proyecto de investigación, completar esta sección con las mismas llamadas reales que los módulos anteriores (token -> query -> evidencia redactada en `.loop/evidence/tiktok-research-api-e2e.md`).
