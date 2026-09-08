# BuzzBee Integration Hub v1 — v6.3.0

Integration Hub formaliza la capa API First de BuzzBee Core.

## Incluye
- directorio de conexiones externas;
- API Keys con secreto visible una sola vez;
- hash SHA-256 de API Keys en base de datos;
- scopes descriptivos por credencial;
- revocación de credenciales;
- webhooks salientes;
- catálogo inicial de eventos;
- HMAC SHA-256 para firma de webhooks;
- signing secrets cifrados con AES-256-GCM;
- prueba real de endpoint;
- logs de entrega;
- HTTP status, duración y error;
- rotación de signing secrets.

## Variables de entorno
En producción debe configurarse:

`INTEGRATION_ENCRYPTION_KEY=<secreto-largo-y-aleatorio>`

Si no existe, el desarrollo usa `JWT_SECRET` como origen de la llave. El fallback de desarrollo no debe usarse en producción.

## Seguridad
Las API Keys se almacenan únicamente como hash. BuzzBee devuelve el secreto completo una sola vez al crearlo.

Los signing secrets de webhook sí necesitan ser recuperables para firmar entregas, por lo que se almacenan cifrados con AES-256-GCM.

## Eventos iniciales
- customer.created / updated
- supplier.created / updated
- product.created / updated
- sales.order.created
- purchase.order.created
- inventory.low_stock
- expense.submitted
- approval.required
- datahub.import.completed

## Alcance v1
Los webhooks ya pueden probar conectividad y registrar entregas reales.

El catálogo de eventos existe, pero todavía falta conectar cada evento de dominio para que se dispare automáticamente desde los módulos.

Las API Keys se emiten, protegen y revocan, pero el middleware para autenticar requests externos con esas claves será Integration Hub v2.
