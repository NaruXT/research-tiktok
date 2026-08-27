# HANDOFF - Estado del loop

## Objetivo (Iteración 1 - Auth/App Setup/OAuth/Scopes)
Iteración 1 está hecha cuando existe `skills/tiktok-auth-setup/SKILL.md` que:
(a) pasa `.loop/verify.sh` en verde,
(b) tiene `tested_e2e: true` en su frontmatter respaldado por evidencia real en `.loop/evidence/` (app de desarrollador registrada en developers.tiktok.com, flujo OAuth 2.0 ejecutado con éxito, `access_token` obtenido y refrescado al menos una vez contra la API real, todo con secrets `<REDACTED>` en la evidencia guardada), y
(c) `PROGRESS.md` (raíz) marca el módulo Auth/OAuth como Done.

## Guardarraíles numéricos
- Máximo por iteración: 4 archivos / 700 líneas (cada iteración = 1 módulo completo, más grande que un commit típico de código)
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
Modo entrenamiento (Paso 7) - Ciclo 1 completo. Maker creó `skills/tiktok-auth-setup/SKILL.md` (endpoints OAuth, scopes, schemas, manejo de errores, ejemplo end-to-end - todo verificado contra 4 fuentes oficiales re-fetcheadas). `verify.sh` en verde. Grader (subagente separado, sin contexto previo) dio VERDE tras re-fetchear las fuentes por su cuenta y confirmar: sin secrets filtrados, sin paths prohibidos tocados, 1 archivo/163 líneas (dentro de guardarraíles numéricos), sin rastro de `privacy_level` público.

**Hallazgo de calibración del Ciclo 1 (esto es justamente lo que el modo entrenamiento existe para encontrar):** el Objetivo de Iteración 1 tal como está escrito arriba exige `tested_e2e: true` para considerarse "hecho", pero eso requiere que un humano registre la TikTok Developer App real (login, verificación de cuenta, aceptación de términos) - un paso que ningún loop desatendido puede completar por sí solo. Esto no es específico de Auth: probablemente aplica a todo módulo que necesite `tested_e2e: true`. Antes de lanzar `/loop` desatendido hay que decidir con el usuario cómo se maneja este checkpoint humano (¿pausa el loop y espera?, ¿la parte autónoma se limita a documentación + `tested_e2e: false` con motivo, y el usuario corre la prueba E2E aparte en una sesión supervisada?).

Todavía no se marcó Done el módulo 1 (correcto: falta la E2E real). Próximo paso: Ciclo 2 de entrenamiento - decidir con el usuario cómo resolver el checkpoint humano antes de seguir.

## Bloqueadas
- `tested_e2e` de `tiktok-auth-setup`: prerrequisito externo real (registro de app humano), no un ROJO por intentos - ver PROGRESS.md § Blocked.

## Protocolo Maker/Grader
1. Maker: implementa el próximo ítem de `PROGRESS.md` → Next, corre `.loop/verify.sh`.
2. Grader (subagente SEPARADO del Maker, nunca el mismo contexto): si `verify.sh` da verde, mira en frío el diff contra este Objetivo y estos Guardarraíles (`git diff $(cat .loop/baseline-commit.txt)..HEAD --stat`, y cruza los paths tocados contra `.loop/forbidden-paths.txt`). Para la sección "Prueba E2E realizada" de cada Skill, el Grader tiene que abrir y mirar la evidencia real en `.loop/evidence/`, nunca asumir del exit code de `verify.sh` solo - confirma que el request/response mostrado es plausible y que no hay secrets sin redactar.
   Si algo no cumple, revertir y anotar el motivo en `PROGRESS.md` - nunca dejarlo pasar solo porque `verify.sh` dio verde.
