# HANDOFF - Estado del loop (cli/, scopeado)

Este loop es independiente del `.loop/` en la raíz del repo (ese es el registro
histórico, cerrado, del proyecto de Skills de documentación - no tocarlo).
Este loop vive en `cli/.loop/` y su alcance es exclusivamente el código de
`cli/`: preparar el CLI `tiktok` para que valga la pena publicarlo en npm.

## Objetivo

`cli/` está listo para publicarse en npm cuando se cumplen las 6 condiciones siguientes, todas verificables sin más contexto que esta frase:

1. Ninguna ruta de config/credenciales depende de la ubicación del repo (hoy `src/lib/env.js` calcula "tres carpetas arriba de donde vive el CLI") - usa un directorio de config portátil (XDG) por default, con override explícito (`TIKTOK_CLI_ENV_PATH`, ya existe) para desarrollo.
2. Cualquier persona puede usarlo con su propia TikTok Developer App (`client_key`/`client_secret`/`redirect_uri`), sin nada hardcodeado a esta cuenta/repo.
3. `package.json` tiene metadata real de publicación (`name`, `version`, `description`, `repository`, `license`, `author`, `files`, `bin` correctos) y ya no dice `"private": true`.
4. `npm pack --dry-run` arma el tarball correctamente (bin resuelve, archivos correctos incluidos, nada de `.loop/**` ni `test/**` en el paquete publicado).
5. `npm test`, el chequeo de sintaxis (`node --check`), ESLint (como devDependency, nunca como dependencia de runtime), y el grep del guardarraíl `SELF_ONLY` pasan en verde.
6. El manual (`skills/tiktok-cli/SKILL.md`) documenta el setup para alguien que instala el paquete por primera vez desde npm - no asume que está dentro de este repo.

**Explícitamente fuera de alcance de este loop**: correr `npm publish` real contra el registro. Ninguna iteración del Maker puede ejecutarlo, solo `--dry-run`. Publicar de verdad es una decisión separada, manual, del usuario, cuando él la tome.

## Guardarraíles numéricos

- Máximo por iteración: 5 archivos / 200 líneas
- Máximo de intentos por ítem: 6
- Pausa obligatoria cada 1 iteración (pocos ítems, cada uno grande - mismo criterio que el loop original de la raíz)
- 3 ROJOS consecutivos en el mismo ítem → BLOQUEADO, anotar causa en `PROGRESS.md` y seguir con el siguiente ítem
- Tope de gasto: a definir con el usuario recién si se decide lanzar algo desatendido (Paso 8) - por ahora corre solo en modo entrenamiento, en la conversación activa

## Guardarraíles de irreversibilidad

- **`npm publish` real**: bloqueo estructural, no solo instrucción - ninguna iteración lo ejecuta, ninguna credencial de publicación (`NPM_TOKEN`, `.npmrc` con auth token) debe existir en este entorno mientras el loop corre. Si en algún momento hace falta probarlo de verdad, es una acción explícita del usuario, fuera del loop.
- **`privacy_level` en `post/direct.js`**: el literal `"SELF_ONLY"` (constante `PRIVACY_LEVEL`) no puede volverse configurable por flag/env/parámetro bajo ningún refactor de este loop. Bloqueo estructural: `verify.sh` greppea el archivo y marca ROJO si el literal desaparece o si aparece un flag nuevo tipo `--privacy-level`.
- **Dependencias de runtime nuevas**: el CLI es cero-dependencias en runtime por decisión deliberada (ver `friction.md`). Cualquier entrada nueva en `dependencies` (no `devDependencies`) de `package.json` debe quedar explícitamente señalada en el diff y el Grader debe marcarla ROJO salvo que el usuario la haya aprobado por fuera del loop - no es algo que un Maker decida solo.

## Paths

- Permitidos: `cli/**` (todo el subárbol del CLI)
- Prohibidos: ver `cli/.loop/forbidden-paths.txt` - cualquier match ahí es ROJO automático, no es juicio del Grader
- **Excepción de una sola vez, ya ejecutada**: instalar los hooks `PreCompact`/`SessionStart(compact)` en el `.claude/settings.json` de la raíz del repo (para respaldar `cli/.loop/HANDOFF.md` en compactaciones), agregados a los arrays existentes del loop de la raíz sin reemplazarlos - hecho en el Paso 3 de `setup-loop-engineering`, vía la skill `update-config`, con verificación `jq -e` y pipe-test de ambos comandos antes de escribir. Mismo criterio que usó el loop original de la raíz para su propia excepción de setup de infraestructura externa (`docs/**` en su momento): es un permiso puntual para ESTE cambio ya hecho, no una licencia abierta a tocar archivos fuera de `cli/**` en iteraciones futuras. Cualquier otro cambio fuera de `cli/**` en un diff posterior sigue siendo ROJO automático.

## Baseline

Commit de referencia: `38f7d14995635772dc3b4f52c13d6118c97e71cb` (commit que fija el CLI tal como quedó validado end-to-end contra la cuenta real, antes de empezar el refactor de npm-packaging).

## Estado

Setup inicial completo (Pasos 0-6). Modo entrenamiento (Paso 7) en curso.

**Ciclo 1 (Config portátil) - completo, con una recalibración real.** Maker: movió `src/lib/env.js` de ruta relativa al repo a `TIKTOK_CLI_ENV_PATH` -> XDG por default, con test nuevo (`test/env-path.test.js`), `verify.sh` verde. Primer Grader (subagente separado): ROJO - `.claude/settings.json` (fuera de `cli/**`) estaba modificado sin excepción declarada en el guardarraíl de paths (los hooks de compactación instalados en el Paso 3 del setup). Corregido: se agregó la excepción puntual en HANDOFF.md § Paths (ya ejecutada, un solo archivo, motivo y alcance descritos - no una licencia genérica). Segundo Grader (instancia nueva, en frío): VERDE, confirmó los 8 puntos del protocolo incluida la excepción. **Hallazgo de calibración para futuros loops scopeados a un subdirectorio**: cualquier setup que toque configuración fuera del subárbol (hooks, CI, etc.) tiene que declararse como excepción explícita en el mismo momento en que se hace, no asumir que "es obviamente parte del setup".

**Ciclo 2 (package.json publicable) - completo, VERDE limpio, sin sorpresas nuevas.** Maker: `license`, `author`, `repository` (con `directory: "cli"`), `keywords`, `LICENSE` (MIT), `"private": true` eliminado, `files` acotado a `bin/src/skills`. Grader (subagente separado, en frío): VERDE, confirmó los 34 archivos reales del tarball (`npm pack --dry-run`) y que la excepción de `.claude/settings.json` del Ciclo 1 no cambió.

Con esto van 2 ciclos: uno con una recalibración real de guardarraíl (Ciclo 1), uno limpio (Ciclo 2) - mismo patrón que usó el loop original de la raíz de este repo antes de darse por validado (recalibración -> ciclo limpio siguiente). Falta un Ciclo 3 limpio para confirmar que la calibración quedó estable antes de pasar al Paso 8, siguiendo ese mismo precedente.

**Ciclo 3 (ESLint como devDependency) - completo, VERDE limpio.** Maker: `eslint@^10.9.1` solo en `devDependencies`, `eslint.config.js` con 8 reglas manuales (sin `@eslint/js`, para no sumar otra dependencia), `eqeqeq: ["error","smart"]` documentado con su justificación real (1 uso legítimo de `== null` en `audit-log.js`). ESLint encontró 3 problemas reales en el código existente en su primera corrida (2 imports sin usar, corregidos; el `== null` justificado con "smart"). Grader (subagente separado, en frío): VERDE, incluyó juicio propio explícito sobre `eqeqeq: "smart"` (de acuerdo, verificó que es una opción real de ESLint y que el único uso de `== null` en el código coincide con lo documentado).

**Modo entrenamiento (Paso 7) completo: 3/3 ciclos, mismo patrón que validó el loop original de la raíz de este repo** (1 recalibración real de guardarraíl + 2 ciclos limpios consecutivos, uno de ellos con juicio subjetivo del Grader confirmado independiente). Usuario confirmó seguir ciclo por ciclo manualmente en vez de lanzar `/loop` (Paso 8) - overhead no se justifica con solo 2 ítems chicos restantes y la pausa obligatoria por iteración ya vigente.

**Ciclo 4 (Manual para un usuario externo) - VERDE, con un hallazgo colateral real corregido.** Maker: `skills/tiktok-cli/SKILL.md` reescrito para lector externo (sección nueva "Before you start", credenciales XDG, hallazgo de `unaudited_client...` inlineado), `README.md` nuevo. Grader (subagente separado, en frío): VERDE - confirmó lectura línea por línea sin ninguna referencia a este repo, y además encontró (sin bloquear el ítem) que `package.json.description` y el banner de `tiktok --help` en `bin/tiktok.js` seguían mencionando "this repo" desde el commit baseline, con un path roto (`cli/skills/...`) en el segundo. Ambos corregidos de inmediato, confirmado con `tiktok --help` real.

**Ciclo 5 (Validación final) - VERDE.** Maker: `npm pack` real (no publicado a ningún registro), instalado en un directorio limpio fuera del repo, corrido con `XDG_CONFIG_HOME` apuntando a un directorio vacío y sin `TIKTOK_CLI_ENV_PATH` (simula máquina nueva) - `--help`/`schema` limpios, `profile get` falló correctamente con `AUTH_MISSING` sin tocar el `.env` real del repo. Todo limpiado después (tarball y directorio de prueba borrados).

**Grader de cierre (revisión de las 6 condiciones completas del objetivo, no un ciclo puntual) - VERDE 6/6**, con evidencia propia para cada condición. Encontró un tercer caso del mismo patrón de "referencia rota a este repo" (el hint de error de `unaudited_client_can_only_post_to_private_accounts` en `direct.js` apuntaba a un `SKILL.md` de la raíz del monorepo que no viaja en el paquete) - corregido de inmediato, `verify.sh` re-confirmado verde.

## OBJETIVO CUMPLIDO (6/6)

Las 6 condiciones de npm-worthiness están cumplidas y verificadas por un Grader independiente en frío. `npm publish` real sigue, por diseño, fuera de este loop - es una decisión y una acción del usuario, no de ninguna iteración automatizada. Nada de este trabajo (5 ciclos, ~10 archivos en `cli/`) está commiteado todavía - queda a criterio del usuario cuándo y cómo commitearlo.

## Bloqueadas

Ninguna todavía.

## Protocolo Maker/Grader

1. Maker: implementa el próximo ítem de `PROGRESS.md` → Next, corre `cli/.loop/verify.sh`.
2. Grader (subagente SEPARADO del Maker, nunca el mismo contexto): si `verify.sh` da verde, mira en frío el diff contra este Objetivo y estos Guardarraíles (`git diff $(cat cli/.loop/baseline-commit.txt)..HEAD --stat -- cli/`, y cruzá los paths tocados contra `cli/.loop/forbidden-paths.txt`). Chequea explícitamente que `PRIVACY_LEVEL`/`SELF_ONLY` en `post/direct.js` siga intacto y que `package.json.dependencies` no tenga entradas nuevas no aprobadas. Si algo no cumple, revertí y anotá el motivo en `PROGRESS.md` - nunca lo dejes pasar solo porque `verify.sh` dio verde.
