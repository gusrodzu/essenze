import bcrypt from 'bcryptjs';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  ['dashboard.read', 'Ver dashboard'],
  ['users.manage', 'Administrar usuarios'],
  ['roles.manage', 'Administrar roles'],
  ['purchases.read', 'Ver compras'],
  ['inventory.read', 'Ver inventario'],
  ['warehouses.read', 'Ver almacenes'],
  ['warehouses.manage', 'Administrar almacenes'],
  ['suppliers.read', 'Ver proveedores'],
  ['suppliers.manage', 'Administrar proveedores'],
  ['products.read', 'Ver productos'],
  ['products.manage', 'Administrar productos'],
  ['purchase_requests.read', 'Ver solicitudes de compra'],
  ['purchase_requests.create', 'Crear solicitudes de compra'],
  ['purchase_requests.approve', 'Aprobar solicitudes de compra'],
  ['approvals.read', 'Consultar bandeja y solicitudes de aprobación'],
  ['approvals.manage', 'Administrar workflows y reglas de aprobación'],
  ['approvals.decide', 'Aprobar o rechazar solicitudes asignadas'],
  ['purchase_orders.read', 'Ver órdenes de compra'],
  ['purchase_orders.create', 'Crear órdenes de compra'],
  ['purchase_orders.issue', 'Emitir órdenes de compra'],
  ['purchase_orders.receive', 'Recibir órdenes de compra'],
  ['goods_receipts.read', 'Ver recepciones de mercancía'],
  ['goods_receipts.create', 'Registrar recepciones de mercancía'],
  ['inventory_movements.read', 'Ver movimientos de inventario'],
  ['inventory_adjustments.manage', 'Registrar ajustes de inventario'],
  ['inventory_transfers.manage', 'Registrar transferencias entre almacenes'],
  ['accounts_payable.read', 'Ver cuentas por pagar'],
  ['accounts_payable.manage', 'Administrar cuentas por pagar'],
  ['accounts_payable.pay', 'Registrar pagos a proveedores'],
  ['customers.read', 'Ver clientes'],
  ['customers.manage', 'Administrar clientes'],
  ['accounts_receivable.read', 'Ver cuentas por cobrar'],
  ['accounts_receivable.manage', 'Administrar cuentas por cobrar'],
  ['accounts_receivable.collect', 'Registrar cobros de clientes'],
  ['employees.read', 'Ver empleados y estructura organizacional'],
  ['employees.manage', 'Administrar empleados, departamentos y puestos'],
  ['attendance.read', 'Ver asistencias'],
  ['attendance.manage', 'Administrar asistencias'],
  ['leave_requests.read', 'Ver vacaciones y permisos'],
  ['leave_requests.manage', 'Administrar vacaciones y permisos'],
  ['hr_incidents.read', 'Ver incidencias de RH'],
  ['hr_incidents.manage', 'Administrar incidencias de RH'],
  ['employee_documents.read', 'Ver expedientes y documentos laborales'],
  ['employee_documents.manage', 'Administrar expedientes y documentos laborales'],
  ['payroll.read', 'Ver prenómina y periodos de pago'],
  ['payroll.manage', 'Crear y calcular periodos de prenómina'],
  ['payroll.approve', 'Aprobar y marcar nóminas como pagadas'],
  ['reports.read', 'Consultar reportes ejecutivos y operativos'],
  ['audit.read', 'Consultar bitácora y actividad del sistema'],
  ['notifications.manage', 'Crear y administrar notificaciones'],
  ['treasury.read', 'Consultar cajas, bancos y movimientos de tesorería'],
  ['treasury.manage', 'Administrar cuentas de caja y bancos'],
  ['treasury.move', 'Registrar movimientos y transferencias de tesorería'],
  ['budgets.read', 'Consultar presupuestos y centros de costo'],
  ['budgets.manage', 'Administrar presupuestos y centros de costo'],
  ['budgets.approve', 'Activar, cerrar o cancelar presupuestos'],
  ['modules.read', 'Consultar módulos habilitados, planes y límites de la empresa'],
  ['modules.manage', 'Administrar módulos, features, planes y suscripciones'],
  ['pos.read', 'Consultar terminales, cajas, ventas y pagos POS'],
  ['pos.manage', 'Administrar sesiones, ventas, pagos y movimientos de caja POS'],
  ['production.read', 'Consultar producción, BOM, operaciones, consumos y costos'],
  ['production.manage', 'Administrar órdenes de producción, operaciones, materiales y salidas'],
  ['fiscal.read', 'Consultar facturación fiscal, CFDI y complementos de pago'],
  ['fiscal.manage', 'Administrar perfiles fiscales, CFDI, cancelaciones y complementos'],
  ['marketing.read', 'Consultar campañas, calendario y rendimiento de marketing'],
  ['marketing.manage', 'Crear y administrar campañas, gastos, atribución y calendario'],
  ['projects.read', 'Consultar proyectos, tareas, equipo y costos'],
  ['projects.manage', 'Crear y administrar proyectos, tareas y tiempos'],
  ['sales.read', 'Consultar cotizaciones y pedidos de venta'],
  ['sales.manage', 'Crear y administrar cotizaciones y pedidos'],
  ['sales.approve', 'Confirmar, entregar, facturar o cancelar pedidos'],
  ['sales.pipeline', 'Administrar prospectos y pipeline comercial'],
  ['sales.fulfillment', 'Registrar remisiones y facturación comercial'],
  ['sales.returns', 'Registrar devoluciones y notas de crédito'],
  ['collections.read', 'Consultar cobranza y aplicaciones de pago'],
  ['collections.manage', 'Registrar y aplicar pagos de clientes'],
  ['reconciliation.read', 'Consultar conciliaciones bancarias'],
  ['reconciliation.manage', 'Capturar y conciliar movimientos bancarios'],
  ['reconciliation.approve', 'Cerrar conciliaciones bancarias'],
  ['cashflow.read', 'Consultar flujo de efectivo y proyecciones'],
  ['cashflow.manage', 'Administrar escenarios y ajustes de flujo'],
  ['cashflow.approve', 'Activar y archivar escenarios financieros'],
  ['accounting.read', 'Consultar catálogo, pólizas y balanza contable'],
  ['accounting.manage', 'Crear cuentas, periodos y pólizas contables'],
  ['accounting.approve', 'Contabilizar pólizas y cerrar periodos'],

  ['master_data.read', 'Consultar datos maestros'],
  ['master_data.manage', 'Administrar calidad y catálogos maestros'],
  ['business_parties.read', 'Consultar terceros y roles empresariales'],
  ['business_parties.manage', 'Administrar terceros, contactos, direcciones, tags y fusiones seguras'],
  ['business_parties.sync', 'Sincronizar clientes y proveedores con el núcleo de terceros'],
  ['data_hub.read', 'Consultar Data Hub e importaciones'],
  ['data_hub.import', 'Preparar y ejecutar importaciones de datos'],
  ['data_hub.rollback', 'Revertir lotes de importación del Data Hub'],

  ['integrations.read', 'Consultar integraciones, API Keys y webhooks'],
  ['integrations.manage', 'Administrar conexiones y webhooks'],
  ['integrations.keys', 'Crear y revocar API Keys'],
  ['integrations.test', 'Ejecutar pruebas de webhooks'],

  ['flow.run', 'Ejecutar y probar automatizaciones BuzzBee Flow'],

  ['ai.read', 'Consultar BuzzBee AI con datos permitidos del ERP'],
  ['intelligence.read', 'Consultar BuzzBee Intelligence e insights'],
  ['intelligence.manage', 'Administrar métricas e insights de BuzzBee Intelligence'],
  ['intelligence.scan', 'Ejecutar análisis de BuzzBee Intelligence'],
];

async function main() {
  const company = await prisma.company.upsert({
    where: {taxId: 'XAXX010101000'},
    update: {},
    create: {
      name: 'Empresa Cliente',
      legalName: 'Empresa Cliente, S.A. de C.V.',
      taxId: 'XAXX010101000',
      email: 'contacto@empresa.local',
    },
  });

  const branch = await prisma.branch.upsert({
    where: {companyId_code: {companyId: company.id, code: 'MTY'}},
    update: {},
    create: {companyId: company.id, name: 'Sucursal Monterrey', code: 'MTY'},
  });

  await prisma.warehouse.upsert({
    where: {branchId_code: {branchId: branch.id, code: 'GEN'}},
    update: {},
    create: {branchId: branch.id, name: 'Almacén General', code: 'GEN'},
  });

  await prisma.productCategory.upsert({
    where: {companyId_code: {companyId: company.id, code: 'GENERAL'}},
    update: {},
    create: {companyId: company.id, name: 'General', code: 'GENERAL'},
  });

  await prisma.supplier.upsert({
    where: {companyId_code: {companyId: company.id, code: 'PROV-001'}},
    update: {},
    create: {
      companyId: company.id,
      code: 'PROV-001',
      legalName: 'Proveedor Demo, S.A. de C.V.',
      commercialName: 'Proveedor Demo',
      taxId: 'PDE010101AAA',
      email: 'ventas@proveedor.local',
      paymentTerms: 30,
    },
  });

  await prisma.customer.upsert({
    where: {companyId_code: {companyId: company.id, code: 'CLI-001'}},
    update: {},
    create: {companyId: company.id, code: 'CLI-001', legalName: 'Cliente Demo, S.A. de C.V.', commercialName: 'Cliente Demo', taxId: 'CDE010101AAA', email: 'compras@cliente.local', creditDays: 30, creditLimit: 100000},
  });


  const department = await prisma.department.upsert({
    where: {companyId_code: {companyId: company.id, code: 'ADM'}},
    update: {},
    create: {companyId: company.id, code: 'ADM', name: 'Administración'},
  });
  const position = await prisma.position.upsert({
    where: {companyId_code: {companyId: company.id, code: 'DIR-ADM'}},
    update: {},
    create: {companyId: company.id, departmentId: department.id, code: 'DIR-ADM', name: 'Dirección Administrativa'},
  });
  await prisma.employee.upsert({
    where: {companyId_employeeNumber: {companyId: company.id, employeeNumber: 'EMP-001'}},
    update: {},
    create: {companyId: company.id, branchId: branch.id, departmentId: department.id, positionId: position.id, employeeNumber: 'EMP-001', firstName: 'Empleado', lastName: 'Demo', email: 'empleado@empresa.local', hireDate: new Date('2026-01-15'), salary: 25000},
  });

  const createdPermissions = [];
  for (const [key, name] of permissions) {
    createdPermissions.push(
      await prisma.permission.upsert({where: {key}, update: {name}, create: {key, name}}),
    );
  }

  const role = await prisma.role.upsert({
    where: {name: 'Administrador'},
    update: {description: 'Acceso total al ERP'},
    create: {name: 'Administrador', description: 'Acceso total al ERP'},
  });

  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {roleId_permissionId: {roleId: role.id, permissionId: permission.id}},
      update: {},
      create: {roleId: role.id, permissionId: permission.id},
    });
  }

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const user = await prisma.user.upsert({
    where: {email: 'admin@erp.local'},
    update: {passwordHash, active: true, companyId: company.id},
    create: {
      companyId: company.id,
      firstName: 'Gustavo',
      lastName: 'Rodríguez',
      email: 'admin@erp.local',
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {userId_roleId: {userId: user.id, roleId: role.id}},
    update: {},
    create: {userId: user.id, roleId: role.id},
  });

  // Workflows base Procure-to-Pay. Son configurables desde BuzzBee Aprobaciones.
  const purchaseRequestWorkflow = await prisma.approvalWorkflow.upsert({
    where: {companyId_key: {companyId: company.id, key: 'purchase_request_default'}},
    update: {
      name: 'Aprobación de solicitud de compra',
      description: 'Workflow base para SOLPED antes de convertirla en Orden de Compra.',
      entityType: 'PURCHASE_REQUEST',
      active: true,
      priority: 100,
    },
    create: {
      companyId: company.id,
      key: 'purchase_request_default',
      name: 'Aprobación de solicitud de compra',
      description: 'Workflow base para SOLPED antes de convertirla en Orden de Compra.',
      entityType: 'PURCHASE_REQUEST',
      active: true,
      priority: 100,
    },
  });

  await prisma.approvalRule.upsert({
    where: {workflowId_sequence: {workflowId: purchaseRequestWorkflow.id, sequence: 1}},
    update: {
      name: 'Autorización de compras',
      actorType: 'PERMISSION',
      permissionKey: 'purchase_requests.approve',
      required: true,
    },
    create: {
      workflowId: purchaseRequestWorkflow.id,
      sequence: 1,
      name: 'Autorización de compras',
      actorType: 'PERMISSION',
      permissionKey: 'purchase_requests.approve',
      required: true,
    },
  });

  const purchaseOrderWorkflow = await prisma.approvalWorkflow.upsert({
    where: {companyId_key: {companyId: company.id, key: 'purchase_order_default'}},
    update: {
      name: 'Aprobación de orden de compra',
      description: 'Workflow base antes de emitir una OC al proveedor.',
      entityType: 'PURCHASE_ORDER',
      active: true,
      priority: 100,
    },
    create: {
      companyId: company.id,
      key: 'purchase_order_default',
      name: 'Aprobación de orden de compra',
      description: 'Workflow base antes de emitir una OC al proveedor.',
      entityType: 'PURCHASE_ORDER',
      active: true,
      priority: 100,
    },
  });

  await prisma.approvalRule.upsert({
    where: {workflowId_sequence: {workflowId: purchaseOrderWorkflow.id, sequence: 1}},
    update: {
      name: 'Autorización de emisión',
      actorType: 'PERMISSION',
      permissionKey: 'purchase_orders.issue',
      required: true,
    },
    create: {
      workflowId: purchaseOrderWorkflow.id,
      sequence: 1,
      name: 'Autorización de emisión',
      actorType: 'PERMISSION',
      permissionKey: 'purchase_orders.issue',
      required: true,
    },
  });

  
  const accountingSeedAccounts = [
    ['1010', 'Caja', 'ASSET', 'DEBIT'],
    ['1020', 'Bancos', 'ASSET', 'DEBIT'],
    ['1050', 'Clientes', 'ASSET', 'DEBIT'],
    ['1190', 'IVA acreditable', 'ASSET', 'DEBIT'],
    ['2010', 'Proveedores', 'LIABILITY', 'CREDIT'],
    ['2080', 'IVA trasladado', 'LIABILITY', 'CREDIT'],
    ['3010', 'Capital social', 'EQUITY', 'CREDIT'],
    ['4010', 'Ventas', 'REVENUE', 'CREDIT'],
    ['4090', 'Otros ingresos', 'REVENUE', 'CREDIT'],
    ['5010', 'Compras y costo directo', 'EXPENSE', 'DEBIT'],
    ['5090', 'Gastos generales', 'EXPENSE', 'DEBIT'],
  ];

  for (const [code, name, type, nature] of accountingSeedAccounts) {
    await prisma.accountingAccount.upsert({
      where: {companyId_code: {companyId: company.id, code}},
      update: {},
      create: {
        companyId: company.id,
        code,
        name,
        type,
        nature,
        allowsPosting: true,
        active: true,
      },
    });
  }

console.log('Seed completado. Usuario: admin@erp.local / Admin123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
