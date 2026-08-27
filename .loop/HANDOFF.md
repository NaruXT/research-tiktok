# HANDOFF - Estado del loop

## Objetivo (Iteración 1 - Auth/App Setup/OAuth/Scopes)
Iteración 1 está hecha cuando existe `skills/tiktok-auth-setup/SKILL.md` que:
(a) pasa `.loop/verify.sh` en verde,
(b) tiene `tested_e2e: true` en su frontmatter respaldado por evidencia real en `.loop/evidence/` (app de desarrollador registrada en developers.tiktok.com, flujo OAuth 2.0 ejecutado con éxito, `access_token` obtenido y refrescado al menos una vez contra la API real, todo con secrets `<REDACTED>` en la evidencia guardada), y
(c) `PROGRESS.md` (raíz) marca el módulo Auth/OAuth como Done.

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

Próximo paso: decidir con el usuario el mecanismo de lanzamiento (Paso 8) para Iteración 3 en adelante (Content Posting API, Webhooks, y los módulos adicionales por confirmar).

## Bloqueadas
Ninguna.

## Protocolo Maker/Grader
1. Maker: implementa el próximo ítem de `PROGRESS.md` → Next, corre `.loop/verify.sh`.
2. Grader (subagente SEPARADO del Maker, nunca el mismo contexto): si `verify.sh` da verde, mira en frío el diff contra este Objetivo y estos Guardarraíles (`git diff $(cat .loop/baseline-commit.txt)..HEAD --stat`, y cruza los paths tocados contra `.loop/forbidden-paths.txt`). Para la sección "Prueba E2E realizada" de cada Skill, el Grader tiene que abrir y mirar la evidencia real en `.loop/evidence/`, nunca asumir del exit code de `verify.sh` solo - confirma que el request/response mostrado es plausible y que no hay secrets sin redactar.
   Si algo no cumple, revertir y anotar el motivo en `PROGRESS.md` - nunca dejarlo pasar solo porque `verify.sh` dio verde.
