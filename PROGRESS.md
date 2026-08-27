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
| 1 | Login Kit / OAuth 2.0 / App Setup / Tokens / Scopes | Next | `/docs/en/login-kit-overview`, `/docs/en/login-kit-web`, `/docs/en/login-kit-manage-user-access-tokens`, `/docs/en/scopes-overview`, `/docs/en/getting-started-create-an-app` |
| 2 | Display API (perfil, lista/consulta de videos) | Pending | `/docs/en/display-api-get-started` |
| 3 | Content Posting API (Direct Post + Upload/borradores) | Pending | `/products/content-posting-api`, mencionado en overview |
| 4 | Webhooks / eventos en tiempo real | In progress - **confirmado que existe** (2026-08-28) | `/docs/en/webhooks-overview`, `/docs/en/webhooks-events`, `/docs/en/webhooks-verification` - no aparecía en la inspección inicial (nav de `/docs/en/welcome`) pero sí existe como páginas propias, encontradas por búsqueda directa |
| 5 | Research API | Pending | `/products/research-api` (mencionado en overview, no inspeccionado en detalle) |
| 6 | Data Portability API | Pending | `/docs/en/data-portability-api-get-started`, `/products/data-portability-api` |
| 7 | Share Kit | Pending | `/products/share-kit` |
| 8 | Commercial Content API | Pending | `/products/commercial-content-api` |
| 9 | Legacy API v2 (User Info, Video List, Video Query) | Pending | `/docs/en/tiktok-api-v2-introduction` y sub-páginas |
| 10 | Embed Videos | Pending | `/docs/en/embed-videos` |
| 11 | Business API / Marketing API | **Sin confirmar** | No apareció en la inspección inicial bajo developers.tiktok.com - podría vivir en un portal separado (business-api.tiktok.com). Verificar antes de asumir que es una Skill más de este repo. |
| 12 | TikTok Shop | **Sin confirmar** | No apareció bajo developers.tiktok.com - TikTok Shop suele tener su propio portal de partners separado (partner.tiktokshop.com). Verificar antes de asumir que aplica el mismo flujo OAuth/Skill. |

## Done
- [x] Setup inicial del framework de loop engineering (`.loop/`, `verify.sh`, `skill-template.md`, hooks de compactación)
- [x] Iteración 1 - Módulo 1 (Login Kit / OAuth / App Setup / Scopes): `skills/tiktok-auth-setup/SKILL.md` completo, `verify.sh` verde, Grader (Ciclo 1) verificó en frío: VERDE, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-auth-setup-e2e.md` (app Sandbox real, autorización + intercambio + refresh de token ejecutados contra la API real de TikTok, 2026-08-27)
- [x] Iteración 2 - Display API (perfil, lista y consulta de videos): `skills/tiktok-display-api/SKILL.md` completo, `verify.sh` verde, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-display-api-e2e.md` (mismo app Sandbox + scope `video.list` agregado, los 3 endpoints probados contra la API real, 2026-08-27). Cobertura pendiente: caso "video real encontrado" en video/list y video/query (la cuenta de prueba no tiene contenido público) - documentado, no simulado.
- [x] Iteración 3 - Content Posting API (Direct Post, Upload/borradores): `skills/tiktok-content-posting-api/SKILL.md` completo, `verify.sh` verde, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-content-posting-api-e2e.md` (Upload API con éxito end-to-end completo hasta `SEND_TO_USER_INBOX`; Direct Post con `SELF_ONLY` reveló una restricción real de TikTok más estricta que la documentada - `unaudited_client_can_only_post_to_private_accounts` incluso en privado -, documentada como hallazgo, 2026-08-28). Guardarraíl de irreversibilidad reforzado en `verify.sh` (regex ahora cubre sintaxis JSON además de shell) tras hallazgo del Grader.
- [x] Iteración 4 - Webhooks: existencia confirmada bajo developers.tiktok.com, `skills/tiktok-webhooks/SKILL.md` completo, `verify.sh` verde, `tested_e2e: true` con evidencia real en `.loop/evidence/tiktok-webhooks-e2e.md` (servidor Flask + túnel ngrok temporal, evento real `authorization.removed` recibido con firma HMAC-SHA256 verificada correctamente, infraestructura de prueba dada de baja al terminar, 2026-08-28). Hallazgo: el botón "Test event" del portal falla con 403 de permisos (no llega a nuestro servidor) - un evento real sí se entrega sin problema.
- [x] Módulo adicional - Research API: `skills/tiktok-research-api/SKILL.md` completo (client credentials, query videos/comentarios/cuenta), `verify.sh` verde. Documentación 100% completa; `tested_e2e: false` de forma permanente salvo que se apruebe un proyecto de investigación - ver Blocked.
- [x] Módulo adicional - Data Portability API: `skills/tiktok-data-portability-api/SKILL.md` completo (add/check/schemas de exportación de datos), `verify.sh` verde. Documentación 100% completa; `tested_e2e: false` de forma permanente salvo aprobación de TikTok - ver Blocked.

## In progress
- Ninguna

## Next
- [ ] Módulos adicionales restantes (Share Kit, Commercial Content API, Legacy API v2, Embed Videos) - ver tabla de Módulos descubiertos arriba para fuentes confirmadas.

## Blocked
- **Prueba E2E de `tiktok-research-api`**: requiere aprobación de TikTok como proyecto de investigación vetted (`/application/research-api`) - proceso externo con criterios de elegibilidad (afiliación académica/institucional), no iniciado en nombre del usuario. Documentación completa, solo falta la prueba E2E si en algún momento se aprueba un proyecto.
- **Prueba E2E de `tiktok-data-portability-api`**: requiere aprobación de TikTok específica para este producto (evaluación de cumplimiento GDPR/protección de datos), distinta de la aprobación de Login Kit ya obtenida. No iniciado en nombre del usuario. Documentación completa.

## Notes
- Los módulos 11 y 12 (Business API, TikTok Shop) están marcados "sin confirmar" a propósito: la inspección inicial de `/docs/en/welcome` y `/doc/overview` no los mostró como parte de developers.tiktok.com. Antes de tratarlos como iteraciones de este mismo repo, hay que confirmar si viven bajo el mismo dominio/OAuth o si son portales de partner completamente distintos con su propio flujo de auth. Esto se reforzó al confirmar Webhooks: la búsqueda mostró que tanto TikTok Business API (business-api.tiktok.com) como TikTok Shop (partner.tiktokshop.com) tienen sus propios webhooks en portales separados - consistente con la sospecha original de que son productos con auth/portal propio, no parte de este mismo flujo.
