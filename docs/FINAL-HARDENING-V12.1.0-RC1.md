# BuzzBee ERP v12.1.0 RC1 — Final Hardening

Objetivos de RC1:
- cerrar warnings de permisos mutantes;
- hacer explícitos los límites tenant de configuración/almacenes;
- endurecer administración de roles compartidos;
- mantener validación de contratos;
- reducir bundle inicial mediante route-level lazy loading;
- separar vendors con manualChunks.

## Compatibilidad
No hay cambios Prisma en RC1.

## Validación local recomendada
- npm run qa:final-hardening
- npm run qa:production-readiness
- npm run qa:cross-module
- npm run build
