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
- Permitidos: `skills/**`, `.loop/**`, `PROGRESS.md`, `.env.example`, `.gitignore`
- Prohibidos: ver `.loop/forbidden-paths.txt` - cualquier match ahí es ROJO automático, no es juicio del Grader

## Baseline
Commit de referencia: ver `.loop/baseline-commit.txt`

## Estado
Fase de inicialización completa: `.loop/`, `.loop/verify.sh` (probado en verde y en rojo), `.loop/skill-template.md`, `PROGRESS.md` creados. Documentación base de developers.tiktok.com inspeccionada (módulos reales confirmados por fetch directo, no inventados - ver PROGRESS.md § Módulos descubiertos). Todavía no se ejecutó el modo entrenamiento (Paso 7 de la skill `setup-loop-engineering`) ni se creó ninguna Skill. Próximo paso: correr 2-3 ciclos Maker/Grader supervisados sobre el primer ítem de Iteración 1 antes de ofrecer lanzar `/loop` desatendido.

## Bloqueadas
Ninguna todavía.

## Protocolo Maker/Grader
1. Maker: implementa el próximo ítem de `PROGRESS.md` → Next, corre `.loop/verify.sh`.
2. Grader (subagente SEPARADO del Maker, nunca el mismo contexto): si `verify.sh` da verde, mira en frío el diff contra este Objetivo y estos Guardarraíles (`git diff $(cat .loop/baseline-commit.txt)..HEAD --stat`, y cruza los paths tocados contra `.loop/forbidden-paths.txt`). Para la sección "Prueba E2E realizada" de cada Skill, el Grader tiene que abrir y mirar la evidencia real en `.loop/evidence/`, nunca asumir del exit code de `verify.sh` solo - confirma que el request/response mostrado es plausible y que no hay secrets sin redactar.
   Si algo no cumple, revertir y anotar el motivo en `PROGRESS.md` - nunca dejarlo pasar solo porque `verify.sh` dio verde.
