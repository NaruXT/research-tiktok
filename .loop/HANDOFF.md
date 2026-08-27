# HANDOFF - Estado del loop

## Objetivo (vigente - Iteración 3 en curso, corriendo bajo /loop dinámico)
Iteración 1 (Auth/OAuth) e Iteración 2 (Display API) ya están Done - ver PROGRESS.md. El objetivo vigente es Iteración 3 (Content Posting API): un módulo está hecho cuando existe su `skills/tiktok-<modulo>/SKILL.md` que (a) pasa `.loop/verify.sh` en verde, (b) tiene `tested_e2e: true` respaldado por evidencia real en `.loop/evidence/`, con secrets/PII siempre `<REDACTED>`, y (c) `PROGRESS.md` lo marca Done. Mismo criterio para cada módulo siguiente (Webhooks en adelante).

## Guardarraíles numéricos
- Máximo por iteración (trabajo de documentación/código de la Skill en sí - `skills/**`, `SKILL.md`, evidencia): 4 archivos / 700 líneas
- **Excepción recalibrada tras el Ciclo 2** (hallazgo del Grader): setup de infraestructura externa de una sola vez (ej. páginas estáticas para verificación de dominio en `docs/**`, creación del repo remoto) NO cuenta contra el límite de arriba, siempre que quede documentado en HANDOFF.md § Estado con la causa concreta (qué bloqueo externo lo forzó) - no es una licencia abierta, es para este tipo específico de bloqueo de un prerrequisito externo, y solo aplica una vez por prerrequisito resuelto (no se repite para el mismo bloqueo).
- Máximo de intentos por ítem: 6
- Pausa obligatoria cada 1 iteración (dado que hay pocos módulos y cada uno es grande, se revisa antes de pasar al siguiente)
- 3 ROJOS consecutivos en el mismo ítem -> BLOQUEADO, anotar causa en PROGRESS.md y seguir con el siguiente ítem
- Tope de gasto: a definir con el usuario antes de lanzar `/loop` desatendido (Paso 8) - por ahora, cada ciclo corre solo en la conversación activa (modo entrenamiento)

## Guardarraíles de irreversibilidad
- **Content Posting API nunca en modo público**: cualquier script de prueba E2E hardcodea `privacy_level` a `SELF_ONLY` (o el equivalente privado/borrador vigente en la doc). Publicar en público es una acción manual del usuario, nunca del loop. Bloqueo estructural: `verify.sh` greppea `privacy_level.*PUBLIC` en el directorio de cada Skill y marca ROJO si aparece - ver `.loop/skill-template.md`.
- **Credenciales reales**: viven solo en `.env` (gitignored, en `forbidden-paths.txt`). Nunca en `SKILL.md`, nunca en `.loop/evidence/` sin `<REDACTED>`.
- **Registro de app real (Iteración 1)**: crear la TikTok Developer App es una acción con efectos en una cuenta real de terceros (TikTok) - se hace una vez, de forma explícita y visible, no repetida automáticamente por reintentos del loop.

## Paths
- Permitidos: `skills/**`, `.loop/**`, `PROGRESS.md`, `.env.example`, `.gitignore`, `docs/**` (páginas estáticas de ToS/Privacy/Home requeridas por el formulario de registro de la TikTok Developer App, publicadas vía GitHub Pages)
- Prohibidos: ver `.loop/forbidden-paths.txt` - cualquier match ahí es ROJO automático, no es juicio del Grader

## Baseline
Commit de referencia: ver `.loop/baseline-commit.txt`

## Estado
**Iteración 1 (Login Kit / OAuth) completa.** Ciclo 1 de entrenamiento: Maker creó `skills/tiktok-auth-setup/SKILL.md`, Grader (subagente separado) dio VERDE. Ciclo 2 de entrenamiento: el usuario registró la TikTok Developer App real en modo Sandbox (con ayuda intensiva - ver hallazgos abajo), y se ejecutó el flujo OAuth completo (autorización -> intercambio -> refresh) contra la API real. `tested_e2e: true`, evidencia en `.loop/evidence/tiktok-auth-setup-e2e.md`. `access_token`/`refresh_token` reales quedan en `.env` local para reuso en Iteración 2.

**Hallazgos de calibración de los Ciclos 1-2 (para todo módulo futuro con `tested_e2e`):**
1. El registro de la app real es un checkpoint humano genuino, no automatizable - confirmado: requirió ida y vuelta manual sustancial (crear cuenta, elegir Sandbox vs Production, completar formularios, resolver dos bloqueos no documentados de antemano).
2. **Bloqueo no anticipado #1**: el registro exige URLs *verificadas* (no solo presentes) de Terms of Service/Privacy/Web - hubo que armar un sitio real (GitHub Pages, repo público `github.com/NaruXT/research-tiktok`) y pasar por verificación de propiedad de URL (archivo de firma único por app). Esto agregó `docs/**` a los paths permitidos (ver abajo) y un repo remoto que antes no existía.
3. **Bloqueo no anticipado #2**: el modo Production de la app pide un video de demo del flujo funcionando - dependencia circular (no podés grabar el flujo antes de tenerlo funcionando). Se resolvió usando **Sandbox mode**, que documentalmente no requiere review. Cualquier módulo futuro debe registrarse/probarse en Sandbox, nunca iniciar en Production.
4. **Bloqueo no anticipado #3**: el primer intento de autorización falló por mismatch exacto de `redirect_uri` entre lo registrado en el portal y lo enviado en la URL - TikTok exige match carácter por carácter, y el error aparece en la propia pantalla de autorización (no solo en el intercambio de token). Ya documentado en el SKILL.md para que no se repita.

**Iteración 2 (Display API) completa - Ciclo 3 de entrenamiento, y esta vez confirmó la hipótesis del hallazgo #1-2 de arriba:** agregar el scope `video.list` a la app existente y re-autorizar tomó minutos, sin repetir verificación de dominio ni el bloqueo de Production - el patrón de reuso funciona. `tested_e2e: true`, evidencia en `.loop/evidence/tiktok-display-api-e2e.md`. Los 3 endpoints (`user/info`, `video/list`, `video/query`) respondieron con el schema documentado. Único hallazgo nuevo: `video/query` con un ID inexistente no da error, lo omite en silencio (`code: "ok"`) - ya documentado en el SKILL.md. Cobertura pendiente (no bloqueante): no se pudo probar el caso "video real" porque la cuenta de prueba no tiene contenido público - limitación de datos, no de la Skill.

Con Iteración 2, el modo entrenamiento (Paso 7) ya corrió 3 ciclos completos: Ciclo 1 (documentación + Grader VERDE), Ciclo 2 (primer E2E real, con sorpresas resueltas y guardarraíl recalibrado), Ciclo 3 (segundo E2E real, sin sorpresas nuevas más allá de un detalle de comportamiento de API). Esto cumple el criterio de la skill `setup-loop-engineering` de "2-3 iteraciones sin sorpresas" antes de pasar al Paso 8 (elegir mecanismo de lanzamiento).

Grader del Ciclo 3: VERDE (subagente separado, confirmó cero secrets y cero PII en texto plano en todo el historial de git, incluyendo el `display_name` real del usuario). **Modo entrenamiento (Paso 7) completo, 3/3 ciclos verificados.**

Usuario eligió `/loop` en ritmo dinámico para Iteración 3 en adelante. **Iteración 3 (Content Posting API) completa.** Primer ciclo: Maker documentó la Skill, Grader dio VERDE pero encontró un punto ciego real en `verify.sh` (el regex del guardarraíl de irreversibilidad solo cubría sintaxis shell `privacy_level=PUBLIC`, no JSON `"privacy_level": "PUBLIC_TO_EVERYONE"`) - corregido y probado contra ambos casos en el mismo ciclo, más el ejemplo del SKILL.md endurecido para tener `SELF_ONLY` literal en el JSON en vez de por variable. Loop se pausó en el checkpoint humano (agregar producto Content Posting API + scopes `video.publish`/`video.upload` + conseguir un video de prueba) tal como pedía el prompt de lanzamiento. Usuario resolvió el checkpoint (agregó el producto, ambos scopes, y se generó un video sintético con `ffmpeg`); se completó la prueba E2E real: Upload API (borrador) exitoso end-to-end, Direct Post con `SELF_ONLY` reveló una restricción real de TikTok más estricta que la documentada (`unaudited_client_can_only_post_to_private_accounts` incluso en privado, ver SKILL.md § Manejo de errores) - documentado como hallazgo, no forzado a "éxito" cambiando configuración real de la cuenta del usuario.

Con Iteración 3, quedan 3/3 módulos planeados originalmente por el usuario (Auth, Display, Content Posting) completos y probados E2E contra la API real.

**Iteración 4 (Webhooks) completa.** Se confirmó que el módulo SÍ existe bajo developers.tiktok.com (páginas propias `webhooks-overview`/`webhooks-events`/`webhooks-verification`, no visibles en la navegación inicial pero reales). Grader dio VERDE con un hallazgo menor (header documentado como `Tiktok-Signature` en vez de `TikTok-Signature` - corregido). Usuario eligió desplegar un túnel `ngrok` temporal para la prueba E2E: el botón "Test event" del portal falló con 403 de permisos (confirmado con logs de ngrok que nunca llegó al servidor), pero un evento **real** (`authorization.removed`, generado revocando el acceso de la app desde la cuenta de TikTok del usuario) sí se entregó y verificó correctamente (firma HMAC-SHA256 válida). Infraestructura de prueba (Flask + ngrok) dada de baja al terminar. `tested_e2e: true`.

Con esto, **4/4 módulos confirmados hasta ahora están Done con evidencia E2E real** (Auth, Display, Content Posting, Webhooks). Usuario pidió seguir con los módulos adicionales.

**Research API y Data Portability API - documentación completa, mismo tipo de bloqueo nuevo.** Ambos requieren que TikTok apruebe una aplicación separada (proyecto de investigación para Research API; review de protección de datos para Data Portability) - procesos externos, no resolubles en la sesión ni con un click de portal. Documentados completos con `tested_e2e: false` permanente. **Grader encontró un ROJO real en Research API** (scopes `[]` cuando la doc real exige `research.data.basic`, endpoint de comentarios sin fuente citable, callout sobre-específico sobre "investigador vetted"/afiliación académica no respaldado por la fuente) - corregido en el mismo ciclo (commit `ddf6d86`). Data Portability dio VERDE, con una recomendación de gobernanza (el DoD de PROGRESS.md se contradecía a sí mismo al marcar módulos "Done" sin E2E) - corregida agregando la excepción explícita al checklist (commit `36e0ae8`).

**Share Kit - documentación completa, categoría de bloqueo nueva otra vez.** No es una API HTTP, es un SDK nativo iOS/Android - no hay forma de probarlo E2E desde esta sesión (requeriría construir una app móvil real). `tested_e2e: false` permanente, documentado explícitamente como fuera de alcance por naturaleza (no por falta de aprobación ni de infraestructura desplegable).

**Commercial Content API - documentación completa, misma familia que Research API.** Mismo modelo de client access token, scope `research.adlib.basic` confirmado, datos limitados actualmente a anuncios de la UE. `tested_e2e: false` permanente, mismo tipo de bloqueo (aprobación externa). **Grader dio ROJO** (estado "desaprobado" de ads inventado sin fuente, cita de "limitado a UE" sin URL declarada) - corregido en el mismo ciclo (commit `794b150`).

**Legacy API v2 - resuelto sin Skill nueva.** Los endpoints "v2" de la guía de migración (`tiktok-api-v2-get-user-info`/`-video-list`/`-video-query`) son exactamente los mismos ya documentados en `tiktok-display-api` - no hay nada nuevo que documentar. La v1 (legacy real, etiquetada "Legacy Products" en la nav de TikTok) está siendo reemplazada por esos mismos endpoints.

**Embed Videos - completo, único módulo 100% sin prerrequisitos.** Endpoint público (`www.tiktok.com/oembed`), sin auth, sin app, sin scope. Probado en vivo dos veces (caso éxito con metadata real, caso error con URL inválida -> HTTP 400). `tested_e2e: true`, evidencia inline en el propio SKILL.md (no hace falta archivo separado, no hay secrets involucrados).

**Patrón que se repitió en 2 de 2 ciclos del batch de módulos "sin app propia" (client credentials/aprobación externa)**: el Grader encontró un dato inventado o mal citado en ambos (Research API: scope faltante + callout sobre-específico; Commercial Content API: estado inventado + cita sin fuente declarada). Ambos corregidos en el mismo ciclo que se detectaron. Share Kit tuvo un ROJO de otro tipo (afirmación de equivalencia iOS/Android falsa), también corregido en el ciclo. Los 3 Graders de re-verificación + el de Embed Videos volvieron VERDE.

**Business API y TikTok Shop - investigados y confirmados fuera de alcance (2026-08-28).** Ambos son portales de developer completamente separados con su propio registro de app y flujo de auth (`business-api.tiktok.com/portal` con OAuth de advertiser; `partner.tiktokshop.com` con `app_key`/`app_secret` y `auth.tiktok-shops.com` propios) - ninguno comparte infraestructura con este repo. Usuario decidió dejarlos como puntero documentado en PROGRESS.md, sin Skills nuevas - se tratarían como un proyecto separado si se piden en el futuro.

## PROYECTO COMPLETO

Los 12 módulos del brief original están resueltos: 6 con evidencia E2E real (Auth, Display, Content Posting, Webhooks, Embed Videos, + Legacy v2 vía Display API), 4 documentados al 100% pero bloqueados por aprobación externa de TikTok de forma permanente (Research API, Data Portability, Commercial Content), 1 documentado como SDK nativo fuera de alcance de pruebas por terminal (Share Kit), y Business API/TikTok Shop confirmados fuera de alcance. Todo el historial de commits, hallazgos del Grader (incluyendo los ROJO corregidos), y evidencia real queda en `github.com/NaruXT/research-tiktok`.

## Bloqueadas
Ninguna activa - los bloqueos restantes (`tested_e2e: false` de Research API, Data Portability, Commercial Content, Share Kit) son permanentes por diseño, no algo a resolver en una próxima sesión salvo que cambien las circunstancias externas (aprobación de TikTok, o decisión de construir una app móvil).

## Protocolo Maker/Grader
1. Maker: implementa el próximo ítem de `PROGRESS.md` → Next, corre `.loop/verify.sh`.
2. Grader (subagente SEPARADO del Maker, nunca el mismo contexto): si `verify.sh` da verde, mira en frío el diff contra este Objetivo y estos Guardarraíles (`git diff $(cat .loop/baseline-commit.txt)..HEAD --stat`, y cruza los paths tocados contra `.loop/forbidden-paths.txt`). Para la sección "Prueba E2E realizada" de cada Skill, el Grader tiene que abrir y mirar la evidencia real en `.loop/evidence/`, nunca asumir del exit code de `verify.sh` solo - confirma que el request/response mostrado es plausible y que no hay secrets sin redactar.
   Si algo no cumple, revertir y anotar el motivo en `PROGRESS.md` - nunca dejarlo pasar solo porque `verify.sh` dio verde.
