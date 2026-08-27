---
name: tiktok-webhooks
description: Recibir y verificar eventos en tiempo real de TikTok (deauthorization, fallos/éxitos de publicación, Data Portability) vía un callback URL registrado en la app.
tiktok_docs:
  - https://developers.tiktok.com/docs/en/webhooks-overview
  - https://developers.tiktok.com/docs/en/webhooks-events
  - https://developers.tiktok.com/docs/en/webhooks-verification
scopes: []
tested_e2e: true
last_verified: 2026-08-28
---

## Overview

TikTok manda notificaciones HTTP POST a un `callback URL` registrado en el Developer Portal cuando ocurren ciertos eventos (deauthorization del usuario, resultado de una publicación iniciada por Content Posting API, datos de Data Portability listos). No es un endpoint que se llame - es un servidor propio (HTTPS, público) que hay que exponer para que TikTok le pegue. Por defecto, al configurar un callback URL en la app, se suscribe a todos los eventos disponibles (no hay opt-in granular documentado por evento).

## Scopes requeridos

Ninguno documentado - los Webhooks se configuran a nivel de app (callback URL en el Developer Portal), no dependen de un scope de OAuth de usuario.

## Endpoints

Este módulo no tiene un endpoint de TikTok para "llamar" - es al revés, hay que exponer un servidor propio:

### 1. Registrar el callback URL
En el Developer Portal, al crear la app o editándola después de tener el `client_key` - no hay un endpoint HTTP documentado para hacerlo programáticamente, es un campo del formulario de la app (igual que el `redirect_uri` de Login Kit).

### 2. Recibir eventos (servidor propio)
```
POST {tu callback URL}
Content-Type: application/json
TikTok-Signature: t={timestamp},s={firma_hmac_sha256_hex}

{payload del evento, ver Schemas}
```
Tu servidor debe: (a) requerir HTTPS, (b) verificar la firma (ver Manejo de errores), (c) responder inmediatamente con HTTP 200 para confirmar recepción, antes de hacer cualquier procesamiento pesado (procesar async si hace falta).

## Schemas (JSON)

Formato común a todos los eventos: `client_key`, `event`, `create_time` (unix timestamp), `user_openid` (no presente en todos), `content` (string con JSON serializado adentro, no un objeto anidado - hay que parsear `content` como JSON aparte).

**`authorization.removed`** - el usuario desautorizó la app (el `access_token` ya fue revocado del lado de TikTok cuando llega este evento):
```json
{
    "client_key": "bwo2m45353a6k85",
    "event": "authorization.removed",
    "create_time": 1615338610,
    "user_openid": "act.example12345Example12345Example",
    "content": "{\"reason\": 1 }"
}
```

**`video.upload.failed`** - falló la subida de un video iniciado por la API:
```json
{
    "client_key": "bwo2m45353a6k85",
    "event": "video.upload.failed",
    "create_time": 1615338610,
    "user_openid": "act.example12345Example12345Example",
    "content": "{\"share_id\":\"video.6974245311675353080.VDCxrcMJ\"}"
}
```

**`video.publish.completed`** - el usuario terminó de publicar un video que había llegado como borrador (Upload API):
```json
{
    "client_key": "bwo2m45353a6k85",
    "event": "video.publish.completed",
    "create_time": 1615338610,
    "user_openid": "act.example12345Example12345Example",
    "content": "{\"share_id\":\"video.6974245311675353080.VDCxrcMJ\"}"
}
```

**`portability.download.ready`** - un request de Data Portability API entró en estado descargable:
```json
{
    "client_key": "developer_client_key",
    "event": "portability.download.ready",
    "create_time": 1615338610,
    "content": "{\"request_id\":123123123123123}"
}
```

## Manejo de errores

- **Verificación de firma** (fuertemente recomendada por la doc, no aplicarla deja el endpoint abierto a spoofing/replay): el header `TikTok-Signature` viene como `t={timestamp},s={firma}`. La firma se calcula como `HMAC-SHA256(client_secret, "{timestamp}.{body_json_crudo}")` - el `signed_payload` es el timestamp concatenado con `.` y el body crudo tal cual llegó (no un JSON re-serializado, tiene que ser el string exacto recibido, antes de parsear). Comparar el hex resultante contra `s` con comparación de tiempo constante (no `==` directo, para evitar timing attacks - no especificado por la doc pero es práctica estándar de HMAC).
- Si el timestamp `t` es muy viejo, es señal de replay attack - la doc dice "determinar si la diferencia de tiempo es tolerable" sin dar un valor concreto; usar un margen razonable (ej. 5 minutos) y rechazar fuera de eso.
- Responder 200 rápido, siempre - si el procesamiento del evento falla después de responder 200, hay que loguearlo y reintentar por cuenta propia (TikTok no lo reintentará, ya recibió el 200).
- Si el servidor no responde a tiempo o responde con error, TikTok reintenta con backoff exponencial hasta por **72 horas**, después descarta el evento. Entrega "al menos una vez" - el mismo evento puede llegar duplicado, el procesamiento debe ser idempotente (ej. dedupe por `event`+`create_time`+contenido, o por un ID si el evento lo trae).
- No hay tabla de códigos de error documentada para este módulo (no es un endpoint que TikTok exponga para llamar, es al revés) - los "errores" relevantes son de la entrega (timeout/reintento) y de la verificación de firma (rechazar si no coincide, no del lado de TikTok).
- **Confirmado en prueba E2E real**: el botón "Test event" del Developer Portal (para simular un evento sin generarlo de verdad) devuelve `403 Forbidden` ("You don't have access to perform this operation on an app") incluso con el callback URL guardado correctamente. Confirmado con logs de ngrok que la request nunca llega al callback - el error es del lado de TikTok, antes de la entrega. Mecanismo exacto no confirmado (posible restricción de app sin auditar, o de rol de organización). Un evento **real** (no simulado) sí se entrega sin problema - ver Prueba E2E realizada.

## Ejemplo end-to-end

```python
# Servidor mínimo (Flask) que recibe y verifica un webhook de TikTok.
import hmac, hashlib, time, json
from flask import Flask, request, abort

app = Flask(__name__)
CLIENT_SECRET = "..."  # el mismo client_secret de la app, nunca hardcodeado en producción

def verify_signature(raw_body: bytes, signature_header: str) -> bool:
    parts = dict(p.split("=", 1) for p in signature_header.split(","))
    timestamp, sig = parts["t"], parts["s"]

    if abs(time.time() - int(timestamp)) > 300:  # 5 min de margen
        return False

    signed_payload = f"{timestamp}.{raw_body.decode()}"
    expected = hmac.new(CLIENT_SECRET.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)

@app.route("/tiktok/webhook", methods=["POST"])
def tiktok_webhook():
    signature = request.headers.get("TikTok-Signature", "")
    if not verify_signature(request.get_data(), signature):
        abort(401)

    event = request.get_json()
    content = json.loads(event["content"])  # content viene como string, parsear aparte

    if event["event"] == "authorization.removed":
        # el access_token de este user_openid ya está revocado del lado de TikTok
        pass
    elif event["event"] == "video.publish.completed":
        pass
    # ... etc, idempotente por (event, create_time, content)

    return "", 200  # SIEMPRE responder rápido, antes de procesamiento pesado
```

## Prueba E2E realizada

**`tested_e2e: true` - 2026-08-28.**

Infraestructura: servidor Flask local (el mismo código de "Ejemplo end-to-end") expuesto vía túnel HTTPS de `ngrok`, registrado como callback URL en el Developer Portal. Dado de baja al terminar la prueba - no queda nada corriendo persistente.

1. El botón "Test event" del portal falló con `403 Forbidden` sin que la request llegara siquiera a nuestro servidor (confirmado con logs de ngrok) - hallazgo real, documentado en "Manejo de errores".
2. Se generó un evento **real**: revocar el acceso de la app desde la cuenta de TikTok del usuario (Ajustes > Seguridad > Apps conectadas) disparó `authorization.removed`, entregado al callback en segundos, con firma válida verificada correctamente por la implementación del ejemplo de código (`signature_valid: true`).

Evidencia completa (evento real con PII `<REDACTED>`) en `.loop/evidence/tiktok-webhooks-e2e.md`. Cobertura pendiente (no bloqueante): los otros 3 tipos de evento (`video.upload.failed`, `video.publish.completed`, `portability.download.ready`) no se probaron en vivo - requerirían disparar esos flujos específicos con el callback activo, no se hizo en este ciclo. El mecanismo de verificación de firma y el formato del evento SÍ quedaron confirmados contra un evento real, que es lo más riesgoso de que estuviera mal documentado.
