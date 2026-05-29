# Registro oficial — evidencia A1

**Fecha:** 2026-05-29  
**Ajuste:** A1 — un único flujo de registro visible

---

## Configuración producción requerida

```env
# Raíz del proyecto (frontend Vite)
VITE_REGISTER_WIZARD_V2=true
```

Documentado en `.env.example` L24–26 como **OBLIGATORIO en producción/piloto**.

| Valor | Comportamiento |
|-------|----------------|
| `true` (default) | Wizard comercial único |
| `false` | Registro **deshabilitado** — mensaje al usuario (no se expone legacy) |

---

## Cambio de código (shell)

**Archivo:** `src/App.jsx`

| Antes | Después |
|-------|---------|
| Bifurcación `Register.jsx` vs `RegisterCommercialWizard` | Solo `RegisterCommercialWizard` |
| Legacy visible si `VITE_REGISTER_WIZARD_V2=false` | Legacy **no montado**; mensaje de contacto admin |

**Archivo legacy:** `src/components/Register.jsx` — permanece en repo para referencia/tests; **no hay ruta pública** en App.

---

## Flujo oficial visible

```
Servicio → Programa (D28D) → Plan → Moneda → Datos y pago
         ↘ Código invitación (gym/coach/programa) → Plan → …
```

Endpoints públicos:

- `GET /api/programs/public` (`skipShellAuth`)
- `GET /api/accounts/plans?visible=true`
- `POST /api/auth/resolve-invite` (código)

---

## Verificación manual

1. Abrir `/` sin sesión → Login → «Registrarse»
2. Confirmar wizard de 5 pasos (no formulario legacy invite-only)
3. En prod: confirmar `.env` contiene `VITE_REGISTER_WIZARD_V2=true`
4. Build: `grep -r RegisterCommercialWizard src/App.jsx` — sin import `Register`

---

## Checklist deploy

- [ ] `VITE_REGISTER_WIZARD_V2=true` en Vercel/Hostinger env frontend
- [ ] Rebuild frontend post-merge
- [ ] Smoke: abrir registro en incógnito

---

*Evidencia A1 — preparación piloto Food.*
