# Punto de respaldo — pre integración Food Plan

**Creado:** 2026-05-21  
**Motivo:** Antes de reemplazar el módulo de alimentación de D28D por `dbeitar/food_version_final`.

## Referencias Git

| Recurso | Nombre |
|---------|--------|
| Tag | `pre-food-integration-20260521` |
| Rama backup | `backup/pre-food-integration-20260521` |

## Contenido del snapshot

Incluye todo el trabajo hasta este punto:

- Fases 1–6 modular (licencias, GYM, white-label coach, payment links)
- Rediseño D28D (tema, maestro de apariencia, i18n ES/EN)
- Tarjetas bilingües y paneles admin configurables
- APIs `frontend-config`, upload de imágenes

## Restaurar el proyecto a este punto

```bash
cd /Users/cesargomez/Desktop/MVPFOOD

# Ver el commit del tag
git show pre-food-integration-20260521 --stat

# Opción 1: solo inspeccionar
git checkout pre-food-integration-20260521

# Opción 2: mover main a este punto (destructivo en main local)
git checkout main
git reset --hard pre-food-integration-20260521

# Opción 3: rama nueva desde el backup (recomendado)
git checkout -b restauracion-desde-backup pre-food-integration-20260521
```

## Si ya publicaste commits posteriores en `origin/main`

No uses `reset --hard` en main compartido sin coordinar. Crea una rama desde el tag y abre PR de reversión.

## Archivo tarball opcional

Si guardaste un `.tar.gz` manual en Desktop, descomprimir y comparar con `git diff` contra el tag.
