# Evidencia E2E - tiktok-display-api

**Fecha:** 2026-08-27
**App:** misma app Sandbox de `tiktok-auth-setup`, scope ampliado a `user.info.basic,video.list` (re-autorización requerida - el token anterior con solo `user.info.basic` no alcanzaba).

## 1. Re-autorización con scope ampliado

Se agregó el scope `video.list` a la app existente en el Developer Portal (Scopes -> Add scopes) - no requirió repetir verificación de dominio ni registro, solo agregar el scope y volver a pasar por `/v2/auth/authorize/` con `scope=user.info.basic,video.list`. Intercambio de código exitoso, response con `"scope": "user.info.basic,video.list"` confirmando ambos scopes otorgados.

## 2. `GET /v2/user/info/`

Request: `fields=open_id,union_id,avatar_url,display_name`.

Response real (secrets y datos personales redactados):
```json
{
    "data": {
        "user": {
            "avatar_url": "<REDACTED>",
            "display_name": "<REDACTED>",
            "open_id": "<REDACTED>",
            "union_id": "<REDACTED>"
        }
    },
    "error": {
        "code": "ok",
        "message": "",
        "log_id": "20260828021552B9FA8EF37AD50397F38F"
    }
}
```
Coincide con el schema documentado en `SKILL.md` (agrega `display_name`, que sí estaba pedido en `fields` y sí se devolvió - consistente con que `user.info.basic` lo cubre).

## 3. `POST /v2/video/list/`

Request: `max_count=20`.

Response real:
```json
{
    "data": {
        "cursor": 0,
        "has_more": false,
        "videos": []
    },
    "error": {
        "code": "ok",
        "message": "",
        "log_id": "20260828021553B9B16EDC3EA4D6951794"
    }
}
```
La cuenta de prueba no tiene videos públicos - `videos: []` es una respuesta válida (`code: "ok"`), no un error. No se pudo probar con datos reales de video, pero el endpoint respondió con el schema exacto documentado (`cursor`, `has_more`, `videos`).

## 4. `POST /v2/video/query/` (hallazgo no documentado en la doc oficial)

Sin videos reales disponibles para probar el caso feliz, se probó con un `video_id` inexistente (`7000000000000000000`) para observar el manejo de errores:

```json
{
    "data": {
        "cursor": 0,
        "has_more": false,
        "videos": []
    },
    "error": {
        "code": "ok",
        "message": "",
        "log_id": "20260828021607B9B16EDC3EA4D6951B80"
    }
}
```

**Hallazgo no documentado**: un `video_id` inexistente/inaccesible no produce un error - la API devuelve `code: "ok"` con el ID simplemente omitido del array `videos`. También se observó que la response de `/v2/video/query/` incluye `cursor` y `has_more`, campos que la doc oficial solo mostraba en el ejemplo de `/v2/video/list/` y no en el de `/v2/video/query/`. Esto ya se agregó a la sección "Manejo de errores" de `SKILL.md`.

## Registros crudos (no commiteados)

`.loop/evidence/display-api-token.raw.json`, `display-userinfo.raw.json`, `display-videolist.raw.json`, `display-videoquery.raw.json` - gitignored, solo locales.

## Conclusión

Los 3 endpoints de Display API responden con el schema documentado usando un `access_token` real con scope `video.list`. La cobertura del caso "video real encontrado" queda pendiente (la cuenta de prueba no tiene contenido público) - no es un fallo, es una limitación de datos de la cuenta de prueba, documentada explícitamente en vez de simulada.
