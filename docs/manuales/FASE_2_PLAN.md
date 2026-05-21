# Fase 2 - Maestros y Administracion

Fecha de inicio: 18 de abril de 2026

## Objetivo

Consolidar y fortalecer el modulo administrativo de Food Plan para operar con datos maestros (usuarios, gimnasios, entrenadores, planes y alimentos) de manera estable y escalable.

## Alcance inicial (Sprint 1)

1. Unificar repositorio de trabajo en `MVPFOOD` con backend operativo en `/backend`.
2. Exponer endpoint de resumen administrativo para tablero de control.
3. Mostrar resumen administrativo en Home para roles `super_admin` y `admin_gimnasio`.
4. Estabilizar flujo local de desarrollo con `npm run dev:all`.

## Entregables del Sprint 1

1. Backend en raiz del proyecto (`/backend`) listo para evolucion.
2. Endpoint `GET /api/admin/overview` protegido por token.
3. UI de resumen administrativo dentro del `Dashboard`.
4. Documento de plan Fase 2 actualizado.

## Backlog inmediato (Sprint 2)

1. Auditoria basica de acciones admin (crear/editar/eliminar).
2. Validaciones de negocio por rol (RBAC mas estricto).
3. Paginacion y filtros estandar en tablas administrativas.
4. Pruebas de endpoints criticos de admin.
