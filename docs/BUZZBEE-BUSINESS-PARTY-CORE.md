# BuzzBee v7.0.0 — Business Party Core

## Objetivo

Crear una identidad empresarial única que pueda representar a una misma persona u organización con distintos roles dentro de BuzzBee.

Ejemplos:

- Cliente
- Proveedor
- Lead
- Contacto
- Socio
- Otro

## Estrategia de migración segura

Esta versión NO elimina ni reemplaza las tablas Customer/Supplier.

Business Party se implementa como una capa aditiva:

Customer ─┐
          ├─ BusinessParty ─ BusinessPartyRole[]
Supplier ─┘

De esta manera los módulos existentes continúan funcionando sin cambios destructivos.

## Sincronización

`POST /api/business-parties/sync`

Busca coincidencias usando, en orden práctico:

1. RFC / taxId
2. email
3. razón social

y enlaza clientes/proveedores existentes.

Una empresa que compra y también vende puede quedar representada por un solo BusinessParty con roles CUSTOMER y SUPPLIER.

## Eventos

- `business_party.created`
- `business_party.updated`
- `business_parties.synced`

Disponibles para BuzzBee Flow e Integration Hub.

## Permisos

- business_parties.read
- business_parties.manage
- business_parties.sync

## UI

Ruta:

`/terceros`

Incluye KPI estándar BuzzBee:

- Terceros únicos
- Roles combinados
- Cobertura clientes
- Cobertura proveedores

## Próxima evolución

Business Party v2 puede agregar:

- contactos y direcciones nativas;
- historial de relaciones;
- scoring comercial/financiero;
- deduplicación asistida;
- consolidación progresiva de MasterDataContact/Address;
- vínculo con CRM y Data Hub.
