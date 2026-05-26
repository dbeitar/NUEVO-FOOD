# 🗄️ Instalación de PostgreSQL - INSTRUCCIONES PASO A PASO

## Opción 1: Instalar directamente (MÁS FÁCIL) ⭐

### Paso 1: Descargar PostgreSQL
1. Abre el navegador
2. Ve a: https://www.postgresql.org/download/macosx/
3. Descarga **PostgreSQL 15** (o la versión más reciente)
4. Abre el archivo descargado
5. Sigue los pasos del instalador

### Paso 2: Durante la instalación
- Usuario: `postgres`
- Contraseña: `food`
- Puerto: `5432`
- Locale: `DEFAULT`

### Paso 3: Verificar que funciona
Abre terminal y escribe:
```bash
psql --version
```

Debería mostrarte: `psql (PostgreSQL) 15.x`

---

## Opción 2: Usar el script automático (DESPUÉS de instalar)
Una vez que PostgreSQL esté instalado:

```bash
cd "/Users/cesargomez/Desktop/PROYECTOFOOD PLAN/backend"
bash setup-database.sh
```

---

## Opción 3: Hacer todo manualmente (si lo prefieres)

```bash
# 1. Conectar a PostgreSQL
psql -U postgres

# 2. En la consola psql, escribir:
CREATE DATABASE foodplan_db;
\c foodplan_db
\i /Users/cesargomez/Desktop/PROYECTOFOOD\ PLAN/backend/database.sql
\q
```

---

## ✅ Cuando esté listo, me avisas y ejecutamos:
```bash
npm run dev  # Frontend (puerto 5173)
```

```bash
npm run dev  # Backend (puerto 5000)
```

¡Y listo! El proyecto estará funcionando.
