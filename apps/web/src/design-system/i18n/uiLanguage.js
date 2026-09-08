// BuzzBee v12.3.0 — UI language normalization (es-MX)
// Keeps API/domain enum keys intact while presenting consistent Spanish labels.
const LABELS = {
  ACTIVE:'Activo', INACTIVE:'Inactivo', ENABLED:'Habilitado', DISABLED:'Deshabilitado',
  PENDING:'Pendiente', APPROVED:'Aprobado', REJECTED:'Rechazado', DRAFT:'Borrador',
  SUBMITTED:'Enviado', SENT:'Enviado', ACCEPTED:'Aceptado', CONFIRMED:'Confirmado',
  ISSUED:'Emitido', RECEIVED:'Recibido', PARTIALLY_RECEIVED:'Recepción parcial',
  DELIVERED:'Entregado', PARTIALLY_DELIVERED:'Entrega parcial', INVOICED:'Facturado',
  PAID:'Pagado', PARTIALLY_PAID:'Pago parcial', OVERDUE:'Vencido',
  OPEN:'Abierto', CLOSED:'Cerrado', CANCELLED:'Cancelado', CANCELED:'Cancelado', VOID:'Anulado',
  COMPLETED:'Completado', PROCESSING:'En proceso', IN_PROGRESS:'En proceso', PLANNED:'Planeado',
  RELEASED:'Liberado', PAUSED:'Pausado', FAILED:'Fallido', ERROR:'Error', SUCCESS:'Correcto',
  WARNING:'Advertencia', INFO:'Información', NEW:'Nuevo', VALID:'Vigente', EXPIRING:'Por vencer',
  EXPIRED:'Vencido', POSTED:'Contabilizado', READY:'Listo', STAMPED:'Timbrado',
  REQUESTED:'Solicitado', ACKNOWLEDGED:'Reconocido', RESOLVED:'Resuelto',
  RETRY_WAIT:'En espera de reintento', DEAD_LETTER:'Requiere atención', DISPATCHED:'Enviado',
  REVOKED:'Revocado', NEUTRAL:'Sin estado', PRESENT:'Presente', ABSENT:'Ausente',
  LATE:'Retardo', REMOTE:'Remoto', DAY_OFF:'Descanso', LEAVE:'Permiso', TERMINATED:'Baja',
  SALE:'Venta', RETURN:'Devolución', PURCHASE:'Compra', TRANSFER:'Transferencia', ADJUSTMENT:'Ajuste',
  HEALTHY:'Saludable', WATCH:'En observación', RISK:'En riesgo', CRITICAL:'Crítico', HIGH:'Alta', MEDIUM:'Media', LOW:'Baja',
  RUNNING:'En ejecución', QUEUED:'En cola', RETRYING:'Reintentando', SKIPPED:'Omitido', ARCHIVED:'Archivado',
  ONLINE:'En línea', OFFLINE:'Sin conexión', CONNECTED:'Conectado', DISCONNECTED:'Desconectado',
  OWNER:'Propietario', ADMIN:'Administrador', MEMBER:'Miembro', VIEWER:'Consulta'
};

export function uiLabel(value, fallback = value) {
  if (value == null) return '';
  if (typeof value !== 'string') return value;
  const key = value.trim().toUpperCase();
  return LABELS[key] ?? fallback;
}

export function statusLabel(value) {
  return uiLabel(value, String(value ?? '').replaceAll('_',' ').toLowerCase().replace(/^./, c => c.toUpperCase()));
}

export const uiLabels = LABELS;
