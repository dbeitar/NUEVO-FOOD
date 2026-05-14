# Componentes legacy archivados

Componentes que existían en versiones previas pero **ya no se importan desde el
grafo activo de la app** (frontend) o **no están montados desde `server.js`**
(backend).

Se mantienen aquí por trazabilidad histórica y eventual rescate selectivo.

## Frontend archivado (2026-05-14)

| Archivo | Motivo |
|---|---|
| `AdminDashboard.jsx` | Panel "FoodPlan Admin" antiguo (branding viejo + claves Stripe/PayPal fake). Reemplazado por `Dashboard.jsx` + vistas modulares en `dashboard/*.jsx`. |
| `AdminTrainers.jsx` | Solo lo usaba `AdminDashboard`. La gestión real vive en `AdminUsers.jsx`. |
| `AdminVideoGallery.jsx` | Sustituido por `AdminTrainingGallery.jsx`. |
| `Login.jsx` | Reemplazado por `ModernLogin.jsx` (lo único que importa `App.jsx`). |
| `RouterBoundary.jsx`, `ProtectedRoute.jsx`, `Forbidden.jsx`, `Unauthorized.jsx` | Pensados para un setup con `react-router`; `App.jsx` renderiza Dashboard directo. |
| `Sidebar.jsx`, `Navbar.jsx` | Componentes layout para un `MainLayout` que nunca se cableó (App renderiza Dashboard plano). |
| `CoachView.jsx`, `GymAdminView.jsx`, `SuperAdminHome.jsx` | Vistas de home por rol pensadas para el shell pero nunca importadas por `Dashboard.jsx`. La home actual es `ServicesHero`. |

## Backend archivado (2026-05-14)

| Archivo | Motivo |
|---|---|
| `paymentsRoutes.js`, `paymentsController.js`, `PaymentsDatabase.js` | Sin `app.use('/api/payments', ...)` en `server.js`. Implementación parcial; el módulo de pagos sigue sin contrato definido. |
| `FoodItems.js` | Sin consumidores en código activo. Reemplazado por `FoodDatabase.js`. |
| `config/database.js` | Duplicado de `dbClient.js`; nadie hace `require` de este archivo. |
