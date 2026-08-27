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
- [ ] Al menos 1 prueba E2E real ejecutada contra la API (sandbox/privado cuando aplique), evidencia en `.loop/evidence/` con secrets `<REDACTED>`
- [ ] `.loop/verify.sh` pasa en verde para este módulo
- [ ] Este archivo actualizado (Done/Next) antes de pasar al siguiente módulo

## Módulos descubiertos

Confirmados por fetch directo a developers.tiktok.com (no inferidos):

| # | Módulo | Estado | Fuente confirmada |
|---|---|---|---|
| 1 | Login Kit / OAuth 2.0 / App Setup / Tokens / Scopes | Next | `/docs/en/login-kit-overview`, `/docs/en/login-kit-web`, `/docs/en/login-kit-manage-user-access-tokens`, `/docs/en/scopes-overview`, `/docs/en/getting-started-create-an-app` |
| 2 | Display API (perfil, lista/consulta de videos) | Pending | `/docs/en/display-api-get-started` |
| 3 | Content Posting API (Direct Post + Upload/borradores) | Pending | `/products/content-posting-api`, mencionado en overview |
| 4 | Webhooks / eventos en tiempo real | Pending - **no confirmado todavía** | No se encontró página bajo developers.tiktok.com en la inspección inicial. Confirmar en Iteración 4 si existe como módulo separado o vive dentro de otro producto. |
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

## In progress
- Ninguna

## Next
- [ ] Iteración 2 - Display API (Consultas de perfil, lectura de videos): fuente confirmada `/docs/en/display-api-get-started`

## Blocked
- Ninguna

## Notes
- Los módulos 11 y 12 (Business API, TikTok Shop) están marcados "sin confirmar" a propósito: la inspección inicial de `/docs/en/welcome` y `/doc/overview` no los mostró como parte de developers.tiktok.com. Antes de tratarlos como iteraciones de este mismo repo, hay que confirmar si viven bajo el mismo dominio/OAuth o si son portales de partner completamente distintos con su propio flujo de auth.
- El módulo 4 (Webhooks), pedido explícitamente por el usuario como Iteración 4, tampoco se encontró en la inspección inicial - queda como pendiente de confirmar cuando le toque el turno, no se inventa su existencia.
