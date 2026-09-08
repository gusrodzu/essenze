const contexts=[
  {
    key:'sales',
    match:path=>path.startsWith('/ventas'),
    label:'Ventas',
    suggestions:[
      '¿Cómo van las ventas este mes?',
      '¿Qué clientes compraron menos?',
      '¿Cuáles son los productos más vendidos?',
      '¿Qué cotizaciones requieren seguimiento?',
      '¿Qué vendedor tiene mejor desempeño?'
    ]
  },
  {
    key:'purchases',
    match:path=>path.startsWith('/compras'),
    label:'Compras',
    suggestions:[
      '¿Qué órdenes siguen pendientes?',
      '¿Qué proveedor tarda más en entregar?',
      '¿Qué compras requieren aprobación?',
      '¿Dónde aumentaron los precios de compra?',
      '¿Qué órdenes están por vencer?'
    ]
  },
  {
    key:'inventory',
    match:path=>path.startsWith('/inventario')||path==='/almacenes',
    label:'Inventario',
    suggestions:[
      '¿Qué productos tienen stock crítico?',
      '¿Cuánto vale mi inventario?',
      '¿Qué productos tienen baja rotación?',
      '¿Qué debo reabastecer esta semana?',
      '¿Qué productos debo transferir entre almacenes?'
    ]
  },
  {
    key:'crm',
    match:path=>path==='/crm'||path==='/terceros',
    label:'CRM y Clientes',
    suggestions:[
      '¿Qué oportunidades están por cerrar?',
      '¿Qué clientes necesitan seguimiento?',
      '¿Quiénes tienen saldos vencidos?',
      '¿A qué clientes debería contactar hoy?',
      '¿Qué oportunidades llevan más tiempo sin avanzar?'
    ]
  },
  {
    key:'finance',
    match:path=>path.startsWith('/finanzas')||path==='/gastos'||path==='/activos-fijos',
    label:'Finanzas',
    suggestions:[
      '¿Cuánto tengo por cobrar?',
      '¿Qué pagos vencen esta semana?',
      '¿Cómo va mi flujo de efectivo?',
      '¿Qué gastos aumentaron este mes?',
      '¿Qué movimientos afectan más mi liquidez?'
    ]
  },
  {
    key:'hr',
    match:path=>path.startsWith('/recursos-humanos'),
    label:'Recursos Humanos',
    suggestions:[
      '¿Quién tiene incidencias pendientes?',
      '¿Cuántas faltas hubo este mes?',
      '¿Qué vacaciones están pendientes?',
      '¿Cómo va el costo de nómina?',
      '¿Qué empleados tienen trámites pendientes?'
    ]
  },
  {
    key:'production',
    match:path=>path==='/produccion',
    label:'Producción',
    suggestions:[
      '¿Qué órdenes de producción están retrasadas?',
      '¿Qué materiales están por agotarse?',
      '¿Qué centro de trabajo tiene más carga?',
      '¿Cómo va el costo real contra el planeado?',
      '¿Qué orden debería priorizar hoy?'
    ]
  },
  {
    key:'projects',
    match:path=>path==='/proyectos',
    label:'Proyectos',
    suggestions:[
      '¿Qué proyectos están retrasados?',
      '¿Qué tareas requieren atención hoy?',
      '¿Qué proyecto está consumiendo más presupuesto?',
      '¿Qué entregables vencen esta semana?',
      '¿Qué proyecto tiene mayor riesgo?'
    ]
  },
  {
    key:'marketing',
    match:path=>path==='/marketing',
    label:'Marketing',
    suggestions:[
      '¿Qué campaña tiene mejor retorno?',
      '¿Dónde estamos gastando más?',
      '¿Qué canal genera más oportunidades?',
      '¿Qué campañas necesitan optimización?',
      '¿Qué oportunidad de marketing debería priorizar?'
    ]
  },
  {
    key:'intelligence',
    match:path=>path==='/inteligencia'||path==='/reportes',
    label:'Inteligencia',
    suggestions:[
      '¿Qué cambió en el negocio esta semana?',
      '¿Qué indicadores requieren atención?',
      '¿Qué tendencias debo vigilar?',
      '¿Cuál es la salud general de la empresa?',
      '¿Qué indicador cambió más contra el periodo anterior?'
    ]
  },
  {
    key:'system',
    match:path=>['/flow','/integration-hub','/datos-maestros','/data-hub'].some(x=>path.startsWith(x)),
    label:'Sistema',
    suggestions:[
      '¿Qué automatizaciones tuvieron errores?',
      '¿Hay integraciones pendientes?',
      '¿Qué problemas de calidad de datos existen?',
      '¿Qué procesos puedo automatizar?',
      '¿Qué integración o automatización requiere atención?'
    ]
  }
];

const home={
  key:'home',
  label:'Tu empresa',
  suggestions:[
    '¿Por qué cambiaron las ventas esta semana?',
    'Muéstrame los productos más vendidos',
    '¿Qué clientes tienen saldos vencidos?',
    '¿Qué requiere mi atención hoy?',
    '¿Dónde tengo la mayor oportunidad de mejora?'
  ]
};

export function getAIContext(pathname='/'){
  return contexts.find(context=>context.match(pathname))||home;
}
