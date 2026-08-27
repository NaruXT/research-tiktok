---
name: tiktok-commercial-content-api
description: Buscar y consultar datos públicos de anuncios pagos y contenido comercial en TikTok (avisos, anunciantes, alcance), con client access token, actualmente limitado a datos de países de la UE.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/commercial-content-api-getting-started
  - https://developers.tiktok.com/docs/en/commercial-content-api-query-ads
  - https://developers.tiktok.com/docs/en/client-access-token-management
  - https://developers.tiktok.com/products/commercial-content-api
scopes:
  - research.adlib.basic
tested_e2e: false
last_verified: 2026-08-28
---

## ⚠️ Prerrequisito de acceso: misma familia que Research API

Commercial Content API usa el mismo modelo de acceso que Research API (mismo dominio `research.tiktok.com`, mismo flujo de client access token): requiere un proyecto de investigación aprobado por TikTok - la doc confirma "Once your application is approved, a research client will be generated for your project", sin detallar criterios de elegibilidad exactos. **Dato confirmado en `products/commercial-content-api`** (agregado a `tiktok_docs`): "in this phase we are ONLY including data from EU countries, while a researcher/professional who is requesting it can be located in any country" - actualmente los datos disponibles están limitados a **anuncios de países de la UE**, aunque el solicitante puede estar ubicado en cualquier país.

## Overview

Permite buscar avisos pagos/contenido comercial de TikTok por anunciante o palabra clave: fechas de publicación, info de targeting, alcance (`reach`), estado del aviso (`active`/`inactive` - solo estos dos valores confirmados en la doc, ningún tercer estado documentado), y datos del anunciante. Es de solo lectura sobre datos públicos - no requiere autorización de un usuario final.

## Scopes requeridos

**`research.adlib.basic`** - confirmado en la fila "Scopes" de la tabla de headers del endpoint de query. Mismo endpoint de client access token que Research API (`/v2/oauth/token/` con `grant_type=client_credentials`).

## Endpoints

### 1. Obtener client access token
Igual que `tiktok-research-api`: `POST https://open.tiktokapis.com/v2/oauth/token/` con `grant_type=client_credentials`.

### 2. Consultar avisos (ads)
```
POST https://open.tiktokapis.com/v2/research/adlib/ad/query/?fields=ad.id
Authorization: Bearer {CLIENT_ACCESS_TOKEN}
Content-Type: application/json

{
  "filters": {
    "ad_published_date_range": {"min": "20221001", "max": "20230510"},
    "country_code_list": ["IT"],
    "ad_type": "VIDEO",
    "ad_status": "ACTIVE",
    "ad_reach": ["10K-100K", "100K+"],
    "ages": ["25,34", "35,44"],
    "gender": "ALL"
  },
  "search_term": "coffee",
  "max_count": 10
}
```
`ad_published_date_range` es obligatorio y el rango no puede superar 1 año. Filtros opcionales: `country_code_list`, `ad_type` (`VIDEO`/`IMAGES`/`TEXT`), `ad_status` (`ACTIVE`/`INACTIVE`), `ad_reach` (`0-10K`/`10K-100K`/`100K+`/`all`), `ages` (rangos tipo `13,17` hasta `55,100`, o `all`), `gender` (`FEMALE`/`MALE`/`ALL`).

## Schemas (JSON)

```json
{
  "data": {
    "ads": [
      {
        "ad": {
          "id": 1923845247192304,
          "first_shown_date": "20210101",
          "last_shown_date": "20210101",
          "status": "active",
          "videos": [{"url": "https://asdfcdn.com/example/video.mp4"}],
          "image_urls": ["https://asdfcdn.com/example.jpeg"],
          "reach": {"unique_users_seen": "11K"}
        },
        "advertiser": {
          "business_id": 1755645247067185,
          "business_name": "Awe Food Co.",
          "paid_by": "Awe Co."
        }
      }
    ],
    "has_more": true,
    "search_id": "2837438294054038"
  }
}
```

## Manejo de errores

Formato `ErrorStructV2`: `code`, `message`, `log_id`, y (a diferencia de otros módulos) también `http_status_code` explícito en el propio objeto de error:
```json
{"code": "ok", "message": "", "log_id": "202304280326050102231031430C7E754E", "http_status_code": 200}
```
No hay tabla de códigos de error específicos más allá del formato genérico documentada en esta pasada.

## Ejemplo end-to-end

```bash
# Requiere client_key/client_secret de un proyecto aprobado (misma familia que Research API)

TOKEN_RESPONSE=$(curl -s --location --request POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_key=${RESEARCH_CLIENT_KEY}" \
  --data-urlencode "client_secret=${RESEARCH_CLIENT_SECRET}" \
  --data-urlencode 'grant_type=client_credentials')
CLIENT_ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST 'https://open.tiktokapis.com/v2/research/adlib/ad/query/?fields=ad.id,ad.status,advertiser.business_name' \
  -H "Authorization: Bearer ${CLIENT_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "filters": {"ad_published_date_range": {"min": "20260101", "max": "20260601"}, "country_code_list": ["DE"]},
    "search_term": "coffee", "max_count": 10
  }'
```

## Prueba E2E realizada

**`tested_e2e: false` - misma categoría de bloqueo que Research API: aprobación externa de TikTok.**

Requiere un proyecto de investigación aprobado (mismo modelo de acceso que `tiktok-research-api`, posiblemente el mismo proyecto sirva para ambos - no confirmado sin acceso real). No se inició el proceso de aplicación en nombre del usuario. Si se aprueba en el futuro, completar con las mismas llamadas reales y evidencia en `.loop/evidence/tiktok-commercial-content-api-e2e.md`.
