# Clonar el repo y ver lo mismo que en local

**Objetivo:** que cualquier persona con `git clone` + unos comandos vea el mismo código **y** los mismos datos de demo (Biblia, widget «Hoy», Centro Espiritual), sin descargar archivos a mano ni pelear con conflictos en git.

---

## Qué va en Git (sí se comparte)

| Qué | Dónde |
|-----|--------|
| Código frontend/backend | `src/`, `backend/` |
| Migraciones de tablas (`spiritual_*`, etc.) | `backend/prisma/migrations/` |
| Scripts idempotentes | `scripts/spiritual/*`, `npm run spiritual:deploy-prod` |
| Ejemplos de configuración | `.env.example`, `backend/.env.docker.example` |
| JSON de muestra (pocos versículos) | `backend/data/spiritual/sample_bible_rvr1960.example.json` |

**Los ajustes de UI y API que hicimos están en el código** — con `git pull` todos los reciben.

---

## Qué NO va en Git (evita conflictos)

| Qué | Por qué |
|-----|---------|
| `backend/.env`, `.env` | Secretos y URLs por máquina |
| `backend/data/spiritual/rvr1960*.json` | ~11 MB generados; se descargan al importar |
| Datos en PostgreSQL | Biblia 31k versículos, devocionales, versículo del día |
| `node_modules/`, `dist/` | Se regeneran con `npm install` / `build` |

**No subas** `.env` ni los JSON grandes de la Biblia: generan conflictos y no aportan al equipo.

---

## Un solo comando (recomendado)

Con **Docker Desktop** abierto:

```bash
git clone <repo>
cd MVPFOOD
npm run setup:local
npm run dev:all
```

Abrir: **http://localhost:5175**  
Login piloto: `admin@foodplan.local` / `Demo!2026`

`setup:local` hace (idempotente):

1. Crea `.env` y `backend/.env` si no existen  
2. `npm install` (raíz + backend)  
3. `docker compose up -d postgres`  
4. `npm run db:prisma-deploy` (tablas al día)  
5. `npm run seed:dev` + `seed:coach-nicolas`  
6. `npm run spiritual:deploy-prod` (descarga Biblia RVR1960 + contenido Nicolas)

Si la Biblia ya está importada, **no** la vuelve a cargar salvo que uses `--force-bible`.

---

## Producción / staging

Mismo orden que local, en el servidor con `DATABASE_URL` de prod:

```bash
npm run db:prisma-deploy
npm run seed:coach-nicolas    # solo entorno nuevo
npm run spiritual:deploy-prod
```

Variables de build/runtime: ver `docs/MANUALES/09_DESPLIEGUE_OPERACION.md` (sección Centro espiritual).

---

## Cómo comprobar que quedó igual

```bash
curl http://localhost:3002/api/health
# Tras login SuperAdmin:
# GET /api/spiritual/admin/bible/stats → loaded: true, books: 66, verses: 31104
```

En la app:

- **Inicio / Progreso** → widget «Hoy» (versículo, devocional, estudios)  
- **Configuraciones** → Centro de Formación Espiritual → pestaña **Biblia** (banner verde con stats)  
- Clic en estudio → panel con texto y botón **Cerrar** (no pantalla negra)

---

## Flujo del equipo (sin conflictos)

1. **Antes de trabajar:** `git pull`  
2. Si hay migraciones nuevas: `npm run db:prisma-deploy`  
3. Si hay cambios en datos espirituales documentados: `npm run spiritual:deploy-prod`  
4. **No commitear** `.env` ni `rvr1960*.json`  
5. **Sí commitear** código, migraciones Prisma y scripts en `scripts/spiritual/`

---

## Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| `Cannot GET /` en :3002 | Es solo API; abre **:5175** o espera redirección a frontend |
| Widget vacío | `npm run spiritual:deploy-prod` |
| Backend no arranca | Docker + `docker compose up -d postgres` |
| Login falla | `npm run seed:dev` |
| Puerto API distinto | `VITE_API_BASE_URL` en `.env` debe coincidir (dev: `http://localhost:3002/api`) |

---

*Última actualización: VIENTO RECIO V1 + `setup:local` / `spiritual:deploy-prod`.*
