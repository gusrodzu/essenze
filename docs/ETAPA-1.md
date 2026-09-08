# Etapa 1 — Fundación técnica

## Objetivo

Dejar listo el monorepo, la interfaz inicial, la API, PostgreSQL y Prisma.

## Criterios de aceptación

- `docker compose up -d` levanta PostgreSQL.
- `npm run db:migrate -- --name initial_core` crea las tablas.
- `npm run dev` levanta web y API.
- La portada indica que la API está conectada.
