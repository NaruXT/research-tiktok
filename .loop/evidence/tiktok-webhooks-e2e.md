# Evidencia E2E - tiktok-webhooks

**Fecha:** 2026-08-27/28
**Infraestructura:** servidor Flask local (`.loop/evidence/webhook-receiver.py`, mismo código que el ejemplo del SKILL.md) expuesto vía túnel HTTPS de `ngrok` durante la prueba. Callback URL registrado en el Developer Portal (Webhooks) apuntando al túnel.

## 1. Intento fallido: botón "Test event" del portal

El Developer Portal tiene un botón para mandar un evento de prueba simulado. Al usarlo, devolvió:
```
403 Forbidden
"You don't have access to perform this operation on an app."
```

**Hallazgo**: confirmado con los logs de ngrok que esta request NUNCA llegó a nuestro servidor - el 403 ocurre del lado de TikTok antes de intentar la entrega. La URL de callback sí se había guardado exitosamente antes de este error, así que no es un problema de configuración del callback - parece ser una restricción de permisos propia del botón "Test event" (posiblemente requiere app auditada, o un rol de owner de organización distinto al usado). Agregado a `SKILL.md` § Manejo de errores como hallazgo real, no confirmado el mecanismo exacto.

## 2. Evento real: `authorization.removed`

Se generó un evento real (no simulado) revocando el acceso de la app desde la cuenta de TikTok del usuario (Ajustes > Seguridad > Apps conectadas > quitar acceso) - acción real de deauthorization, distinta a llamar `/v2/oauth/revoke/` del lado del cliente.

Evento recibido en el servidor real (secrets/PII redactados):
```json
{
  "signature_valid": true,
  "body": {
    "client_key": "sbawwjjv22qe4kt26q",
    "event": "authorization.removed",
    "create_time": 1787862385,
    "user_openid": "<REDACTED>",
    "content": "{\"reason\": 1}"
  }
}
```

- **Verificación de firma**: `signature_valid: true` - la implementación de `verify_signature()` del SKILL.md (HMAC-SHA256 con `client_secret`, comparación de tiempo constante) validó correctamente la firma real enviada por TikTok en el header `TikTok-Signature`.
- **Latencia**: el evento llegó unos segundos después de la acción de revocación en la cuenta - entrega rápida, no hubo que esperar reintentos.
- **Formato**: coincide exacto con el schema documentado (`client_key`, `event`, `create_time`, `user_openid`, `content` como string con JSON adentro).
- El servidor respondió `200` (confirmado por el log de ngrok, no incluido acá por tener IPs/headers de la request).

## Registros crudos (no commiteados)

`.loop/evidence/webhook-received.raw.jsonl` (log completo del servidor, incluye `user_openid` real y firma real) - gitignored, solo local.

## Conclusión

`tested_e2e: true` respaldado por un evento real de TikTok, con firma verificada correctamente por la implementación documentada en el SKILL.md. El botón "Test event" del portal no funcionó (hallazgo real, documentado, no bloqueante ya que el camino de evento real sí funciona). Servidor y túnel de prueba dados de baja al terminar - no queda infraestructura corriendo.
