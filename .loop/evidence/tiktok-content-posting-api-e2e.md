# Evidencia E2E - tiktok-content-posting-api

**Fecha:** 2026-08-27/28
**App:** misma app Sandbox reusada de iteraciones anteriores, con producto "Content Posting API" agregado (Upload habilitado por default, Direct Post habilitado manualmente), scopes ampliados a `user.info.basic,video.list,video.publish,video.upload` (re-autorización).
**Archivo de prueba:** video sintético generado con `ffmpeg` (720x1280, 5s, color sólido + tono), sin contenido real - no importa para probar el flujo técnico.

## 1. Re-autorización con los 4 scopes

Igual que en Iteración 2: agregar `video.publish`/`video.upload` requirió primero agregar el producto "Content Posting API" a la app (los scopes no aparecían hasta hacerlo) - ya documentado en el SKILL.md como parte del checkpoint humano. Intercambio de código exitoso, `"scope": "user.info.basic,video.publish,video.upload,video.list"` confirmado.

## 2. `creator_info/query`

Response real (datos personales redactados):
```json
{
    "data": {
        "max_video_post_duration_sec": 3600,
        "privacy_level_options": ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
        "stitch_disabled": false,
        "comment_disabled": false,
        "creator_avatar_url": "<REDACTED>",
        "creator_nickname": "<REDACTED>",
        "creator_username": "<REDACTED>",
        "duet_disabled": false
    },
    "error": { "code": "ok", "message": "", "log_id": "20260828035612A3942F2F64B39F7F0B89" }
}
```
`SELF_ONLY` confirmado disponible antes de intentar publicar nada.

## 3. Upload API (borrador) - ÉXITO end-to-end

1. `inbox/video/init` -> `publish_id`/`upload_url` reales obtenidos, `code: "ok"`.
2. `PUT` del archivo completo (1 chunk, 55009 bytes) a `upload_url` -> HTTP 201.
3. `status/fetch` (polling): `PROCESSING_UPLOAD` -> `SEND_TO_USER_INBOX` (~5-10s).

El video quedó como borrador en el inbox de TikTok de la cuenta de prueba, para completar manualmente - exactamente el comportamiento documentado. Flujo completo probado con éxito contra la API real.

## 4. Direct Post con `privacy_level: "SELF_ONLY"` - hallazgo real no documentado

`video/init` (Direct Post) con `privacy_level: "SELF_ONLY"` (literal en el JSON, guardarraíl respetado) devolvió:
```json
{
    "error": {
        "code": "unaudited_client_can_only_post_to_private_accounts",
        "message": "Please review our integration guidelines at https://developers.tiktok.com/doc/content-sharing-guidelines/",
        "log_id": "2026082803570400EF78723626F290068A"
    }
}
```

**Hallazgo**: la doc oficial describe este error como "unaudited clients restricted to private accounts", dando a entender que se resuelve con `privacy_level: SELF_ONLY`. En la práctica, con la cuenta de prueba (una cuenta de TikTok normal, configurada como pública), el error persiste **incluso con `SELF_ONLY`**. La restricción real de apps sin auditar parece ser sobre la configuración de privacidad de la **cuenta del creador** (pública vs. privada), no sobre el `privacy_level` del post individual - no confirmado 100% sin cambiar la configuración de la cuenta de prueba a privada (no se hizo, es un cambio real en la cuenta del usuario fuera del alcance de esta prueba). Ya agregado a `SKILL.md` § Manejo de errores como hallazgo real, con la salvedad de que no está 100% confirmado el mecanismo exacto.

Esto no invalida el guardarraíl de irreversibilidad del proyecto (seguimos sin poder publicar público desde el loop bajo ninguna circunstancia) - al contrario, muestra que en la práctica Direct Post es aún más restringido de lo que el guardarraíl exige por sí solo.

## Registros crudos (no commiteados)

`.loop/evidence/posting-token.raw.json`, `creator-info.raw.json`, `upload-init.raw.json`, `upload-status.raw.json`, `directpost-init.raw.json`, `test-video.mp4` - todos gitignored.

## Conclusión

`tested_e2e: true` respaldado por: Upload API con éxito end-to-end completo (init -> subida -> estado final), y Direct Post probado contra la API real (reveló una restricción real más estricta de lo documentado, no un fallo del guardarraíl del proyecto).
