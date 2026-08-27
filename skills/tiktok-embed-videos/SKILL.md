---
name: tiktok-embed-videos
description: Convertir una URL de video de TikTok en markup HTML embebible (oEmbed estándar), sin autenticación ni scopes - el único módulo del proyecto que es 100% público.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/embed-videos
scopes: []
tested_e2e: true
last_verified: 2026-08-28
---

## Overview

Implementa el estándar [oEmbed](https://oembed.com/) para convertir una URL pública de un video de TikTok en markup HTML embebible (un `<blockquote>` + script), con metadata del video (título, autor, thumbnail). **Es el único módulo de todo este proyecto que no requiere ningún tipo de autenticación, app registrada, ni scope** - es un endpoint público sobre `www.tiktok.com`, no sobre `open.tiktokapis.com` como el resto.

## Scopes requeridos

Ninguno. Sin `client_key`, sin `access_token`, sin app registrada - cualquiera puede llamarlo.

## Endpoints

### 1. oEmbed
```
GET https://www.tiktok.com/oembed?url={URL_DEL_VIDEO}
```
`url` (requerido): la URL pública completa de un video de TikTok, ej. `https://www.tiktok.com/@usuario/video/1234567890123456789`.

## Schemas (JSON)

Response real (probado en vivo, ver Prueba E2E realizada):
```json
{
  "version": "1.0",
  "type": "video",
  "title": "Scramble up ur name & I'll try to guess it #foryoupage #petsoftiktok #aesthetic",
  "author_url": "https://www.tiktok.com/@scout2015",
  "author_name": "Scout, Suki & Stella",
  "author_unique_id": "scout2015",
  "width": "100%",
  "height": "100%",
  "html": "<blockquote class=\"tiktok-embed\" cite=\"...\" data-video-id=\"6718335390845095173\" data-embed-from=\"oembed\" style=\"max-width:605px; min-width:325px;\"> ... </blockquote> <script async src=\"https://www.tiktok.com/embed.js\"></script>",
  "thumbnail_width": 576,
  "thumbnail_height": 1024,
  "thumbnail_url": "https://p16-common-sign.tiktokcdn.com/...",
  "provider_url": "https://www.tiktok.com",
  "provider_name": "TikTok",
  "embed_product_id": "6718335390845095173",
  "embed_type": "video"
}
```
Nota: la response real trae más campos que el ejemplo de la doc oficial (`author_unique_id`, `embed_product_id`, `embed_type`) - confirmado en la prueba E2E, no inventado, la API evolucionó desde que se escribió la doc.

## Manejo de errores

- **Confirmado en prueba E2E real**: una URL de video inexistente/inválida devuelve `HTTP 400` con body `{"message":"Something went wrong","code":400}` - formato de error distinto al resto del proyecto (no tiene `log_id` ni sigue el patrón `error.code`/`error.message` de las APIs de `open.tiktokapis.com`), consistente con que este es un endpoint completamente aparte (dominio `www.tiktok.com`, no la plataforma de developers).
- No hay tabla de códigos de error adicionales documentada más allá de esto.

## Ejemplo end-to-end

```bash
# Sin credenciales de ningún tipo
curl -s "https://www.tiktok.com/oembed?url=https://www.tiktok.com/@usuario/video/1234567890123456789"
```

## Prueba E2E realizada

**`tested_e2e: true` - 2026-08-28. Único módulo probado sin ningún prerrequisito (no necesita app, ni scope, ni aprobación).**

1. Request real con una URL de video pública conocida: devolvió `HTTP 200` con el JSON completo documentado arriba (metadata real, no simulada - título, autor, thumbnail, HTML de embed).
2. Request real con una URL inválida: devolvió `HTTP 400` con el error documentado en "Manejo de errores".

No hace falta evidencia separada en `.loop/evidence/` con redacción de secrets - no hay secrets involucrados, y las responses ya están en este mismo archivo (son datos públicos del video de ejemplo usado en la propia doc oficial de TikTok).
