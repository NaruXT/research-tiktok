---
name: tiktok-data-portability-api
description: Iniciar, monitorear, cancelar y descargar una exportación de los datos de un usuario (perfil, videos, actividad, mensajes directos) en su nombre, vía Login Kit + un scope de portability.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/data-portability-api-get-started
  - https://developers.tiktok.com/docs/en/data-portability-api-add-data-request
  - https://developers.tiktok.com/docs/en/data-portability-api-check-status-of-data-request
  - https://developers.tiktok.com/docs/en/data-portability-api-application-guidelines
scopes:
  - portability.postsandprofile.single
  - portability.activity.single
  - portability.directmessages.single
  - portability.all.single
tested_e2e: false
last_verified: 2026-08-28
---

## ⚠️ Prerrequisito de acceso: dos aprobaciones separadas

Igual que Research API, este módulo **no se habilita solo agregando un scope a la app de Sandbox usada en los módulos anteriores** - requiere una aplicación y aprobación específica para Data Portability API, evaluada contra cumplimiento de GDPR/protección de datos y justificación del caso de uso, **además** de la aprobación normal de Login Kit (que ya tenemos de Iteración 1, pero eso no alcanza). Es un proceso de review de TikTok, no un checkpoint resoluble con un click en el Developer Portal.

## Overview

Data Portability API deja pedir, en nombre de un usuario que ya autorizó vía Login Kit, una exportación de sus propios datos de TikTok (perfil+videos, actividad, mensajes directos, o todo junto) en formato texto o JSON. El flujo es: pedir el request (`add`) -> el usuario recibe una notificación en TikTok para confirmar/completar el consentimiento del request -> monitorear estado (`check`) -> cuando está `downloading`, descargar dentro de una ventana de 4 días antes de que expire.

## Scopes requeridos

| Scope | Habilita exportar |
|---|---|
| `portability.postsandprofile.single` / `.ongoing` | `video`, `profile` |
| `portability.activity.single` / `.ongoing` | `activity` |
| `portability.directmessages.single` / `.ongoing` | `direct_message` |
| `portability.all.single` / `.ongoing` | `all_data` (todo junto) |

`.single` = un pedido puntual, `.ongoing` = pedidos recurrentes autorizados una vez.

## Endpoints

### 1. Iniciar un pedido de exportación
```
POST https://open.tiktokapis.com/v2/user/data/add/?fields=request_id
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "data_format": "text",
  "category_selection_list": ["profile", "direct_message"]
}
```
`data_format`: `text` o `json`. `category_selection_list`: `all_data`, `video`, `profile`, `activity`, `direct_message` - cada uno requiere el scope correspondiente de la tabla de arriba, otorgado en la autorización OAuth previa (Login Kit).

### 2. Consultar estado
```
POST https://open.tiktokapis.com/v2/user/data/check/
Authorization: Bearer {ACCESS_TOKEN}

{ "request_id": 123451234512345 }
```
`status` puede ser `pending` (recolectando datos), `downloading` (listo para descargar), `expired` (venció la ventana de 4 días), `cancelled`.

### 3. Cancelar un pedido
Endpoint documentado (`data-portability-api-cancel-data-request`) pero no se extrajo el detalle técnico completo en esta pasada - a completar si hace falta usarlo.

### 4. Descargar
Endpoint documentado (`data-portability-api-download`) - la data queda descargable solo durante **4 días** desde que `status` pasa a `downloading`; después expira y no se puede volver a pedir sin iniciar un nuevo request.

## Schemas (JSON)

Response de `add`:
```json
{
  "data": { "request_id": 123451234512345 },
  "error": { "code": "ok", "message": "", "log_id": "1010xyz10101asdf1010101010100a12abc24" }
}
```

Response de `check`:
```json
{
  "data": {
    "apply_time": 1703186989,
    "category_selection_list": ["profile", "video", "direct_messages"],
    "collect_time": 1703187862,
    "data_format": "text",
    "request_id": 123451234512345,
    "status": "downloading"
  },
  "error": { "code": "ok", "message": "", "log_id": "2023242526272829300000000000001111" }
}
```

## Manejo de errores

- Formato uniforme `error.code`/`error.message`/`error.log_id` (`ErrorStructV2`), igual que Display API/Content Posting/Research API - no el formato raíz de OAuth.
- `status: "expired"` en `check` significa que la ventana de 4 días para descargar venció - hay que iniciar un `add` nuevo, no hay forma de "revivir" el request expirado.
- No hay tabla de códigos de error específicos más allá del formato genérico - a confirmar en una prueba E2E futura.

## Ejemplo end-to-end

```bash
# Requiere access_token con el scope de portability correspondiente (ya obtenido vía Login Kit)

# 1. Iniciar el pedido
ADD_RESPONSE=$(curl -s --location 'https://open.tiktokapis.com/v2/user/data/add/?fields=request_id' \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  --data '{"data_format": "text", "category_selection_list": ["profile"]}')
REQUEST_ID=$(echo "$ADD_RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['request_id'])")

# 2. El usuario confirma el pedido dentro de la app de TikTok (fuera de esta API)

# 3. Sondear estado hasta "downloading" (o "expired"/"cancelled")
curl -s --location 'https://open.tiktokapis.com/v2/user/data/check/' \
  --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  --header 'Content-Type: application/json' \
  --data "{\"request_id\": ${REQUEST_ID}}"

# 4. Descargar dentro de la ventana de 4 días (endpoint de download no detallado todavía)
```

## Prueba E2E realizada

**`tested_e2e: false` - bloqueado por aprobación externa, misma categoría que Research API.**

Requiere que TikTok apruebe una aplicación específica para Data Portability API (evaluación de cumplimiento GDPR/protección de datos), además del scope correspondiente autorizado por un usuario real. No se inició ese proceso de aplicación en nombre del usuario - es una decisión suya, con implicancias de compliance que exceden el alcance de "probar una Skill". Si se aprueba en el futuro, completar con las mismas llamadas reales (`add` -> `check` en loop hasta `downloading` -> `download`) y evidencia en `.loop/evidence/tiktok-data-portability-api-e2e.md`.
