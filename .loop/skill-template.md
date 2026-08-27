# Plantilla canónica de Skill TikTok

Toda Skill nueva en `skills/tiktok-<modulo>/SKILL.md` debe seguir esta estructura.
`verify.sh` chequea contra este formato exacto - si se cambia acá, hay que actualizar `verify.sh` también.

## Frontmatter (YAML)

```yaml
---
name: tiktok-<modulo>
description: <una línea, específica, dice qué permite hacer esta Skill>
tiktok_docs:
  - <url completa a la página oficial fuente 1>
  - <url completa a la página oficial fuente 2>
scopes:
  - <scope.necesario.uno>
  - <scope.necesario.dos>
tested_e2e: true|false
last_verified: <YYYY-MM-DD>
---
```

## Secciones requeridas (en este orden, como headers `##`)

1. `## Overview` - qué resuelve el módulo, en 2-4 oraciones.
2. `## Scopes requeridos` - tabla o lista: scope, para qué sirve, si requiere app review.
3. `## Endpoints` - por cada endpoint: método HTTP, URL completa, headers de auth, params clave.
4. `## Schemas (JSON)` - al menos un bloque ```json de request y uno de response reales, deben parsear sin error.
5. `## Manejo de errores` - códigos de error reales documentados por TikTok (no inventados), qué significan, cómo reintentar si aplica.
6. `## Ejemplo end-to-end` - snippet de código completo y ejecutable (curl o el lenguaje que corresponda) que encadena los pasos del flujo.
7. `## Prueba E2E realizada` - evidencia de que se ejecutó contra la API real: fecha, resultado (request/response real con secrets redactados como `<REDACTED>`), y link al archivo de evidencia en `.loop/evidence/`. Si `tested_e2e: false` en el frontmatter, esta sección debe decir explícitamente por qué no se pudo probar (prerequisito faltante) - nunca se omite la sección.

## Reglas duras específicas de este proyecto

- Ningún script de prueba E2E para Content Posting API puede aceptar modo público como parámetro - `privacy_level` hardcodeado a `SELF_ONLY` (o el equivalente de borrador/privado vigente en la doc). Publicar en público es una acción manual del usuario, nunca del loop.
- Los scopes y endpoints listados tienen que citarse contra una URL real de `tiktok_docs` - si no se puede verificar re-fetcheando esa URL, no se afirma como hecho.
- Ningún secret real (client_secret, access_token) va en el SKILL.md ni en `.loop/evidence/` - siempre `<REDACTED>`.
