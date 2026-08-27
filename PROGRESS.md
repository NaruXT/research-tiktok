# PROGRESS - TikTok Developer Skills

Control de iteraciones del loop. Ver `.loop/HANDOFF.md` para el objetivo/guardarraíles vigentes y el protocolo Maker/Grader.

## Definition of Done por módulo

Todo módulo se considera Done solo cuando cumple TODO esto (checklist reusado en cada iteración):

- [ ] Documentación oficial del módulo revisada íntegramente en developers.tiktok.com
- [ ] Endpoints clave documentados (método, URL completa, headers de auth, params)
- [ ] Scopes necesarios listados y confirmados contra la doc oficial
- [ ] Al menos un schema JSON de request y uno de response, reales, que parsean sin error
- [ ] Manejo de errores documentado con códigos reales de TikTok (no inventados)
- [ ] `skills/tiktok-<modulo>/SKILL.md` creado siguiendo `.loop/skill-template.md`
- [ ] Al menos 1 prueba E2E real ejecutada contra la API (sandbox/privado cuando aplique), evidencia en `.loop/evidence/` con secrets `<REDACTED>` - **excepto** cuando el único bloqueo restante es una aprobación externa de TikTok fuera del control de este proyecto (ej. proyecto de investigación vetted, review de compliance), documentada explícitamente en § Blocked. En ese caso el módulo puede marcarse Done con `tested_e2e: false` permanente, siempre que el resto del checklist esté 100% cumplido - no es una licencia para saltear E2E por comodidad, solo para bloqueos genuinamente fuera de alcance (hallazgo del Grader, ciclo Data Portability API).
- [ ] `.loop/verify.sh` pasa en verde para este módulo
- [ ] Este archivo actualizado (Done/Next) antes de pasar al siguiente módulo

## Módulos descubiertos

Confirmados por fetch directo a developers.tiktok.com (no inferidos):

| # | Módulo | Estado | Fuente confirmada |
|---|---|---|---|
| 1 | Login Kit / OAuth 2.0 / App Setup / Tokens / Scopes | **Done**, `tested_e2e: true` | `skills/tiktok-auth-setup/` |
| 2 | Display API (perfil, lista/consulta de videos) | **Done**, `tested_e2e: true` | `skills/tiktok-display-api/` |
| 3 | Content Posting API (Direct Post + Upload/borradores) | **Done**, `tested_e2e: true` | `skills/tiktok-content-posting-api/` |
| 4 | Webhooks / eventos en tiempo real | **Done**, `tested_e2e: true` | `skills/tiktok-webhooks/` |
| 5 | Research API | **Done** (doc completa), `tested_e2e: false` permanente (aprobación externa) | `skills/tiktok-research-api/` |
| 6 | Data Portability API | **Done** (doc completa), `tested_e2e: false` permanente (aprobación externa) | `skills/tiktok-data-portability-api/` |
| 7 | Share Kit | **Done** (doc completa), `tested_e2e: false` permanente (SDK nativo, fuera de alcance) | `skills/tiktok-share-kit/` |
| 8 | Commercial Content API | **Done** (doc completa), `tested_e2e: false` permanente (aprobación externa) | `skills/tiktok-commercial-content-api/` |
| 9 | Legacy API v2 (User Info, Video List, Video Query) | **Resuelto sin Skill nueva** (2026-08-28) | Los endpoints "v2" a los que apunta `/docs/en/tiktok-api-v2-introduction` son los mismos ya documentados en `skills/tiktok-display-api/` (`tiktok-api-v2-get-user-info`, `-video-list`, `-video-query`). La v1 (real "legacy", etiquetada "Legacy Products" en la nav) está siendo reemplazada por esos mismos endpoints - no amerita una Skill nueva ni separada. |
| 10 | Embed Videos | **Done**, `tested_e2e: true` (único módulo sin ningún prerrequisito - endpoint público sin auth) | `skills/tiktok-embed-videos/` |
| 11 | Business API / Marketing API | **Sin confirmar** | No apareció en la inspección inicial bajo developers.tiktok.com - podría vivir en un portal separado (business-api.tiktok.com). Verificar antes de asumir que es una Skill más de este repo. |
| 12 | TikTok Shop | **Sin confirmar** | No apareció bajo developers.tiktok.com - TikTok Shop suele tener su propio portal de partners separado (partner.tiktokshop.com). Verificar antes de asumir que aplica el mismo flujo OAuth/Skill. |

## Done
- [x] Setup inicial del framework de loop engineering (`.loop/`, `verify.sh`, `skill-template.md`, hooks de compactación)
- [x] Iteración 1 - Módulo 1 (Login Kit / OAuth / App Setup / Scopes): `skills/tiktok-auth-setup/SKILL.md` completo, `verify.sh` verde, Grader (Ciclo 1) verificó en frío: VERDE, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-auth-setup-e2e.md` (app Sandbox real, autorización + intercambio + refresh de token ejecutados contra la API real de TikTok, 2026-08-27)
- [x] Iteración 2 - Display API (perfil, lista y consulta de videos): `skills/tiktok-display-api/SKILL.md` completo, `verify.sh` verde, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-display-api-e2e.md` (mismo app Sandbox + scope `video.list` agregado, los 3 endpoints probados contra la API real, 2026-08-27). Cobertura pendiente: caso "video real encontrado" en video/list y video/query (la cuenta de prueba no tiene contenido público) - documentado, no simulado.
- [x] Iteración 3 - Content Posting API (Direct Post, Upload/borradores): `skills/tiktok-content-posting-api/SKILL.md` completo, `verify.sh` verde, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-content-posting-api-e2e.md` (Upload API con éxito end-to-end completo hasta `SEND_TO_USER_INBOX`; Direct Post con `SELF_ONLY` reveló una restricción real de TikTok más estricta que la documentada - `unaudited_client_can_only_post_to_private_accounts` incluso en privado -, documentada como hallazgo, 2026-08-28). Guardarraíl de irreversibilidad reforzado en `verify.sh` (regex ahora cubre sintaxis JSON además de shell) tras hallazgo del Grader.
- [x] Iteración 4 - Webhooks: existencia confirmada bajo developers.tiktok.com, `skills/tiktok-webhooks/SKILL.md` completo, `verify.sh` verde, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-webhooks-e2e.md` (servidor Flask + túnel ngrok temporal, evento real `authorization.removed` recibido con firma HMAC-SHA256 verificada correctamente, infraestructura de prueba dada de baja al terminar, 2026-08-28). Hallazgo: el botón "Test event" del portal falla con 403 de permisos (no llega a nuestro servidor) - un evento real sí se entrega sin problema.
- [x] Módulo adicional - Research API: `skills/tiktok-research-api/SKILL.md` completo (client credentials, query videos/comentarios/cuenta, scope `research.data.basic` confirmado), `verify.sh` verde. Documentación 100% completa; `tested_e2e: false` de forma permanente salvo que se apruebe un proyecto de investigación - ver Blocked. Corregido tras ROJO del Grader (scope faltante, fuente de un endpoint sin citar, callout sobre-específico) - ver commit `ddf6d86`.
- [x] Módulo adicional - Data Portability API: `skills/tiktok-data-portability-api/SKILL.md` completo (add/check/schemas de exportación de datos), `verify.sh` verde, Grader: VERDE. Documentación 100% completa; `tested_e2e: false` de forma permanente salvo aprobación de TikTok - ver Blocked.
- [x] Módulo adicional - Share Kit: `skills/tiktok-share-kit/SKILL.md` completo, `verify.sh` verde. **Categoría distinta**: es un SDK nativo iOS/Android, no una API HTTP - `tested_e2e: false` permanente, no por un bloqueo de aprobación sino porque probarlo requeriría construir una app móvil real, fuera del alcance de este proyecto (terminal/backend). Ver Blocked.
- [x] Módulo adicional - Commercial Content API: `skills/tiktok-commercial-content-api/SKILL.md` completo (misma familia de acceso que Research API, scope `research.adlib.basic` confirmado, datos limitados a UE), `verify.sh` verde. `tested_e2e: false` de forma permanente salvo aprobación de TikTok - ver Blocked.
- [x] Módulo adicional - Legacy API v2: **resuelto sin Skill nueva** - los endpoints "v2" de la guía de migración son los mismos ya cubiertos por `tiktok-display-api`; la v1 real (legacy) está siendo reemplazada por esos mismos endpoints. Documentado en la tabla de Módulos descubiertos, no amerita archivo propio.
- [x] Módulo adicional - Embed Videos: `skills/tiktok-embed-videos/SKILL.md` completo, `verify.sh` verde, `tested_e2e: true` con evidencia real inline en el propio SKILL.md (endpoint público sin auth - único módulo del proyecto sin ningún prerrequisito, probado con éxito y con caso de error real).

**Con esto, los 12 módulos originalmente pedidos por el usuario (incluyendo Iteraciones adicionales) están resueltos**: 6 con evidencia E2E real (Auth, Display, Content Posting, Webhooks, Embed Videos, y de hecho Legacy v2 vía Display API), 4 con documentación 100% completa bloqueados por aprobación externa de TikTok (Research API, Data Portability, Commercial Content), 1 documentado como SDK nativo fuera de alcance de pruebas por terminal (Share Kit), y Legacy API v2 resuelto como no-aplicable (redundante con Display API). Quedan solo Business API y TikTok Shop, ambos sin confirmar si aplican a este proyecto (ver Notes).

## In progress
- Ninguna

## Next
- [ ] Confirmar si Business API/TikTok Shop aplican a este repo (probablemente portales/auth separados - ver Notes) antes de decidir si se documentan acá o quedan fuera de alcance.

## Blocked
- **Prueba E2E de `tiktok-research-api`**: requiere que TikTok apruebe una aplicación de proyecto de investigación (`/application/research-api`) - la doc oficial confirma "aplicación aprobada" pero no detalla criterios de elegibilidad exactos, no verificados más allá de eso. No iniciado en nombre del usuario. Documentación completa, solo falta la prueba E2E si en algún momento se aprueba un proyecto.
- **Prueba E2E de `tiktok-data-portability-api`**: requiere aprobación de TikTok específica para este producto (evaluación de cumplimiento de protección de datos), distinta de la aprobación de Login Kit ya obtenida. No iniciado en nombre del usuario. Documentación completa.
- **Prueba E2E de `tiktok-share-kit`**: no es un bloqueo de aprobación - requiere construir una app móvil nativa (iOS/Android) real con el SDK integrado, corriendo en simulador/dispositivo, categoría de trabajo fuera del alcance de este proyecto basado en terminal/backend. Documentación completa a nivel de API/SDK.
- **Prueba E2E de `tiktok-commercial-content-api`**: misma categoría que Research API - requiere aprobación de TikTok como proyecto de investigación. No iniciado en nombre del usuario. Documentación completa.

## Notes
- Los módulos 11 y 12 (Business API, TikTok Shop) están marcados "sin confirmar" a propósito: la inspección inicial de `/docs/en/welcome` y `/doc/overview` no los mostró como parte de developers.tiktok.com. Antes de tratarlos como iteraciones de este mismo repo, hay que confirmar si viven bajo el mismo dominio/OAuth o si son portales de partner completamente distintos con su propio flujo de auth. Esto se reforzó al confirmar Webhooks: la búsqueda mostró que tanto TikTok Business API (business-api.tiktok.com) como TikTok Shop (partner.tiktokshop.com) tienen sus propios webhooks en portales separados - consistente con la sospecha original de que son productos con auth/portal propio, no parte de este mismo flujo.
