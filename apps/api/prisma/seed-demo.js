import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

const d = (value) => new Date(`${value}T12:00:00.000Z`);
const money = (value) => Number(value.toFixed(2));

async function main() {
  const company = await prisma.company.findUnique({
    where: {taxId: 'XAXX010101000'},
  });

  if (!company) {
    throw new Error(
      'Primero ejecuta npm run db:seed para crear la empresa y el usuario administrador.',
    );
  }

  const user = await prisma.user.findUnique({
    where: {email: 'admin@erp.local'},
  });

  if (!user) {
    throw new Error('No se encontró admin@erp.local. Ejecuta primero npm run db:seed.');
  }

  console.log('Limpiando transacciones demo anteriores...');

  // Orden inverso de dependencias para que el script sea repetible.

  await prisma.posDiscount.deleteMany({where:{sale:{companyId:company.id,folio:{startsWith:'POS-DEMO-'}}}});
  await prisma.posPayment.deleteMany({where:{sale:{companyId:company.id,folio:{startsWith:'POS-DEMO-'}}}});
  await prisma.posSaleItem.deleteMany({where:{sale:{companyId:company.id,folio:{startsWith:'POS-DEMO-'}}}});
  await prisma.posSale.deleteMany({where:{companyId:company.id,folio:{startsWith:'POS-DEMO-'}}});
  await prisma.posCashMovement.deleteMany({where:{companyId:company.id,session:{terminal:{code:{startsWith:'POS-DEMO-'}}}}});
  await prisma.posSession.deleteMany({where:{companyId:company.id,terminal:{code:{startsWith:'POS-DEMO-'}}}});
  await prisma.posTerminal.deleteMany({where:{companyId:company.id,code:{startsWith:'POS-DEMO-'}}});

  await prisma.productionBatch.deleteMany({where:{companyId:company.id,productionOrder:{folio:{startsWith:'PROD-DEMO-'}}}});
  await prisma.productionCost.deleteMany({where:{companyId:company.id,productionOrder:{folio:{startsWith:'PROD-DEMO-'}}}});
  await prisma.productionWaste.deleteMany({where:{productionOrder:{companyId:company.id,folio:{startsWith:'PROD-DEMO-'}}}});
  await prisma.productionConsumption.deleteMany({where:{productionOrder:{companyId:company.id,folio:{startsWith:'PROD-DEMO-'}}}});
  await prisma.productionOperation.deleteMany({where:{productionOrder:{companyId:company.id,folio:{startsWith:'PROD-DEMO-'}}}});
  await prisma.productionOrderOutput.deleteMany({where:{productionOrder:{companyId:company.id,folio:{startsWith:'PROD-DEMO-'}}}});
  await prisma.productionOrderMaterial.deleteMany({where:{productionOrder:{companyId:company.id,folio:{startsWith:'PROD-DEMO-'}}}});
  await prisma.productionOrder.deleteMany({where:{companyId:company.id,folio:{startsWith:'PROD-DEMO-'}}});
  await prisma.billOfMaterialsItem.deleteMany({where:{bom:{companyId:company.id,code:{startsWith:'BOM-DEMO-'}}}});
  await prisma.billOfMaterials.deleteMany({where:{companyId:company.id,code:{startsWith:'BOM-DEMO-'}}});
  await prisma.productionWorkCenter.deleteMany({where:{companyId:company.id,code:{startsWith:'WC-DEMO-'}}});

  await prisma.fiscalPaymentRelatedDocument.deleteMany({
    where: {fiscalInvoice: {companyId: company.id, folio: {startsWith: 'CFDI-DEMO-'}}},
  });
  await prisma.fiscalPayment.deleteMany({
    where: {paymentComplement: {companyId: company.id, folio: {startsWith: 'CP-DEMO-'}}},
  });
  await prisma.fiscalPaymentComplement.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'CP-DEMO-'}},
  });
  await prisma.fiscalCancellation.deleteMany({
    where: {companyId: company.id, fiscalInvoice: {folio: {startsWith: 'CFDI-DEMO-'}}},
  });
  await prisma.fiscalInvoiceTax.deleteMany({
    where: {item: {fiscalInvoice: {companyId: company.id, folio: {startsWith: 'CFDI-DEMO-'}}}},
  });
  await prisma.fiscalInvoiceItem.deleteMany({
    where: {fiscalInvoice: {companyId: company.id, folio: {startsWith: 'CFDI-DEMO-'}}},
  });
  await prisma.fiscalInvoice.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'CFDI-DEMO-'}},
  });

  await prisma.marketingMetric.deleteMany({
    where: {companyId: company.id, campaign: {code: {startsWith: 'MKT-DEMO-'}}},
  });
  await prisma.marketingCalendarEvent.deleteMany({
    where: {companyId: company.id, OR: [{title: {startsWith: '[DEMO]'}}, {campaign: {code: {startsWith: 'MKT-DEMO-'}}}]},
  });
  await prisma.marketingCampaignExpense.deleteMany({
    where: {companyId: company.id, campaign: {code: {startsWith: 'MKT-DEMO-'}}},
  });
  await prisma.marketingCampaignOpportunity.deleteMany({
    where: {campaign: {companyId: company.id, code: {startsWith: 'MKT-DEMO-'}}},
  });
  await prisma.marketingCampaignLead.deleteMany({
    where: {campaign: {companyId: company.id, code: {startsWith: 'MKT-DEMO-'}}},
  });
  await prisma.marketingCampaign.deleteMany({
    where: {companyId: company.id, code: {startsWith: 'MKT-DEMO-'}},
  });
  await prisma.marketingChannel.deleteMany({
    where: {companyId: company.id, name: {startsWith: '[DEMO]'}},
  });
  await prisma.journalLine.deleteMany({
    where: {entry: {companyId: company.id, folio: {startsWith: 'POL-DEMO-'}}},
  });
  await prisma.journalEntry.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'POL-DEMO-'}},
  });
  await prisma.cashFlowAdjustment.deleteMany({
    where: {companyId: company.id, scenario: {name: {startsWith: 'Demo'}}},
  });
  await prisma.cashFlowScenario.deleteMany({
    where: {companyId: company.id, name: {startsWith: 'Demo'}},
  });
  await prisma.bankStatementLine.deleteMany({
    where: {companyId: company.id, bankStatement: {folio: {startsWith: 'CON-DEMO-'}}},
  });
  await prisma.bankStatement.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'CON-DEMO-'}},
  });
  await prisma.collectionApplication.deleteMany({
    where: {companyId: company.id, collectionReceipt: {folio: {startsWith: 'COB-DEMO-'}}},
  });
  await prisma.collectionReceipt.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'COB-DEMO-'}},
  });
  await prisma.salesCreditNote.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'NC-DEMO-'}},
  });
  await prisma.salesReturnItem.deleteMany({
    where: {salesReturn: {companyId: company.id, folio: {startsWith: 'DEV-DEMO-'}}},
  });
  await prisma.salesReturn.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'DEV-DEMO-'}},
  });
  await prisma.salesDeliveryItem.deleteMany({
    where: {salesDelivery: {companyId: company.id, folio: {startsWith: 'REM-DEMO-'}}},
  });
  await prisma.salesDelivery.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'REM-DEMO-'}},
  });
  await prisma.salesInvoice.deleteMany({
    where: {companyId: company.id, invoiceNumber: {startsWith: 'FAC-DEMO-'}},
  });
  await prisma.salesActivity.deleteMany({
    where: {
      companyId: company.id,
      OR: [
        {title: {startsWith: '[DEMO]'}},
        {description: {startsWith: '[DEMO]'}},
      ],
    },
  });
  await prisma.salesOrderItem.deleteMany({
    where: {salesOrder: {companyId: company.id, folio: {startsWith: 'PED-DEMO-'}}},
  });
  await prisma.salesOrder.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'PED-DEMO-'}},
  });
  await prisma.salesQuoteItem.deleteMany({
    where: {salesQuote: {companyId: company.id, folio: {startsWith: 'COT-DEMO-'}}},
  });
  await prisma.salesQuote.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'COT-DEMO-'}},
  });
  await prisma.prospect.deleteMany({
    where: {companyId: company.id, source: 'Datos demo'},
  });
  await prisma.supplierPayment.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'PAG-DEMO-'}},
  });
  await prisma.customerPayment.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'COB-HIST-DEMO-'}},
  });
  await prisma.accountsPayable.deleteMany({
    where: {companyId: company.id, invoiceNumber: {startsWith: 'PROV-DEMO-'}},
  });
  await prisma.accountsReceivable.deleteMany({
    where: {companyId: company.id, invoiceNumber: {startsWith: 'CLI-DEMO-'}},
  });
  await prisma.inventoryMovement.deleteMany({
    where: {companyId: company.id, reference: {startsWith: 'DEMO-'}},
  });
  await prisma.inventoryAdjustmentItem.deleteMany({
    where: {adjustment: {companyId: company.id, folio: {startsWith: 'AJ-DEMO-'}}},
  });
  await prisma.inventoryAdjustment.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'AJ-DEMO-'}},
  });
  await prisma.inventoryTransferItem.deleteMany({
    where: {transfer: {companyId: company.id, folio: {startsWith: 'TR-DEMO-'}}},
  });
  await prisma.inventoryTransfer.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'TR-DEMO-'}},
  });
  await prisma.goodsReceiptItem.deleteMany({
    where: {goodsReceipt: {companyId: company.id, folio: {startsWith: 'REC-DEMO-'}}},
  });
  await prisma.goodsReceipt.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'REC-DEMO-'}},
  });
  await prisma.purchaseOrderItem.deleteMany({
    where: {purchaseOrder: {companyId: company.id, folio: {startsWith: 'OC-DEMO-'}}},
  });
  await prisma.purchaseOrder.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'OC-DEMO-'}},
  });
  await prisma.purchaseRequestItem.deleteMany({
    where: {purchaseRequest: {companyId: company.id, folio: {startsWith: 'SOL-DEMO-'}}},
  });
  await prisma.purchaseRequest.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'SOL-DEMO-'}},
  });
  await prisma.payrollItem.deleteMany({
    where: {companyId: company.id, payrollPeriod: {folio: {startsWith: 'NOM-DEMO-'}}},
  });
  await prisma.payrollPeriod.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'NOM-DEMO-'}},
  });
  await prisma.attendanceRecord.deleteMany({
    where: {companyId: company.id, notes: {startsWith: '[DEMO]'}},
  });
  await prisma.leaveRequest.deleteMany({
    where: {companyId: company.id, reason: {startsWith: '[DEMO]'}},
  });
  await prisma.hrIncident.deleteMany({
    where: {companyId: company.id, description: {startsWith: '[DEMO]'}},
  });
  await prisma.employeeDocument.deleteMany({
    where: {companyId: company.id, notes: {startsWith: '[DEMO]'}},
  });
  await prisma.notification.deleteMany({
    where: {companyId: company.id, title: {startsWith: '[DEMO]'}},
  });
  await prisma.treasuryMovement.deleteMany({
    where: {companyId: company.id, folio: {startsWith: 'MOV-DEMO-'}},
  });
  await prisma.budgetLine.deleteMany({
    where: {companyId: company.id, budget: {name: {startsWith: 'Demo'}}},
  });
  await prisma.budget.deleteMany({
    where: {companyId: company.id, name: {startsWith: 'Demo'}},
  });

  console.log('Creando estructura organizacional demo...');

  const branches = {};
  for (const row of [
    ['MTY', 'Sucursal Monterrey', 'Av. Constitución 2400, Monterrey, N.L.'],
    ['CDMX', 'Sucursal Ciudad de México', 'Paseo de la Reforma 350, CDMX'],
    ['GDL', 'Sucursal Guadalajara', 'Av. Vallarta 1800, Guadalajara, Jal.'],
  ]) {
    branches[row[0]] = await prisma.branch.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {name: row[1], address: row[2], active: true},
      create: {
        companyId: company.id,
        code: row[0],
        name: row[1],
        address: row[2],
      },
    });
  }

  const warehouses = {};
  for (const row of [
    ['MTY', 'GEN', 'Almacén General Monterrey'],
    ['MTY', 'REF', 'Almacén de Refacciones'],
    ['CDMX', 'GEN', 'Almacén General CDMX'],
    ['GDL', 'GEN', 'Almacén General Guadalajara'],
  ]) {
    const key = `${row[0]}-${row[1]}`;
    warehouses[key] = await prisma.warehouse.upsert({
      where: {
        branchId_code: {
          branchId: branches[row[0]].id,
          code: row[1],
        },
      },
      update: {name: row[2], active: true},
      create: {
        branchId: branches[row[0]].id,
        code: row[1],
        name: row[2],
      },
    });
  }

  const categories = {};
  for (const row of [
    ['EQUIPO', 'Equipo tecnológico'],
    ['OFICINA', 'Mobiliario y oficina'],
    ['CONSUMIBLE', 'Consumibles'],
    ['SERVICIO', 'Servicios'],
  ]) {
    categories[row[0]] = await prisma.productCategory.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {name: row[1], active: true},
      create: {companyId: company.id, code: row[0], name: row[1]},
    });
  }

  const productRows = [
    ['LAP-PRO-14', 'Laptop empresarial 14"', 'EQUIPO', 18200, 26400, 8],
    ['MON-27-4K', 'Monitor profesional 27" 4K', 'EQUIPO', 6100, 8990, 10],
    ['DOCK-USBC', 'Docking station USB-C', 'EQUIPO', 2450, 3890, 12],
    ['SILLA-ERG', 'Silla ergonómica ejecutiva', 'OFICINA', 4200, 6900, 6],
    ['ESCR-140', 'Escritorio modular 140 cm', 'OFICINA', 3100, 5290, 5],
    ['TONER-BK', 'Tóner negro alto rendimiento', 'CONSUMIBLE', 980, 1590, 20],
    ['PAPEL-CARTA', 'Caja papel carta premium', 'CONSUMIBLE', 610, 890, 25],
    ['LIC-ERP', 'Licencia anual ERP por usuario', 'SERVICIO', 4200, 7200, 0],
    ['SOP-PLUS', 'Soporte técnico Plus mensual', 'SERVICIO', 1800, 3500, 0],
    ['IMP-ONBOARD', 'Implementación y onboarding', 'SERVICIO', 12000, 25000, 0],
  ];

  const products = {};
  for (const row of productRows) {
    products[row[0]] = await prisma.product.upsert({
      where: {companyId_sku: {companyId: company.id, sku: row[0]}},
      update: {
        name: row[1],
        categoryId: categories[row[2]].id,
        cost: row[3],
        price: row[4],
        minStock: row[5],
        active: true,
      },
      create: {
        companyId: company.id,
        sku: row[0],
        name: row[1],
        description: `Producto demo: ${row[1]}`,
        categoryId: categories[row[2]].id,
        unit: row[2] === 'SERVICIO' ? 'SERV' : 'PZA',
        cost: row[3],
        price: row[4],
        minStock: row[5],
      },
    });
  }

  const supplierRows = [
    ['PROV-TEC', 'Tecnología del Norte, S.A. de C.V.', 'TecNorte', 'Mariana López', 'ventas@tecnorte.mx', '81 8123 4500', 30],
    ['PROV-MOB', 'Mobiliario Corporativo MX, S.A. de C.V.', 'MobiCorp', 'Carlos Vela', 'pedidos@mobicorp.mx', '55 5200 8899', 45],
    ['PROV-OFC', 'Suministros de Oficina Nacionales, S.A.', 'OfiNacional', 'Laura Ríos', 'clientes@ofinacional.mx', '33 3120 4400', 15],
    ['PROV-SRV', 'Servicios Cloud Empresariales, S.A.', 'Cloud Empresa', 'Rodrigo Silva', 'facturacion@cloudempresa.mx', '81 9000 2211', 30],
  ];

  const suppliers = {};
  for (const row of supplierRows) {
    suppliers[row[0]] = await prisma.supplier.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {
        legalName: row[1],
        commercialName: row[2],
        contactName: row[3],
        email: row[4],
        phone: row[5],
        paymentTerms: row[6],
        active: true,
      },
      create: {
        companyId: company.id,
        code: row[0],
        legalName: row[1],
        commercialName: row[2],
        taxId: `RFC${row[0].replace('-', '')}`,
        contactName: row[3],
        email: row[4],
        phone: row[5],
        address: 'Dirección fiscal demo',
        paymentTerms: row[6],
      },
    });
  }

  const customerRows = [
    ['CLI-ACME', 'ACME Manufactura, S.A. de C.V.', 'ACME', 'Andrea Salinas', 'compras@acme.mx', 30, 450000],
    ['CLI-HORIZ', 'Corporativo Horizonte, S.A. de C.V.', 'Horizonte', 'Miguel Torres', 'administracion@horizonte.mx', 45, 350000],
    ['CLI-NOVA', 'Nova Retail México, S.A.', 'Nova Retail', 'Sofía Campos', 'proyectos@novaretail.mx', 30, 280000],
    ['CLI-URBAN', 'Urbania Desarrollos, S.A. de C.V.', 'Urbania', 'Raúl Méndez', 'sistemas@urbania.mx', 60, 600000],
    ['CLI-CLIN', 'Clínicas Integral del Norte, S.A.', 'Clínicas Integral', 'Fernanda Garza', 'compras@clinicaintegral.mx', 30, 220000],
    ['CLI-EDU', 'Instituto Avanza, A.C.', 'Instituto Avanza', 'Daniela Cruz', 'direccion@avanza.edu.mx', 15, 180000],
  ];

  const customers = {};
  for (const row of customerRows) {
    customers[row[0]] = await prisma.customer.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {
        legalName: row[1],
        commercialName: row[2],
        contactName: row[3],
        email: row[4],
        creditDays: row[5],
        creditLimit: row[6],
        active: true,
      },
      create: {
        companyId: company.id,
        code: row[0],
        legalName: row[1],
        commercialName: row[2],
        taxId: `RFC${row[0].replace('-', '')}`,
        contactName: row[3],
        email: row[4],
        phone: '81 8000 0000',
        address: 'Dirección comercial demo',
        creditDays: row[5],
        creditLimit: row[6],
      },
    });
  }

  console.log('Creando empleados, asistencias y nómina...');

  const deptRows = [
    ['DIR', 'Dirección'],
    ['COM', 'Comercial'],
    ['OPS', 'Operaciones'],
    ['FIN', 'Finanzas'],
    ['RH', 'Recursos Humanos'],
    ['TI', 'Tecnología'],
  ];
  const departments = {};
  for (const row of deptRows) {
    departments[row[0]] = await prisma.department.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {name: row[1], active: true},
      create: {companyId: company.id, code: row[0], name: row[1]},
    });
  }

  const positions = {};
  const positionRows = [
    ['DIR-GEN', 'Dirección General', 'DIR'],
    ['GER-COM', 'Gerencia Comercial', 'COM'],
    ['EJE-VTA', 'Ejecutivo de Ventas', 'COM'],
    ['GER-OPS', 'Gerencia de Operaciones', 'OPS'],
    ['ANL-INV', 'Analista de Inventario', 'OPS'],
    ['CON-FIN', 'Contador', 'FIN'],
    ['ANA-RH', 'Analista de RH', 'RH'],
    ['DEV-FE', 'Desarrollador Frontend', 'TI'],
  ];
  for (const row of positionRows) {
    positions[row[0]] = await prisma.position.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {
        name: row[1],
        departmentId: departments[row[2]].id,
        active: true,
      },
      create: {
        companyId: company.id,
        code: row[0],
        name: row[1],
        departmentId: departments[row[2]].id,
      },
    });
  }

  const employeeRows = [
    ['EMP-101', 'Ana', 'Martínez', 'GER-COM', 'MTY', 48000],
    ['EMP-102', 'Luis', 'Hernández', 'EJE-VTA', 'MTY', 28000],
    ['EMP-103', 'Carla', 'Santos', 'EJE-VTA', 'CDMX', 30000],
    ['EMP-104', 'Jorge', 'Ramírez', 'GER-OPS', 'MTY', 46000],
    ['EMP-105', 'Mónica', 'Flores', 'ANL-INV', 'GDL', 25000],
    ['EMP-106', 'Ricardo', 'Mendoza', 'CON-FIN', 'MTY', 34000],
    ['EMP-107', 'Paola', 'Navarro', 'ANA-RH', 'MTY', 29000],
    ['EMP-108', 'Diego', 'Castillo', 'DEV-FE', 'CDMX', 38000],
  ];

  const employees = {};
  for (const row of employeeRows) {
    const position = positions[row[3]];
    employees[row[0]] = await prisma.employee.upsert({
      where: {
        companyId_employeeNumber: {
          companyId: company.id,
          employeeNumber: row[0],
        },
      },
      update: {
        firstName: row[1],
        lastName: row[2],
        positionId: position.id,
        departmentId: position.departmentId,
        branchId: branches[row[4]].id,
        salary: row[5],
        status: 'ACTIVE',
      },
      create: {
        companyId: company.id,
        employeeNumber: row[0],
        firstName: row[1],
        lastName: row[2],
        email: `${row[1].toLowerCase()}.${row[2].toLowerCase()}@empresa.local`,
        phone: '81 8000 0000',
        positionId: position.id,
        departmentId: position.departmentId,
        branchId: branches[row[4]].id,
        hireDate: d('2025-02-03'),
        salary: row[5],
      },
    });
  }

  for (const employee of Object.values(employees)) {
    for (let day = 24; day <= 28; day += 1) {
      const date = d(`2026-08-${day}`);
      await prisma.attendanceRecord.upsert({
        where: {employeeId_date: {employeeId: employee.id, date}},
        update: {
          status: day === 27 && employee.employeeNumber === 'EMP-105' ? 'LATE' : 'PRESENT',
          notes: '[DEMO] Registro automático de asistencia',
        },
        create: {
          companyId: company.id,
          employeeId: employee.id,
          date,
          checkIn: new Date(`2026-08-${day}T14:00:00.000Z`),
          checkOut: new Date(`2026-08-${day}T23:00:00.000Z`),
          status: day === 27 && employee.employeeNumber === 'EMP-105' ? 'LATE' : 'PRESENT',
          notes: '[DEMO] Registro automático de asistencia',
        },
      });
    }
  }

  await prisma.leaveRequest.createMany({
    data: [
      {
        companyId: company.id,
        employeeId: employees['EMP-102'].id,
        type: 'VACATION',
        startDate: d('2026-09-14'),
        endDate: d('2026-09-18'),
        days: 5,
        status: 'APPROVED',
        reason: '[DEMO] Vacaciones programadas',
        resolution: 'Autorizadas por gerencia',
        resolvedAt: d('2026-08-29'),
      },
      {
        companyId: company.id,
        employeeId: employees['EMP-107'].id,
        type: 'PERSONAL',
        startDate: d('2026-09-07'),
        endDate: d('2026-09-07'),
        days: 1,
        status: 'PENDING',
        reason: '[DEMO] Trámite personal',
      },
    ],
  });

  await prisma.hrIncident.createMany({
    data: [
      {
        companyId: company.id,
        employeeId: employees['EMP-105'].id,
        type: 'LATE_ARRIVAL',
        date: d('2026-08-27'),
        description: '[DEMO] Retardo de 35 minutos',
      },
      {
        companyId: company.id,
        employeeId: employees['EMP-102'].id,
        type: 'BONUS',
        date: d('2026-08-31'),
        amount: 4500,
        description: '[DEMO] Bono por objetivo comercial',
      },
      {
        companyId: company.id,
        employeeId: employees['EMP-108'].id,
        type: 'OVERTIME',
        date: d('2026-08-30'),
        amount: 1800,
        description: '[DEMO] Horas extra por liberación',
      },
    ],
  });

  for (const employee of Object.values(employees)) {
    await prisma.employeeDocument.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: 'CONTRACT',
        name: 'Contrato laboral',
        fileName: `${employee.employeeNumber}-contrato.pdf`,
        fileUrl: '/demo/documentos/contrato.pdf',
        issuedAt: d('2025-02-03'),
        status: 'VALID',
        notes: '[DEMO] Documento de muestra',
      },
    });
  }

  await prisma.employeeDocument.create({
    data: {
      companyId: company.id,
      employeeId: employees['EMP-103'].id,
      type: 'ADDRESS_PROOF',
      name: 'Comprobante de domicilio',
      fileName: 'EMP-103-domicilio.pdf',
      expiresAt: d('2026-09-15'),
      status: 'EXPIRING',
      notes: '[DEMO] Próximo a vencer',
    },
  });

  const payrollItems = employeeRows.map((row) => {
    const base = row[5] / 2;
    const bonuses = row[0] === 'EMP-102' ? 4500 : 0;
    const overtime = row[0] === 'EMP-108' ? 1800 : 0;
    const deductions = money((base + bonuses + overtime) * 0.11);
    const gross = base + bonuses + overtime;
    return {
      employeeId: employees[row[0]].id,
      baseSalary: base,
      bonuses,
      overtime,
      deductions,
      grossPay: gross,
      netPay: money(gross - deductions),
    };
  });
  const payrollGross = payrollItems.reduce((sum, row) => sum + row.grossPay, 0);
  const payrollDeductions = payrollItems.reduce((sum, row) => sum + row.deductions, 0);

  const payroll = await prisma.payrollPeriod.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      folio: 'NOM-DEMO-2026-16',
      name: 'Segunda quincena de agosto 2026',
      startDate: d('2026-08-16'),
      endDate: d('2026-08-31'),
      paymentDate: d('2026-09-01'),
      status: 'APPROVED',
      totalGross: payrollGross,
      totalDeductions: payrollDeductions,
      totalNet: money(payrollGross - payrollDeductions),
      notes: 'Prenómina demo aprobada',
    },
  });

  await prisma.payrollItem.createMany({
    data: payrollItems.map((row) => ({
      companyId: company.id,
      payrollPeriodId: payroll.id,
      ...row,
    })),
  });

  console.log('Creando inventario y compras demo...');

  const balanceRows = [
    ['MTY-GEN', 'LAP-PRO-14', 14],
    ['MTY-GEN', 'MON-27-4K', 21],
    ['MTY-GEN', 'DOCK-USBC', 9],
    ['MTY-GEN', 'SILLA-ERG', 4],
    ['MTY-GEN', 'ESCR-140', 8],
    ['MTY-REF', 'TONER-BK', 11],
    ['MTY-REF', 'PAPEL-CARTA', 37],
    ['CDMX-GEN', 'LAP-PRO-14', 7],
    ['CDMX-GEN', 'MON-27-4K', 6],
    ['CDMX-GEN', 'DOCK-USBC', 13],
    ['GDL-GEN', 'SILLA-ERG', 9],
    ['GDL-GEN', 'TONER-BK', 26],
  ];

  for (const row of balanceRows) {
    const product = products[row[1]];
    await prisma.inventoryBalance.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: warehouses[row[0]].id,
          productId: product.id,
        },
      },
      update: {
        quantity: row[2],
        averageCost: product.cost,
      },
      create: {
        warehouseId: warehouses[row[0]].id,
        productId: product.id,
        quantity: row[2],
        averageCost: product.cost,
      },
    });
  }

  const pr1 = await prisma.purchaseRequest.create({
    data: {
      companyId: company.id,
      warehouseId: warehouses['MTY-GEN'].id,
      requestedById: user.id,
      folio: 'SOL-DEMO-0001',
      title: 'Renovación de equipo comercial',
      justification: 'Equipamiento para nuevas contrataciones',
      priority: 'HIGH',
      status: 'APPROVED',
      requiredDate: d('2026-09-15'),
      submittedAt: d('2026-08-20'),
      resolvedAt: d('2026-08-21'),
      resolvedById: user.id,
      resolutionNote: 'Aprobado dentro del presupuesto',
      items: {
        create: [
          {
            productId: products['LAP-PRO-14'].id,
            quantity: 8,
            estimatedUnitCost: 18200,
          },
          {
            productId: products['MON-27-4K'].id,
            quantity: 8,
            estimatedUnitCost: 6100,
          },
        ],
      },
    },
    include: {items: true},
  });

  await prisma.purchaseRequest.create({
    data: {
      companyId: company.id,
      warehouseId: warehouses['MTY-REF'].id,
      requestedById: user.id,
      folio: 'SOL-DEMO-0002',
      title: 'Reposición de consumibles',
      justification: 'Stock debajo del mínimo',
      priority: 'URGENT',
      status: 'PENDING',
      requiredDate: d('2026-09-05'),
      submittedAt: d('2026-08-30'),
      items: {
        create: [
          {
            productId: products['TONER-BK'].id,
            quantity: 30,
            estimatedUnitCost: 980,
          },
          {
            productId: products['PAPEL-CARTA'].id,
            quantity: 50,
            estimatedUnitCost: 610,
          },
        ],
      },
    },
  });

  const poSubtotal = 8 * 18200 + 8 * 6100;
  const poTax = poSubtotal * 0.16;
  const po = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id,
      supplierId: suppliers['PROV-TEC'].id,
      warehouseId: warehouses['MTY-GEN'].id,
      purchaseRequestId: pr1.id,
      createdById: user.id,
      folio: 'OC-DEMO-0001',
      status: 'PARTIALLY_RECEIVED',
      orderDate: d('2026-08-22'),
      expectedDate: d('2026-09-08'),
      paymentTerms: 30,
      subtotal: poSubtotal,
      taxAmount: poTax,
      total: poSubtotal + poTax,
      issuedAt: d('2026-08-22'),
      notes: 'Compra demo de equipo comercial',
      items: {
        create: [
          {
            productId: products['LAP-PRO-14'].id,
            quantity: 8,
            receivedQuantity: 5,
            unitCost: 18200,
            taxRate: 16,
            subtotal: 145600,
            taxAmount: 23296,
            total: 168896,
          },
          {
            productId: products['MON-27-4K'].id,
            quantity: 8,
            receivedQuantity: 4,
            unitCost: 6100,
            taxRate: 16,
            subtotal: 48800,
            taxAmount: 7808,
            total: 56608,
          },
        ],
      },
    },
    include: {items: true},
  });

  const receipt = await prisma.goodsReceipt.create({
    data: {
      companyId: company.id,
      purchaseOrderId: po.id,
      warehouseId: warehouses['MTY-GEN'].id,
      createdById: user.id,
      folio: 'REC-DEMO-0001',
      status: 'POSTED',
      receivedAt: d('2026-08-29'),
      supplierDocument: 'REM-TEC-8821',
      notes: 'Recepción parcial demo',
      items: {
        create: [
          {
            purchaseOrderItemId: po.items[0].id,
            productId: products['LAP-PRO-14'].id,
            quantity: 5,
            unitCost: 18200,
          },
          {
            purchaseOrderItemId: po.items[1].id,
            productId: products['MON-27-4K'].id,
            quantity: 4,
            unitCost: 6100,
          },
        ],
      },
    },
  });

  await prisma.inventoryMovement.createMany({
    data: [
      {
        companyId: company.id,
        warehouseId: warehouses['MTY-GEN'].id,
        productId: products['LAP-PRO-14'].id,
        goodsReceiptId: receipt.id,
        createdById: user.id,
        type: 'PURCHASE_RECEIPT',
        reference: 'DEMO-REC-0001',
        quantity: 5,
        unitCost: 18200,
        balanceAfter: 14,
        notes: 'Entrada por recepción demo',
        occurredAt: d('2026-08-29'),
      },
      {
        companyId: company.id,
        warehouseId: warehouses['MTY-GEN'].id,
        productId: products['MON-27-4K'].id,
        goodsReceiptId: receipt.id,
        createdById: user.id,
        type: 'PURCHASE_RECEIPT',
        reference: 'DEMO-REC-0001',
        quantity: 4,
        unitCost: 6100,
        balanceAfter: 21,
        notes: 'Entrada por recepción demo',
        occurredAt: d('2026-08-29'),
      },
      {
        companyId: company.id,
        warehouseId: warehouses['MTY-REF'].id,
        productId: products['TONER-BK'].id,
        createdById: user.id,
        type: 'ADJUSTMENT_OUT',
        reference: 'DEMO-AJ-0001',
        quantity: -3,
        unitCost: 980,
        balanceAfter: 11,
        notes: 'Consumo interno demo',
        occurredAt: d('2026-08-28'),
      },
    ],
  });

  await prisma.inventoryAdjustment.create({
    data: {
      companyId: company.id,
      warehouseId: warehouses['MTY-REF'].id,
      createdById: user.id,
      folio: 'AJ-DEMO-0001',
      reason: 'Consumo interno de operación',
      occurredAt: d('2026-08-28'),
      items: {
        create: [
          {
            productId: products['TONER-BK'].id,
            direction: 'OUT',
            quantity: 3,
            unitCost: 980,
          },
        ],
      },
    },
  });

  await prisma.inventoryTransfer.create({
    data: {
      companyId: company.id,
      fromWarehouseId: warehouses['MTY-GEN'].id,
      toWarehouseId: warehouses['CDMX-GEN'].id,
      createdById: user.id,
      folio: 'TR-DEMO-0001',
      status: 'POSTED',
      occurredAt: d('2026-08-26'),
      notes: 'Reabastecimiento sucursal CDMX',
      items: {
        create: [
          {
            productId: products['DOCK-USBC'].id,
            quantity: 4,
            unitCost: 2450,
          },
        ],
      },
    },
  });

  const ap1 = await prisma.accountsPayable.create({
    data: {
      companyId: company.id,
      supplierId: suppliers['PROV-TEC'].id,
      purchaseOrderId: po.id,
      createdById: user.id,
      invoiceNumber: 'PROV-DEMO-TEC-8821',
      issueDate: d('2026-08-29'),
      dueDate: d('2026-09-28'),
      subtotal: 121400,
      taxAmount: 19424,
      total: 140824,
      paidAmount: 60000,
      status: 'PARTIALLY_PAID',
      notes: 'Factura parcial de equipo',
    },
  });

  await prisma.accountsPayable.create({
    data: {
      companyId: company.id,
      supplierId: suppliers['PROV-MOB'].id,
      createdById: user.id,
      invoiceNumber: 'PROV-DEMO-MOB-1902',
      issueDate: d('2026-07-15'),
      dueDate: d('2026-08-29'),
      subtotal: 68400,
      taxAmount: 10944,
      total: 79344,
      paidAmount: 0,
      status: 'OVERDUE',
      notes: 'Factura vencida demo',
    },
  });

  await prisma.supplierPayment.create({
    data: {
      companyId: company.id,
      accountsPayableId: ap1.id,
      createdById: user.id,
      folio: 'PAG-DEMO-0001',
      amount: 60000,
      paymentDate: d('2026-08-31'),
      method: 'TRANSFERENCIA',
      reference: 'SPEI-289103',
      notes: 'Pago parcial demo',
    },
  });

  console.log('Creando ventas, CRM y cobranza demo...');

  const prospectsData = [
    ['María Elena Ruiz', 'Grupo Altavista', 'PROPOSAL', 380000, 70, 'LinkedIn'],
    ['Óscar Peña', 'Hoteles Camino Real del Norte', 'QUALIFIED', 240000, 50, 'Referido'],
    ['Valeria Suárez', 'Universidad Metropolitana', 'CONTACTED', 160000, 30, 'Evento'],
    ['Arturo Lozano', 'Logística Delta', 'LEAD', 95000, 15, 'Sitio web'],
    ['Sandra Villarreal', 'Constructora Nexus', 'WON', 420000, 100, 'Referido'],
    ['Eduardo Mora', 'Retail Uno', 'LOST', 110000, 0, 'Campaña'],
  ];

  const prospects = [];
  for (let index = 0; index < prospectsData.length; index += 1) {
    const row = prospectsData[index];
    const prospect = await prisma.prospect.create({
      data: {
        companyId: company.id,
        ownerId: user.id,
        name: row[0],
        companyName: row[1],
        email: `${row[0].toLowerCase().replaceAll(' ', '.')}@demo.mx`,
        phone: '81 7000 0000',
        stage: row[2],
        estimatedValue: row[3],
        probability: row[4],
        source: 'Datos demo',
        nextActionAt: d(`2026-09-${String(3 + index).padStart(2, '0')}`),
        notes: 'Oportunidad comercial de demostración',
      },
    });
    prospects.push(prospect);

    await prisma.salesActivity.create({
      data: {
        companyId: company.id,
        createdById: user.id,
        prospectId: prospect.id,
        type: index % 2 === 0 ? 'MEETING' : 'CALL',
        title: `[DEMO] Seguimiento con ${row[1]}`,
        description: `[DEMO] Revisión de alcance, presupuesto y próximos pasos.`,
        dueAt: prospect.nextActionAt,
      },
    });
  }

  const quoteSubtotal = 10 * 26400 + 10 * 3890 + 1 * 25000;
  const quoteTax = quoteSubtotal * 0.16;
  const quote = await prisma.salesQuote.create({
    data: {
      companyId: company.id,
      customerId: customers['CLI-ACME'].id,
      createdById: user.id,
      folio: 'COT-DEMO-0001',
      quoteDate: d('2026-08-10'),
      validUntil: d('2026-09-10'),
      status: 'CONVERTED',
      subtotal: quoteSubtotal,
      taxTotal: quoteTax,
      total: quoteSubtotal + quoteTax,
      notes: 'Proyecto de renovación tecnológica',
      terms: '50% anticipo, 50% contra entrega',
      items: {
        create: [
          {
            productId: products['LAP-PRO-14'].id,
            description: 'Laptops para equipo comercial',
            quantity: 10,
            unitPrice: 26400,
            taxRate: 16,
            subtotal: 264000,
            taxAmount: 42240,
            total: 306240,
          },
          {
            productId: products['DOCK-USBC'].id,
            quantity: 10,
            unitPrice: 3890,
            taxRate: 16,
            subtotal: 38900,
            taxAmount: 6224,
            total: 45124,
          },
          {
            productId: products['IMP-ONBOARD'].id,
            quantity: 1,
            unitPrice: 25000,
            taxRate: 16,
            subtotal: 25000,
            taxAmount: 4000,
            total: 29000,
          },
        ],
      },
    },
  });

  const order = await prisma.salesOrder.create({
    data: {
      companyId: company.id,
      customerId: customers['CLI-ACME'].id,
      salesQuoteId: quote.id,
      createdById: user.id,
      folio: 'PED-DEMO-0001',
      orderDate: d('2026-08-15'),
      deliveryDate: d('2026-08-28'),
      status: 'INVOICED',
      subtotal: quoteSubtotal,
      taxTotal: quoteTax,
      total: quoteSubtotal + quoteTax,
      shippingAddress: 'Parque Industrial Apodaca, Nuevo León',
      notes: 'Pedido principal demo',
      items: {
        create: [
          {
            productId: products['LAP-PRO-14'].id,
            description: 'Laptops para equipo comercial',
            quantity: 10,
            deliveredQty: 10,
            unitPrice: 26400,
            taxRate: 16,
            subtotal: 264000,
            taxAmount: 42240,
            total: 306240,
          },
          {
            productId: products['DOCK-USBC'].id,
            quantity: 10,
            deliveredQty: 10,
            unitPrice: 3890,
            taxRate: 16,
            subtotal: 38900,
            taxAmount: 6224,
            total: 45124,
          },
          {
            productId: products['IMP-ONBOARD'].id,
            quantity: 1,
            deliveredQty: 1,
            unitPrice: 25000,
            taxRate: 16,
            subtotal: 25000,
            taxAmount: 4000,
            total: 29000,
          },
        ],
      },
    },
    include: {items: true},
  });

  await prisma.salesQuote.create({
    data: {
      companyId: company.id,
      customerId: customers['CLI-HORIZ'].id,
      createdById: user.id,
      folio: 'COT-DEMO-0002',
      quoteDate: d('2026-08-27'),
      validUntil: d('2026-09-27'),
      status: 'SENT',
      subtotal: 188500,
      taxTotal: 30160,
      total: 218660,
      notes: 'Cotización abierta demo',
      items: {
        create: [
          {
            productId: products['LIC-ERP'].id,
            quantity: 20,
            unitPrice: 7200,
            taxRate: 16,
            subtotal: 144000,
            taxAmount: 23040,
            total: 167040,
          },
          {
            productId: products['SOP-PLUS'].id,
            quantity: 10,
            unitPrice: 3500,
            taxRate: 16,
            subtotal: 35000,
            taxAmount: 5600,
            total: 40600,
          },
          {
            productId: products['IMP-ONBOARD'].id,
            quantity: 0.38,
            unitPrice: 25000,
            taxRate: 16,
            subtotal: 9500,
            taxAmount: 1520,
            total: 11020,
          },
        ],
      },
    },
  });

  const delivery = await prisma.salesDelivery.create({
    data: {
      companyId: company.id,
      salesOrderId: order.id,
      warehouseId: warehouses['MTY-GEN'].id,
      createdById: user.id,
      folio: 'REM-DEMO-0001',
      deliveryDate: d('2026-08-28'),
      status: 'POSTED',
      recipientName: 'Daniel Pérez',
      reference: 'Entrega ACME',
      shippingAddress: order.shippingAddress,
      notes: 'Entrega completa demo',
      items: {
        create: [
          {
            salesOrderItemId: order.items[0].id,
            productId: products['LAP-PRO-14'].id,
            quantity: 10,
            unitCost: 18200,
          },
          {
            salesOrderItemId: order.items[1].id,
            productId: products['DOCK-USBC'].id,
            quantity: 10,
            unitCost: 2450,
          },
          {
            salesOrderItemId: order.items[2].id,
            productId: products['IMP-ONBOARD'].id,
            quantity: 1,
            unitCost: 12000,
          },
        ],
      },
    },
    include: {items: true},
  });

  const invoiceTotal = quoteSubtotal + quoteTax;
  const invoice = await prisma.salesInvoice.create({
    data: {
      companyId: company.id,
      salesOrderId: order.id,
      customerId: customers['CLI-ACME'].id,
      createdById: user.id,
      invoiceNumber: 'FAC-DEMO-0001',
      issueDate: d('2026-08-29'),
      dueDate: d('2026-09-28'),
      status: 'PARTIALLY_PAID',
      subtotal: quoteSubtotal,
      taxTotal: quoteTax,
      total: invoiceTotal,
      paidAmount: 180000,
      notes: 'Factura comercial demo',
    },
  });

  const ar1 = await prisma.accountsReceivable.create({
    data: {
      companyId: company.id,
      customerId: customers['CLI-ACME'].id,
      createdById: user.id,
      invoiceNumber: 'CLI-DEMO-FAC-0001',
      issueDate: d('2026-08-29'),
      dueDate: d('2026-09-28'),
      subtotal: quoteSubtotal,
      taxAmount: quoteTax,
      total: invoiceTotal,
      paidAmount: 180000,
      status: 'PARTIALLY_PAID',
      notes: 'Cuenta por cobrar del proyecto ACME',
    },
  });

  await prisma.accountsReceivable.create({
    data: {
      companyId: company.id,
      customerId: customers['CLI-NOVA'].id,
      createdById: user.id,
      invoiceNumber: 'CLI-DEMO-FAC-0002',
      issueDate: d('2026-07-12'),
      dueDate: d('2026-08-11'),
      subtotal: 125000,
      taxAmount: 20000,
      total: 145000,
      paidAmount: 0,
      status: 'OVERDUE',
      notes: 'Cartera vencida demo',
    },
  });

  await prisma.customerPayment.create({
    data: {
      companyId: company.id,
      accountsReceivableId: ar1.id,
      createdById: user.id,
      folio: 'COB-HIST-DEMO-0001',
      amount: 80000,
      paymentDate: d('2026-08-30'),
      method: 'TRANSFERENCIA',
      reference: 'SPEI-ACME-001',
      notes: 'Cobro histórico demo',
    },
  });

  const returnDoc = await prisma.salesReturn.create({
    data: {
      companyId: company.id,
      salesDeliveryId: delivery.id,
      warehouseId: warehouses['MTY-GEN'].id,
      createdById: user.id,
      folio: 'DEV-DEMO-0001',
      returnDate: d('2026-08-31'),
      status: 'POSTED',
      reason: 'Equipo con daño estético',
      reference: 'RMA-ACME-01',
      notes: 'Devolución parcial demo',
      items: {
        create: [
          {
            salesDeliveryItemId: delivery.items[1].id,
            productId: products['DOCK-USBC'].id,
            quantity: 1,
            unitCost: 2450,
          },
        ],
      },
    },
  });

  await prisma.salesCreditNote.create({
    data: {
      companyId: company.id,
      salesInvoiceId: invoice.id,
      salesReturnId: returnDoc.id,
      createdById: user.id,
      folio: 'NC-DEMO-0001',
      issueDate: d('2026-09-01'),
      status: 'APPLIED',
      subtotal: 3890,
      taxTotal: 622.4,
      total: 4512.4,
      reason: 'Devolución de docking station',
      notes: 'Nota de crédito demo',
    },
  });

  console.log('Creando Tesorería, presupuestos y flujo demo...');

  const treasuryAccounts = {};
  for (const row of [
    ['BAN-001', 'BBVA Operativa', 'BANK', 'BBVA México', '****4821', 425000],
    ['BAN-002', 'Santander Nómina', 'BANK', 'Santander', '****3309', 185000],
    ['CAJ-001', 'Caja General Monterrey', 'CASH', null, null, 18500],
  ]) {
    treasuryAccounts[row[0]] = await prisma.treasuryAccount.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {
        name: row[1],
        type: row[2],
        bankName: row[3],
        accountNumber: row[4],
        openingBalance: row[5],
        currentBalance: row[5],
        active: true,
      },
      create: {
        companyId: company.id,
        code: row[0],
        name: row[1],
        type: row[2],
        bankName: row[3],
        accountNumber: row[4],
        openingBalance: row[5],
        currentBalance: row[5],
      },
    });
  }

  const movements = [
    ['MOV-DEMO-0001', 'BAN-001', 'INCOME', '2026-08-20', 100000, 345000, 'Anticipo cliente ACME', 'Cobranza'],
    ['MOV-DEMO-0002', 'BAN-001', 'EXPENSE', '2026-08-22', 60000, 285000, 'Pago parcial proveedor TecNorte', 'Proveedores'],
    ['MOV-DEMO-0003', 'BAN-001', 'INCOME', '2026-08-30', 80000, 365000, 'Cobro factura ACME', 'Cobranza'],
    ['MOV-DEMO-0004', 'BAN-002', 'EXPENSE', '2026-09-01', money(payrollGross - payrollDeductions), 185000, 'Pago de nómina quincenal', 'Nómina'],
    ['MOV-DEMO-0005', 'CAJ-001', 'EXPENSE', '2026-08-28', 3500, 18500, 'Gastos menores de oficina', 'Gastos'],
  ];
  const movementObjects = {};
  for (const row of movements) {
    movementObjects[row[0]] = await prisma.treasuryMovement.create({
      data: {
        companyId: company.id,
        accountId: treasuryAccounts[row[1]].id,
        createdById: user.id,
        folio: row[0],
        type: row[2],
        movementDate: d(row[3]),
        amount: row[4],
        balanceAfter: row[5],
        concept: row[6],
        category: row[7],
        reference: `REF-${row[0]}`,
        referenceType: 'DEMO',
      },
    });
  }

  const collectionReceipt = await prisma.collectionReceipt.create({
    data: {
      companyId: company.id,
      customerId: customers['CLI-ACME'].id,
      treasuryAccountId: treasuryAccounts['BAN-001'].id,
      createdById: user.id,
      folio: 'COB-DEMO-0001',
      paymentDate: d('2026-08-30'),
      amount: 100000,
      unappliedAmount: 20000,
      method: 'TRANSFER',
      reference: 'SPEI-ACME-001',
      notes: 'Pago aplicado parcialmente demo',
      status: 'APPLIED',
      treasuryMovementId: movementObjects['MOV-DEMO-0003'].id,
    },
  });

  await prisma.collectionApplication.create({
    data: {
      companyId: company.id,
      collectionReceiptId: collectionReceipt.id,
      accountsReceivableId: ar1.id,
      amount: 80000,
    },
  });


  console.log('Creando facturación fiscal demo...');

  await prisma.fiscalIssuerProfile.upsert({
    where: {companyId: company.id},
    update: {
      rfc: 'EKU9003173C9',
      legalName: company.legalName || company.name,
      fiscalRegime: '601',
      postalCode: '64000',
      pacProvider: 'PAC DEMO / pendiente integración',
      active: true,
    },
    create: {
      companyId: company.id,
      rfc: 'EKU9003173C9',
      legalName: company.legalName || company.name,
      fiscalRegime: '601',
      postalCode: '64000',
      pacProvider: 'PAC DEMO / pendiente integración',
      active: true,
    },
  });

  const demoCustomerFiscal = {};
  for (const [code, rfc, regime, postal] of [
    ['CLI-ACME', 'XAXX010101000', '616', '64000'],
    ['CLI-NOVA', 'XAXX010101000', '616', '66220'],
    ['CLI-HORIZ', 'XAXX010101000', '616', '64000'],
  ]) {
    demoCustomerFiscal[code] = await prisma.fiscalCustomerProfile.upsert({
      where: {customerId: customers[code].id},
      update: {
        rfc,
        legalName: customers[code].legalName,
        fiscalRegime: regime,
        postalCode: postal,
        defaultUseCfdi: 'G03',
      },
      create: {
        customerId: customers[code].id,
        rfc,
        legalName: customers[code].legalName,
        fiscalRegime: regime,
        postalCode: postal,
        defaultUseCfdi: 'G03',
      },
    });
  }

  const fiscalInvoice = await prisma.fiscalInvoice.create({
    data: {
      companyId: company.id,
      salesInvoiceId: invoice.id,
      salesOrderId: order.id,
      customerId: customers['CLI-ACME'].id,
      createdById: user.id,
      series: 'A',
      folio: 'CFDI-DEMO-0001',
      version: '4.0',
      cfdiType: 'I',
      issueDate: d('2026-08-29'),
      currency: 'MXN',
      paymentMethod: 'PPD',
      paymentForm: '99',
      placeOfIssue: '64000',
      exportCode: '01',
      useCfdi: 'G03',
      status: 'STAMPED',
      subtotal: quoteSubtotal,
      transferredTaxes: quoteTax,
      total: invoiceTotal,
      uuid: '11111111-2222-4333-8444-555555555555',
      stampedAt: d('2026-08-29'),
      certificateNumber: '00001000000500000000',
      satCertificate: '00001000000500000000',
      pacProvider: 'PAC DEMO',
      satStatus: 'Vigente',
      xmlUrl: 'https://demo.local/cfdi/CFDI-DEMO-0001.xml',
      pdfUrl: 'https://demo.local/cfdi/CFDI-DEMO-0001.pdf',
      notes: '[DEMO] CFDI 4.0 de demostración. No es un comprobante fiscal real.',
    },
  });

  const fiscalItem = await prisma.fiscalInvoiceItem.create({
    data: {
      fiscalInvoiceId: fiscalInvoice.id,
      lineNumber: 1,
      satProductCode: '81111500',
      identification: 'SERV-ERP',
      description: 'Servicios de implementación tecnológica',
      quantity: 1,
      unitCode: 'E48',
      unitName: 'Unidad de servicio',
      unitValue: quoteSubtotal,
      amount: quoteSubtotal,
      taxObject: '02',
    },
  });
  await prisma.fiscalInvoiceTax.create({
    data: {
      itemId: fiscalItem.id,
      kind: 'TRANSFER',
      taxCode: '002',
      factorType: 'RATE',
      taxBase: quoteSubtotal,
      rateOrQuota: 0.16,
      amount: quoteTax,
    },
  });

  const paymentComplement = await prisma.fiscalPaymentComplement.create({
    data: {
      companyId: company.id,
      collectionReceiptId: collectionReceipt.id,
      customerId: customers['CLI-ACME'].id,
      createdById: user.id,
      series: 'P',
      folio: 'CP-DEMO-0001',
      version: '2.0',
      cfdiVersion: '4.0',
      issueDate: d('2026-08-30'),
      placeOfIssue: '64000',
      status: 'STAMPED',
      uuid: '66666666-7777-4888-8999-AAAAAAAAAAAA',
      stampedAt: d('2026-08-30'),
      pacProvider: 'PAC DEMO',
      xmlUrl: 'https://demo.local/cfdi/CP-DEMO-0001.xml',
      pdfUrl: 'https://demo.local/cfdi/CP-DEMO-0001.pdf',
      notes: '[DEMO] Complemento de recepción de pagos 2.0. No es un comprobante fiscal real.',
    },
  });
  const fiscalPayment = await prisma.fiscalPayment.create({
    data: {
      paymentComplementId: paymentComplement.id,
      paymentDate: collectionReceipt.paymentDate,
      paymentForm: '03',
      currency: 'MXN',
      amount: collectionReceipt.amount,
      operationNumber: collectionReceipt.reference,
    },
  });
  await prisma.fiscalPaymentRelatedDocument.create({
    data: {
      paymentId: fiscalPayment.id,
      fiscalInvoiceId: fiscalInvoice.id,
      documentUuid: fiscalInvoice.uuid,
      currency: 'MXN',
      installment: 1,
      previousBalance: invoiceTotal,
      paidAmount: 100000,
      remainingBalance: Number(invoiceTotal) - 100000,
      taxObject: '02',
    },
  });


  const costCenters = {};
  for (const row of [
    ['CC-COM', 'Comercial'],
    ['CC-OPS', 'Operaciones'],
    ['CC-TI', 'Tecnología'],
    ['CC-ADM', 'Administración'],
  ]) {
    costCenters[row[0]] = await prisma.costCenter.upsert({
      where: {companyId_code: {companyId: company.id, code: row[0]}},
      update: {name: row[1], active: true},
      create: {companyId: company.id, code: row[0], name: row[1]},
    });
  }

  const budget = await prisma.budget.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      name: 'Demo Presupuesto Operativo 2026',
      year: 2026,
      status: 'ACTIVE',
      totalAmount: 2400000,
      notes: 'Presupuesto demo anual',
    },
  });

  const budgetLines = [];
  for (let month = 1; month <= 12; month += 1) {
    budgetLines.push(
      {
        companyId: company.id,
        budgetId: budget.id,
        costCenterId: costCenters['CC-COM'].id,
        category: 'Marketing y ventas',
        month,
        amount: 65000,
      },
      {
        companyId: company.id,
        budgetId: budget.id,
        costCenterId: costCenters['CC-OPS'].id,
        category: 'Operación',
        month,
        amount: 75000,
      },
      {
        companyId: company.id,
        budgetId: budget.id,
        costCenterId: costCenters['CC-TI'].id,
        category: 'Tecnología',
        month,
        amount: 40000,
      },
      {
        companyId: company.id,
        budgetId: budget.id,
        costCenterId: costCenters['CC-ADM'].id,
        category: 'Administración',
        month,
        amount: 20000,
      },
    );
  }
  await prisma.budgetLine.createMany({data: budgetLines});

  const scenario = await prisma.cashFlowScenario.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      name: 'Demo Escenario Realista Q4',
      description: 'Proyección realista con oportunidades y gastos esperados',
      startDate: d('2026-09-01'),
      endDate: d('2026-12-31'),
      status: 'ACTIVE',
      adjustments: {
        create: [
          {
            companyId: company.id,
            date: d('2026-10-15'),
            type: 'INFLOW',
            category: 'Nuevo contrato',
            concept: 'Cierre Grupo Altavista',
            amount: 380000,
            probability: 70,
          },
          {
            companyId: company.id,
            date: d('2026-11-05'),
            type: 'OUTFLOW',
            category: 'Expansión',
            concept: 'Acondicionamiento nueva oficina',
            amount: 160000,
            probability: 90,
          },
          {
            companyId: company.id,
            date: d('2026-12-10'),
            type: 'INFLOW',
            category: 'Renovaciones',
            concept: 'Renovación de licencias anuales',
            amount: 210000,
            probability: 85,
          },
        ],
      },
    },
  });

  console.log(`Escenario creado: ${scenario.name}`);

  const statement = await prisma.bankStatement.create({
    data: {
      companyId: company.id,
      treasuryAccountId: treasuryAccounts['BAN-001'].id,
      createdById: user.id,
      folio: 'CON-DEMO-2026-08',
      statementDate: d('2026-08-31'),
      periodStart: d('2026-08-01'),
      periodEnd: d('2026-08-31'),
      openingBalance: 245000,
      closingBalance: 365000,
      status: 'IN_PROGRESS',
      notes: 'Estado de cuenta demo de agosto',
    },
  });

  await prisma.bankStatementLine.createMany({
    data: [
      {
        companyId: company.id,
        bankStatementId: statement.id,
        treasuryMovementId: movementObjects['MOV-DEMO-0001'].id,
        reconciledById: user.id,
        transactionDate: d('2026-08-20'),
        description: 'SPEI recibido ACME',
        reference: 'ACME-ANT-001',
        type: 'CREDIT',
        amount: 100000,
        status: 'MATCHED',
        reconciledAt: d('2026-08-31'),
      },
      {
        companyId: company.id,
        bankStatementId: statement.id,
        treasuryMovementId: movementObjects['MOV-DEMO-0002'].id,
        reconciledById: user.id,
        transactionDate: d('2026-08-22'),
        description: 'SPEI enviado TecNorte',
        reference: 'TEC-PAG-001',
        type: 'DEBIT',
        amount: 60000,
        status: 'MATCHED',
        reconciledAt: d('2026-08-31'),
      },
      {
        companyId: company.id,
        bankStatementId: statement.id,
        treasuryMovementId: movementObjects['MOV-DEMO-0003'].id,
        reconciledById: user.id,
        transactionDate: d('2026-08-30'),
        description: 'SPEI recibido ACME factura',
        reference: 'ACME-FAC-001',
        type: 'CREDIT',
        amount: 80000,
        status: 'MATCHED',
        reconciledAt: d('2026-08-31'),
      },
      {
        companyId: company.id,
        bankStatementId: statement.id,
        transactionDate: d('2026-08-31'),
        description: 'Comisión bancaria mensual',
        reference: 'COM-AGO-2026',
        type: 'DEBIT',
        amount: 450,
        status: 'PENDING',
      },
    ],
  });

  console.log('Creando periodos y pólizas contables demo...');

  const period = await prisma.accountingPeriod.upsert({
    where: {companyId_name: {companyId: company.id, name: 'Agosto 2026'}},
    update: {
      startDate: d('2026-08-01'),
      endDate: d('2026-08-31'),
      status: 'OPEN',
    },
    create: {
      companyId: company.id,
      name: 'Agosto 2026',
      startDate: d('2026-08-01'),
      endDate: d('2026-08-31'),
      status: 'OPEN',
    },
  });

  const accounts = {};
  for (const account of await prisma.accountingAccount.findMany({
    where: {companyId: company.id},
  })) {
    accounts[account.code] = account;
  }

  const journalData = [
    {
      folio: 'POL-DEMO-00001',
      date: '2026-08-29',
      concept: 'Registro de factura de venta ACME',
      sourceType: 'SALES_INVOICE',
      sourceId: invoice.id,
      sourceFolio: invoice.invoiceNumber,
      lines: [
        ['1050', invoiceTotal, 0],
        ['4010', 0, quoteSubtotal],
        ['2080', 0, quoteTax],
      ],
    },
    {
      folio: 'POL-DEMO-00002',
      date: '2026-08-29',
      concept: 'Registro de factura proveedor TecNorte',
      sourceType: 'ACCOUNTS_PAYABLE',
      sourceId: ap1.id,
      sourceFolio: ap1.invoiceNumber,
      lines: [
        ['5010', 121400, 0],
        ['1190', 19424, 0],
        ['2010', 0, 140824],
      ],
    },
    {
      folio: 'POL-DEMO-00003',
      date: '2026-08-30',
      concept: 'Cobro parcial cliente ACME',
      sourceType: 'TREASURY_MOVEMENT',
      sourceId: movementObjects['MOV-DEMO-0003'].id,
      sourceFolio: 'MOV-DEMO-0003',
      lines: [
        ['1020', 80000, 0],
        ['1050', 0, 80000],
      ],
    },
  ];

  for (const journal of journalData) {
    await prisma.journalEntry.create({
      data: {
        companyId: company.id,
        periodId: period.id,
        createdById: user.id,
        postedById: user.id,
        folio: journal.folio,
        entryDate: d(journal.date),
        concept: journal.concept,
        status: 'POSTED',
        sourceType: journal.sourceType,
        sourceId: journal.sourceId,
        sourceFolio: journal.sourceFolio,
        postedAt: d(journal.date),
        lines: {
          create: journal.lines.map((line) => ({
            accountId: accounts[line[0]].id,
            concept: journal.concept,
            debit: line[1],
            credit: line[2],
          })),
        },
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        companyId: company.id,
        userId: user.id,
        type: 'WARNING',
        title: '[DEMO] Stock bajo detectado',
        message: 'Silla ergonómica ejecutiva está por debajo del mínimo en Monterrey.',
        link: '/inventario/existencias',
      },
      {
        companyId: company.id,
        userId: user.id,
        type: 'ERROR',
        title: '[DEMO] Factura vencida',
        message: 'Nova Retail tiene una factura vencida por $145,000.',
        link: '/ventas/cobranza',
      },
      {
        companyId: company.id,
        userId: user.id,
        type: 'SUCCESS',
        title: '[DEMO] Pedido entregado',
        message: 'El pedido PED-DEMO-0001 fue entregado completamente.',
        link: '/ventas/operacion',
        read: true,
        readAt: d('2026-08-29'),
      },
      {
        companyId: company.id,
        userId: user.id,
        type: 'INFO',
        title: '[DEMO] Solicitud pendiente',
        message: 'La solicitud SOL-DEMO-0002 requiere aprobación.',
        link: '/compras/solicitudes',
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: user.id,
        action: 'CREATE',
        entity: 'SalesOrder',
        entityId: order.id,
        description: '[DEMO] Pedido comercial creado',
        createdAt: d('2026-08-15'),
      },
      {
        userId: user.id,
        action: 'POST',
        entity: 'GoodsReceipt',
        entityId: receipt.id,
        description: '[DEMO] Recepción de mercancía aplicada',
        createdAt: d('2026-08-29'),
      },
      {
        userId: user.id,
        action: 'APPROVE',
        entity: 'PayrollPeriod',
        entityId: payroll.id,
        description: '[DEMO] Prenómina aprobada',
        createdAt: d('2026-08-31'),
      },
    ],
  });



  console.log('Creando marketing demo...');

  const marketingChannels = {};
  for (const row of [
    ['social', '[DEMO] Redes sociales', 'SOCIAL'],
    ['search', '[DEMO] Google Ads / Search', 'SEARCH'],
    ['email', '[DEMO] Email marketing', 'EMAIL'],
    ['event', '[DEMO] Eventos B2B', 'EVENT'],
    ['referral', '[DEMO] Referidos', 'REFERRAL'],
  ]) {
    marketingChannels[row[0]] = await prisma.marketingChannel.create({
      data: {
        companyId: company.id,
        name: row[1],
        type: row[2],
        notes: '[DEMO] Canal para demostrar el módulo de Marketing.',
      },
    });
  }

  const campaigns = {};
  const campaignRows = [
    ['MKT-DEMO-001', 'Q3 · Demanda B2B Monterrey', 'LEAD_GENERATION', 'ACTIVE', marketingChannels.search.id, '2026-08-01', '2026-09-30', 95000, 'Directores de Operaciones y Compras en empresas medianas del norte de México', 'google', 'cpc', 'q3-b2b-mty'],
    ['MKT-DEMO-002', 'LinkedIn · Transformación Operativa', 'LEAD_GENERATION', 'ACTIVE', marketingChannels.social.id, '2026-08-18', '2026-10-15', 68000, 'Dirección general, Finanzas y Operaciones B2B', 'linkedin', 'paid-social', 'transformacion-operativa'],
    ['MKT-DEMO-003', 'Roadshow Empresarial Norte 2026', 'EVENT', 'PLANNED', marketingChannels.event.id, '2026-09-20', '2026-11-20', 145000, 'Empresas regionales con 50+ colaboradores', 'roadshow', 'event', 'roadshow-norte-2026'],
    ['MKT-DEMO-004', 'Nurturing · Base comercial', 'RETENTION', 'ACTIVE', marketingChannels.email.id, '2026-08-10', '2026-12-15', 22000, 'Prospectos calificados y clientes con oportunidades de expansión', 'crm', 'email', 'nurturing-base'],
  ];

  for (const row of campaignRows) {
    campaigns[row[0]] = await prisma.marketingCampaign.create({
      data: {
        companyId: company.id,
        createdById: user.id,
        ownerId: user.id,
        code: row[0],
        name: row[1],
        objective: row[2],
        status: row[3],
        channelId: row[4],
        startDate: d(row[5]),
        endDate: d(row[6]),
        budget: row[7],
        targetAudience: row[8],
        description: '[DEMO] Campaña creada para demostrar presupuesto, leads, atribución, métricas y ROI.',
        utmSource: row[9],
        utmMedium: row[10],
        utmCampaign: row[11],
      },
    });
  }

  await prisma.marketingCampaignExpense.createMany({
    data: [
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-001'].id, createdById: user.id, date: d('2026-08-12'), category: 'Media', vendor: 'Google Ads', description: '[DEMO] Inversión de pauta Search', amount: 38600, reference: 'ADS-AUG-01'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-001'].id, createdById: user.id, date: d('2026-08-26'), category: 'Landing page', vendor: 'Producción interna', description: '[DEMO] Landing y optimización', amount: 8500, reference: 'LP-Q3'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-002'].id, createdById: user.id, date: d('2026-08-25'), category: 'Media', vendor: 'LinkedIn Ads', description: '[DEMO] Sponsored Content', amount: 24750, reference: 'LI-AUG'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-003'].id, createdById: user.id, date: d('2026-08-30'), category: 'Producción', vendor: 'Expo Norte', description: '[DEMO] Anticipo de recinto y producción', amount: 42000, reference: 'EVT-ANT'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-004'].id, createdById: user.id, date: d('2026-08-20'), category: 'Software', vendor: 'Plataforma Email', description: '[DEMO] Licencia mensual', amount: 4800, reference: 'EMAIL-AUG'},
    ],
  });

  const leadLinks = [
    ['MKT-DEMO-001', prospects[3], 'google', 'cpc'],
    ['MKT-DEMO-001', prospects[1], 'google', 'cpc'],
    ['MKT-DEMO-002', prospects[0], 'linkedin', 'paid-social'],
    ['MKT-DEMO-002', prospects[2], 'linkedin', 'paid-social'],
    ['MKT-DEMO-003', prospects[2], 'roadshow', 'event'],
    ['MKT-DEMO-004', prospects[4], 'crm', 'email'],
    ['MKT-DEMO-004', prospects[5], 'crm', 'email'],
  ];
  for (let i = 0; i < leadLinks.length; i += 1) {
    const [campaignCode, prospect, source, medium] = leadLinks[i];
    await prisma.marketingCampaignLead.create({
      data: {
        campaignId: campaigns[campaignCode].id,
        prospectId: prospect.id,
        capturedAt: d(`2026-08-${String(20 + i).padStart(2, '0')}`),
        source,
        medium,
        content: 'demo-creativo-a',
        landingUrl: 'https://demo.local/landing',
        notes: '[DEMO] Lead atribuido a campaña.',
      },
    });
  }

  await prisma.marketingCampaignOpportunity.create({
    data: {
      campaignId: campaigns['MKT-DEMO-004'].id,
      prospectId: prospects[4].id,
      customerId: customers['CLI-ACME'].id,
      salesOrderId: order.id,
      attributedRevenue: order.total,
      attributionPct: 65,
      convertedAt: d('2026-08-15'),
      notes: '[DEMO] Atribución parcial de pedido para mostrar ROI.',
    },
  });
  await prisma.marketingCampaignOpportunity.create({
    data: {
      campaignId: campaigns['MKT-DEMO-002'].id,
      prospectId: prospects[0].id,
      attributedRevenue: 380000,
      attributionPct: 40,
      notes: '[DEMO] Oportunidad abierta con atribución comercial.',
    },
  });

  const metricRows = [
    ['MKT-DEMO-001','2026-08-05',48000,2140,1720,16,1,18200,0],
    ['MKT-DEMO-001','2026-08-19',57500,2680,2110,21,2,20400,0],
    ['MKT-DEMO-001','2026-08-31',33100,1480,1190,12,1,8500,0],
    ['MKT-DEMO-002','2026-08-22',41800,1190,940,13,1,11200,0],
    ['MKT-DEMO-002','2026-08-31',52600,1520,1210,17,2,13550,152000],
    ['MKT-DEMO-003','2026-08-31',12500,490,380,24,0,42000,0],
    ['MKT-DEMO-004','2026-08-18',18600,1140,970,28,3,2400,0],
    ['MKT-DEMO-004','2026-08-31',21700,1310,1080,32,4,2400,210000],
  ];
  for (const row of metricRows) {
    await prisma.marketingMetric.create({
      data: {
        companyId: company.id,
        campaignId: campaigns[row[0]].id,
        date: d(row[1]),
        impressions: row[2],
        clicks: row[3],
        sessions: row[4],
        leads: row[5],
        conversions: row[6],
        spend: row[7],
        revenue: row[8],
      },
    });
  }

  await prisma.marketingCalendarEvent.createMany({
    data: [
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-001'].id, createdById: user.id, title: '[DEMO] Optimización de keywords Q3', type: 'MILESTONE', startAt: d('2026-09-04'), channel: 'Search', ownerName: 'Marketing', description: '[DEMO] Revisión de CPL y términos de búsqueda.'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-002'].id, createdById: user.id, title: '[DEMO] Publicar caso de transformación', type: 'CONTENT', startAt: d('2026-09-07'), channel: 'LinkedIn', ownerName: 'Contenido', description: '[DEMO] Pieza editorial para decisión B2B.'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-004'].id, createdById: user.id, title: '[DEMO] Email nurturing · Secuencia 3', type: 'EMAIL', startAt: d('2026-09-09'), channel: 'Email', ownerName: 'CRM', description: '[DEMO] Seguimiento automático a oportunidades calificadas.'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-003'].id, createdById: user.id, title: '[DEMO] Confirmar sede Roadshow', type: 'EVENT', startAt: d('2026-09-12'), channel: 'Evento', ownerName: 'Eventos', description: '[DEMO] Cierre de logística, proveedores y agenda.'},
      {companyId: company.id, campaignId: campaigns['MKT-DEMO-003'].id, createdById: user.id, title: '[DEMO] Roadshow Empresarial Monterrey', type: 'CAMPAIGN', startAt: d('2026-10-15'), endAt: d('2026-10-15'), channel: 'Evento', ownerName: 'Marketing', description: '[DEMO] Evento de generación de demanda.'},
    ],
  });


  console.log('Creando proyectos demo...');

  const demoProjectRows = [
    {
      code: 'PRY-DEMO-001',
      name: 'Implementación tecnológica ACME',
      description: 'Despliegue de equipo, onboarding y puesta en marcha para el equipo comercial de ACME.',
      customerId: customers['CLI-ACME'].id,
      managerId: employees['EMP-104'].id,
      status: 'ACTIVE',
      priority: 'HIGH',
      startDate: d('2026-08-18'),
      dueDate: d('2026-10-15'),
      budget: 420000,
      plannedHours: 320,
      tags: 'implementación,tecnología,cliente',
    },
    {
      code: 'PRY-DEMO-002',
      name: 'Expansión operación Horizonte',
      description: 'Proyecto de diagnóstico, planeación y expansión operativa para Corporativo Horizonte.',
      customerId: customers['CLI-HORIZ'].id,
      managerId: employees['EMP-101'].id,
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: d('2026-09-08'),
      dueDate: d('2026-12-12'),
      budget: 285000,
      plannedHours: 240,
      tags: 'consultoría,expansión',
    },
    {
      code: 'PRY-DEMO-003',
      name: 'Portal interno de operaciones',
      description: 'Subproyecto interno para centralizar tableros y flujos operativos.',
      customerId: null,
      managerId: employees['EMP-108'].id,
      status: 'ACTIVE',
      priority: 'MEDIUM',
      startDate: d('2026-08-25'),
      dueDate: d('2026-11-30'),
      budget: 165000,
      plannedHours: 420,
      tags: 'interno,software',
    },
  ];

  const demoProjects = {};
  for (const data of demoProjectRows) {
    demoProjects[data.code] = await prisma.project.upsert({
      where: {companyId_code: {companyId: company.id, code: data.code}},
      update: {...data, createdById: user.id},
      create: {...data, companyId: company.id, createdById: user.id},
    });

    await prisma.projectComment.deleteMany({where: {projectId: demoProjects[data.code].id}});
    await prisma.projectDocument.deleteMany({where: {projectId: demoProjects[data.code].id}});
    await prisma.projectTimeEntry.deleteMany({where: {projectId: demoProjects[data.code].id}});
    await prisma.projectTask.deleteMany({where: {projectId: demoProjects[data.code].id}});
    await prisma.projectMember.deleteMany({where: {projectId: demoProjects[data.code].id}});
    await prisma.projectSalesOrder.deleteMany({where: {projectId: demoProjects[data.code].id}});
    await prisma.projectPurchaseOrder.deleteMany({where: {projectId: demoProjects[data.code].id}});
  }

  await prisma.project.update({
    where: {id: demoProjects['PRY-DEMO-003'].id},
    data: {parentProjectId: demoProjects['PRY-DEMO-002'].id},
  });

  const projectOne = demoProjects['PRY-DEMO-001'];
  const projectTwo = demoProjects['PRY-DEMO-002'];
  const projectThree = demoProjects['PRY-DEMO-003'];

  await prisma.projectMember.createMany({
    data: [
      {projectId: projectOne.id, employeeId: employees['EMP-104'].id, role: 'Project Manager', allocationPercent: 60},
      {projectId: projectOne.id, employeeId: employees['EMP-108'].id, role: 'Implementación', allocationPercent: 75},
      {projectId: projectOne.id, employeeId: employees['EMP-102'].id, role: 'Enlace comercial', allocationPercent: 25},
      {projectId: projectTwo.id, employeeId: employees['EMP-101'].id, role: 'Líder comercial', allocationPercent: 40},
      {projectId: projectTwo.id, employeeId: employees['EMP-106'].id, role: 'Control financiero', allocationPercent: 20},
      {projectId: projectThree.id, employeeId: employees['EMP-108'].id, role: 'Líder técnico', allocationPercent: 80},
      {projectId: projectThree.id, employeeId: employees['EMP-105'].id, role: 'Operaciones', allocationPercent: 25},
    ],
  });

  const projectTasks = {};
  const taskRows = [
    ['ACME-01', projectOne.id, 'Kickoff y levantamiento', 'DONE', 'HIGH', employees['EMP-104'].id, '2026-08-18', '2026-08-21', 18],
    ['ACME-02', projectOne.id, 'Preparar infraestructura', 'DONE', 'HIGH', employees['EMP-108'].id, '2026-08-22', '2026-08-29', 48],
    ['ACME-03', projectOne.id, 'Configuración de equipos', 'IN_PROGRESS', 'HIGH', employees['EMP-108'].id, '2026-08-30', '2026-09-12', 76],
    ['ACME-04', projectOne.id, 'Capacitación usuarios', 'TODO', 'MEDIUM', employees['EMP-102'].id, '2026-09-15', '2026-09-25', 32],
    ['ACME-05', projectOne.id, 'Cierre y aceptación', 'TODO', 'MEDIUM', employees['EMP-104'].id, '2026-10-05', '2026-10-15', 16],
    ['HOR-01', projectTwo.id, 'Discovery ejecutivo', 'TODO', 'HIGH', employees['EMP-101'].id, '2026-09-08', '2026-09-12', 20],
    ['HOR-02', projectTwo.id, 'Modelo financiero', 'TODO', 'MEDIUM', employees['EMP-106'].id, '2026-09-15', '2026-09-30', 38],
    ['INT-01', projectThree.id, 'Arquitectura del portal', 'DONE', 'HIGH', employees['EMP-108'].id, '2026-08-25', '2026-08-29', 32],
    ['INT-02', projectThree.id, 'Dashboard operativo', 'IN_PROGRESS', 'MEDIUM', employees['EMP-108'].id, '2026-08-30', '2026-09-18', 60],
    ['INT-03', projectThree.id, 'Pruebas con operaciones', 'BLOCKED', 'MEDIUM', employees['EMP-105'].id, '2026-09-20', '2026-10-02', 28],
  ];

  let sortIndex = 0;
  for (const row of taskRows) {
    projectTasks[row[0]] = await prisma.projectTask.create({
      data: {
        projectId: row[1],
        title: row[2],
        status: row[3],
        priority: row[4],
        assigneeId: row[5],
        startDate: d(row[6]),
        dueDate: d(row[7]),
        estimatedHours: row[8],
        sortOrder: sortIndex++,
        completedAt: row[3] === 'DONE' ? d(row[7]) : null,
        description: `[DEMO] ${row[2]}`,
      },
    });
  }

  await prisma.projectTimeEntry.createMany({
    data: [
      {projectId: projectOne.id, taskId: projectTasks['ACME-01'].id, employeeId: employees['EMP-104'].id, createdById: user.id, date: d('2026-08-20'), hours: 12, hourlyCost: 420, notes: '[DEMO] Kickoff y levantamiento'},
      {projectId: projectOne.id, taskId: projectTasks['ACME-02'].id, employeeId: employees['EMP-108'].id, createdById: user.id, date: d('2026-08-27'), hours: 38, hourlyCost: 360, notes: '[DEMO] Preparación de infraestructura'},
      {projectId: projectOne.id, taskId: projectTasks['ACME-03'].id, employeeId: employees['EMP-108'].id, createdById: user.id, date: d('2026-09-01'), hours: 21, hourlyCost: 360, notes: '[DEMO] Configuración inicial'},
      {projectId: projectThree.id, taskId: projectTasks['INT-01'].id, employeeId: employees['EMP-108'].id, createdById: user.id, date: d('2026-08-28'), hours: 30, hourlyCost: 360, notes: '[DEMO] Arquitectura técnica'},
      {projectId: projectThree.id, taskId: projectTasks['INT-02'].id, employeeId: employees['EMP-108'].id, createdById: user.id, date: d('2026-09-01'), hours: 14, hourlyCost: 360, notes: '[DEMO] Construcción dashboard'},
    ],
  });

  await prisma.projectComment.createMany({
    data: [
      {projectId: projectOne.id, createdById: user.id, body: '[DEMO] Cliente confirmó ventana de instalación y responsables internos.'},
      {projectId: projectOne.id, taskId: projectTasks['ACME-03'].id, createdById: user.id, body: '[DEMO] Configuración avanza conforme al plan; faltan validaciones de seguridad.'},
      {projectId: projectTwo.id, createdById: user.id, body: '[DEMO] Preparar agenda para discovery con dirección general.'},
      {projectId: projectThree.id, createdById: user.id, body: '[DEMO] El prototipo inicial ya está disponible para revisión de Operaciones.'},
    ],
  });

  await prisma.projectSalesOrder.create({
    data: {projectId: projectOne.id, salesOrderId: order.id},
  });
  await prisma.projectPurchaseOrder.create({
    data: {projectId: projectOne.id, purchaseOrderId: po.id},
  });

  for (const project of [projectOne, projectTwo, projectThree]) {
    const tasks = await prisma.projectTask.findMany({
      where: {projectId: project.id, status: {not: 'CANCELLED'}},
      select: {status: true},
    });
    const done = tasks.filter((task) => task.status === 'DONE').length;
    await prisma.project.update({
      where: {id: project.id},
      data: {progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0},
    });
  }


  console.log('Creando producción demo...');

  const wcAssembly = await prisma.productionWorkCenter.create({
    data:{companyId:company.id,code:'WC-DEMO-ENS',name:'[DEMO] Ensamble',description:'Estación principal de ensamble.',capacityPerDay:80,hourlyRate:420},
  });
  const wcQuality = await prisma.productionWorkCenter.create({
    data:{companyId:company.id,code:'WC-DEMO-QA',name:'[DEMO] Calidad',description:'Inspección y liberación.',capacityPerDay:120,hourlyRate:360},
  });

  const productList = await prisma.product.findMany({where:{companyId:company.id,active:true},orderBy:{name:'asc'},take:4});
  if(productList.length >= 3){
    const finished = productList[0];
    const componentA = productList[1];
    const componentB = productList[2];

    const bom = await prisma.billOfMaterials.create({
      data:{
        companyId:company.id,
        finishedProductId:finished.id,
        code:'BOM-DEMO-001',
        name:`[DEMO] BOM ${finished.name}`,
        version:1,
        baseQuantity:1,
        notes:'[DEMO] Lista de materiales para probar manufactura.',
        items:{
          create:[
            {componentId:componentA.id,quantity:2,wastePercent:2,sortOrder:1,notes:'[DEMO] Componente principal'},
            {componentId:componentB.id,quantity:1,wastePercent:1,sortOrder:2,notes:'[DEMO] Componente secundario'},
          ],
        },
      },
      include:{items:true},
    });

    const prodOrder = await prisma.productionOrder.create({
      data:{
        companyId:company.id,
        bomId:bom.id,
        salesOrderId:order.id,
        projectId:demoProjects['PRY-DEMO-001']?.id || null,
        issueWarehouseId:warehouses['MTY-GEN'].id,
        receiptWarehouseId:warehouses['MTY-GEN'].id,
        createdById:user.id,
        folio:'PROD-DEMO-0001',
        productId:finished.id,
        status:'IN_PROGRESS',
        priority:'HIGH',
        plannedQuantity:50,
        producedQuantity:22,
        rejectedQuantity:1,
        plannedStartAt:d('2026-08-25'),
        plannedEndAt:d('2026-09-10'),
        actualStartAt:d('2026-08-25'),
        notes:'[DEMO] Orden vinculada a venta/proyecto.',
      },
    });

    for(const item of bom.items){
      await prisma.productionOrderMaterial.create({
        data:{
          productionOrderId:prodOrder.id,
          productId:item.componentId,
          plannedQuantity:Number(item.quantity)*50*(1+Number(item.wastePercent)/100),
          issuedQuantity:Number(item.quantity)*24,
          unitCost:item.componentId===componentA.id?135:82,
        },
      });
    }

    const op1 = await prisma.productionOperation.create({
      data:{productionOrderId:prodOrder.id,workCenterId:wcAssembly.id,employeeId:employees['EMP-108'].id,completedById:user.id,sequence:10,name:'Ensamble',status:'DONE',plannedMinutes:1200,actualMinutes:1130,plannedStartAt:d('2026-08-25'),plannedEndAt:d('2026-08-30'),actualStartAt:d('2026-08-25'),completedAt:d('2026-08-30'),laborCost:7900,overheadCost:2400},
    });
    await prisma.productionOperation.create({
      data:{productionOrderId:prodOrder.id,workCenterId:wcQuality.id,employeeId:employees['EMP-105'].id,sequence:20,name:'Inspección de calidad',status:'IN_PROGRESS',plannedMinutes:420,actualMinutes:180,plannedStartAt:d('2026-08-31'),plannedEndAt:d('2026-09-05'),actualStartAt:d('2026-08-31'),laborCost:1500,overheadCost:600},
    });

    await prisma.productionConsumption.createMany({
      data:[
        {productionOrderId:prodOrder.id,productId:componentA.id,quantity:48,unitCost:135,reference:'CONS-DEMO-A',notes:'[DEMO] Consumo de material A'},
        {productionOrderId:prodOrder.id,productId:componentB.id,quantity:24,unitCost:82,reference:'CONS-DEMO-B',notes:'[DEMO] Consumo de material B'},
      ],
    });
    await prisma.productionOrderOutput.create({
      data:{productionOrderId:prodOrder.id,productId:finished.id,quantity:22,unitCost:620,completedAt:d('2026-09-01'),notes:'[DEMO] Primera salida de producción'},
    });
    await prisma.productionWaste.create({
      data:{productionOrderId:prodOrder.id,productId:componentA.id,quantity:1,reason:'Daño durante ensamble',cost:135,recordedAt:d('2026-08-29'),notes:'[DEMO] Merma'},
    });
    await prisma.productionCost.createMany({
      data:[
        {companyId:company.id,productionOrderId:prodOrder.id,type:'OVERHEAD',description:'Energía y uso de planta',amount:2200,reference:'OVH-DEMO'},
        {companyId:company.id,productionOrderId:prodOrder.id,type:'OUTSOURCED',description:'Servicio externo especializado',amount:3500,reference:'EXT-DEMO'},
      ],
    });
    await prisma.productionBatch.create({
      data:{companyId:company.id,productionOrderId:prodOrder.id,productId:finished.id,lotNumber:'LOT-DEMO-260901',quantity:22,manufacturedAt:d('2026-09-01'),qualityStatus:'PENDING',notes:'[DEMO] Lote en revisión'},
    });

    await prisma.productionOrder.create({
      data:{
        companyId:company.id,
        bomId:bom.id,
        createdById:user.id,
        folio:'PROD-DEMO-0002',
        productId:finished.id,
        status:'PLANNED',
        priority:'MEDIUM',
        plannedQuantity:80,
        plannedStartAt:d('2026-09-15'),
        plannedEndAt:d('2026-09-30'),
        issueWarehouseId:warehouses['MTY-GEN'].id,
        receiptWarehouseId:warehouses['MTY-GEN'].id,
        notes:'[DEMO] Segunda corrida de producción.',
      },
    });
  }



  console.log('Creando POS demo...');

  const posTerminal = await prisma.posTerminal.create({
    data:{
      companyId:company.id,
      warehouseId:warehouses['MTY-GEN'].id,
      code:'POS-DEMO-01',
      name:'[DEMO] Caja principal',
      notes:'[DEMO] Terminal POS conectada al almacén principal.',
    },
  });

  const posSession = await prisma.posSession.create({
    data:{
      companyId:company.id,
      terminalId:posTerminal.id,
      openedById:user.id,
      status:'OPEN',
      openedAt:d('2026-09-02'),
      openingAmount:1500,
      expectedAmount:1500,
      notes:'[DEMO] Turno activo.',
    },
  });
  await prisma.posCashMovement.create({
    data:{companyId:company.id,sessionId:posSession.id,createdById:user.id,type:'OPENING',amount:1500,description:'[DEMO] Fondo inicial'},
  });

  const posProducts = await prisma.product.findMany({where:{companyId:company.id,active:true},orderBy:{name:'asc'},take:3});
  if(posProducts.length){
    const saleItemsData = posProducts.slice(0,2).map((p,index)=>{
      const qty=index===0?2:1;
      const price=index===0?850:1290;
      const subtotal=qty*price;
      const tax=subtotal*0.16;
      return {productId:p.id,lineNumber:index+1,sku:p.sku,description:p.name,quantity:qty,unitPrice:price,discount:0,taxRate:16,taxAmount:tax,subtotal,total:subtotal+tax};
    });
    const posSubtotal=saleItemsData.reduce((s,i)=>s+i.subtotal,0);
    const posTax=saleItemsData.reduce((s,i)=>s+i.taxAmount,0);
    const posTotal=posSubtotal+posTax;

    const posSale=await prisma.posSale.create({
      data:{
        companyId:company.id,
        terminalId:posTerminal.id,
        sessionId:posSession.id,
        customerId:customers['CLI-ACME'].id,
        createdById:user.id,
        folio:'POS-DEMO-0001',
        status:'PAID',
        saleDate:d('2026-09-02'),
        subtotal:posSubtotal,
        taxTotal:posTax,
        total:posTotal,
        notes:'[DEMO] Venta mixta efectivo/tarjeta.',
        items:{create:saleItemsData},
        payments:{create:[
          {method:'CASH',amount:1000,reference:'EFECTIVO-DEMO'},
          {method:'CARD',amount:posTotal-1000,reference:'VISA-DEMO',authorization:'AUTH-DEMO-001'},
        ]},
      },
    });
    await prisma.posCashMovement.create({
      data:{companyId:company.id,sessionId:posSession.id,createdById:user.id,type:'SALE',amount:1000,reference:posSale.folio,description:'[DEMO] Cobro en efectivo'},
    });

    await prisma.posSale.create({
      data:{
        companyId:company.id,
        terminalId:posTerminal.id,
        sessionId:posSession.id,
        createdById:user.id,
        folio:'POS-DEMO-0002',
        status:'PAID',
        saleDate:d('2026-09-02'),
        subtotal:500,
        discountTotal:50,
        taxTotal:72,
        total:522,
        notes:'[DEMO] Venta con descuento.',
        items:{create:[{productId:posProducts[0].id,lineNumber:1,sku:posProducts[0].sku,description:posProducts[0].name,quantity:1,unitPrice:500,discount:0,taxRate:16,taxAmount:72,subtotal:450,total:522}]},
        discounts:{create:[{code:'BIENVENIDA',description:'[DEMO] Descuento comercial',amount:50,percent:10}]},
        payments:{create:[{method:'CARD',amount:522,reference:'MC-DEMO',authorization:'AUTH-DEMO-002'}]},
      },
    });
  }



  console.log('Creando configuración modular demo...');

  const moduleDefinitions = [
    ['inicio','Inicio','CORE','/'],
    ['ventas','Ventas','COMERCIAL','/ventas'],
    ['compras','Compras','OPERACIONES','/compras/solicitudes'],
    ['inventario','Inventario','OPERACIONES','/inventario/productos'],
    ['crm','CRM','COMERCIAL','/crm'],
    ['proyectos','Proyectos','OPERACIONES','/proyectos'],
    ['marketing','Marketing','COMERCIAL','/marketing'],
    ['produccion','Producción','OPERACIONES','/produccion'],
    ['pos','POS','COMERCIAL','/pos'],
    ['finanzas','Finanzas','FINANZAS','/finanzas/cuentas-por-pagar'],
    ['rrhh','RRHH','PERSONAS','/rrhh/empleados'],
    ['facturacion-fiscal','Facturación fiscal','FINANZAS','/facturacion-fiscal'],
    ['reportes','Reportes','ANALITICA','/reportes'],
  ];

  const moduleMap = {};
  for(let i=0;i<moduleDefinitions.length;i++){
    const [key,name,category,route]=moduleDefinitions[i];
    const mod=await prisma.module.upsert({
      where:{key},
      update:{name,category,route,active:true,sortOrder:i+1},
      create:{key,name,category,route,active:true,sortOrder:i+1},
    });
    moduleMap[key]=mod;
  }

  const features = [
    ['pos','multi-payment','Pagos múltiples'],
    ['pos','cash-control','Control de caja'],
    ['produccion','bom','Listas de materiales'],
    ['produccion','costing','Costeo de producción'],
    ['crm','pipeline','Pipeline comercial'],
    ['marketing','campaigns','Campañas'],
    ['proyectos','timesheets','Registro de horas'],
    ['facturacion-fiscal','cfdi','CFDI 4.0'],
  ];
  for(const [moduleKey,key,name] of features){
    await prisma.moduleFeature.upsert({
      where:{moduleId_key:{moduleId:moduleMap[moduleKey].id,key}},
      update:{name,active:true},
      create:{moduleId:moduleMap[moduleKey].id,key,name,active:true},
    });
  }

  const coreKeys=['inicio','ventas','compras','inventario','crm','proyectos','finanzas','rrhh','reportes'];
  const growthKeys=[...coreKeys,'marketing','pos'];
  const businessKeys=[...growthKeys,'produccion','facturacion-fiscal'];

  async function upsertPlan(key,name,monthly,annual,moduleKeys,sortOrder){
    const plan=await prisma.subscriptionPlan.upsert({
      where:{key},
      update:{name,monthlyPrice:monthly,annualPrice:annual,currency:'MXN',active:true,sortOrder},
      create:{key,name,monthlyPrice:monthly,annualPrice:annual,currency:'MXN',active:true,sortOrder},
    });
    await prisma.subscriptionPlanModule.deleteMany({where:{planId:plan.id}});
    await prisma.subscriptionPlanModule.createMany({data:moduleKeys.map(k=>({planId:plan.id,moduleId:moduleMap[k].id,enabled:true}))});
    return plan;
  }

  const planStarter=await upsertPlan('starter','Starter',1499,14990,coreKeys,1);
  const planGrowth=await upsertPlan('growth','Growth',2999,29990,growthKeys,2);
  const planBusiness=await upsertPlan('business','Business OS',5499,54990,businessKeys,3);

  await prisma.subscriptionPlanLimit.deleteMany({where:{planId:{in:[planStarter.id,planGrowth.id,planBusiness.id]}}});
  await prisma.subscriptionPlanLimit.createMany({data:[
    {planId:planStarter.id,metricKey:'users',metricType:'USERS',limitValue:5,hardLimit:true,description:'Usuarios incluidos'},
    {planId:planGrowth.id,metricKey:'users',metricType:'USERS',limitValue:15,hardLimit:true,description:'Usuarios incluidos'},
    {planId:planBusiness.id,metricKey:'users',metricType:'USERS',limitValue:50,hardLimit:false,description:'Usuarios incluidos'},
    {planId:planStarter.id,metricKey:'api_calls',metricType:'API_CALLS',limitValue:10000,hardLimit:false},
    {planId:planGrowth.id,metricKey:'api_calls',metricType:'API_CALLS',limitValue:50000,hardLimit:false},
    {planId:planBusiness.id,metricKey:'api_calls',metricType:'API_CALLS',limitValue:250000,hardLimit:false},
  ]});

  await prisma.companySubscription.updateMany({
    where:{companyId:company.id,status:{in:['TRIAL','ACTIVE','PAST_DUE']}},
    data:{status:'EXPIRED'},
  });
  await prisma.companySubscription.create({
    data:{
      billingDay: 15,
      nextBillingAt: d('2026-09-15'),
      planChangeLockedUntil: d('2026-09-15'),
      companyId:company.id,
      planId:planBusiness.id,
      changedById:user.id,
      status:'ACTIVE',
      startedAt:d('2026-09-01'),
      currentPeriodStart:d('2026-09-01'),
      currentPeriodEnd:d('2026-10-01'),
      notes:'[DEMO] Suscripción Business OS activa.',
    },
  });

  for(const mod of Object.values(moduleMap)){
    await prisma.companyModule.upsert({
      where:{companyId_moduleId:{companyId:company.id,moduleId:mod.id}},
      update:{enabled:true},
      create:{companyId:company.id,moduleId:mod.id,enabled:true},
    });
  }

  await prisma.companyFeatureLimit.upsert({
    where:{companyId_metricKey:{companyId:company.id,metricKey:'users'}},
    update:{metricType:'USERS',limitValue:25,hardLimit:false,source:'OVERRIDE'},
    create:{companyId:company.id,metricKey:'users',metricType:'USERS',limitValue:25,hardLimit:false,source:'OVERRIDE'},
  });

  await prisma.usageRecord.upsert({
    where:{companyId_metricKey_periodStart_periodEnd:{companyId:company.id,metricKey:'users',periodStart:d('2026-09-01'),periodEnd:d('2026-10-01')}},
    update:{metricType:'USERS',quantity:10,source:'DEMO'},
    create:{companyId:company.id,metricKey:'users',metricType:'USERS',quantity:10,periodStart:d('2026-09-01'),periodEnd:d('2026-10-01'),source:'DEMO'},
  });


  console.log('');
  console.log('✅ Datos demo creados correctamente.');
  console.log('Usuario: admin@erp.local');
  console.log('Contraseña: Admin123!');
  console.log('');
  console.log('Resumen:');
  console.log(`- ${Object.keys(products).length} productos`);
  console.log(`- ${Object.keys(suppliers).length} proveedores`);
  console.log(`- ${Object.keys(customers).length} clientes`);
  


  console.log('Creando gastos y viáticos demo...');
  const expenseCategories = {};
  for (const category of [
    {code:'VIAJES',name:'Viajes y hospedaje'},
    {code:'ALIMENTOS',name:'Alimentos'},
    {code:'TRANSPORTE',name:'Transporte'},
    {code:'OFICINA',name:'Gastos de oficina'},
    {code:'REPRESENTACION',name:'Representación'},
  ]) {
    expenseCategories[category.code] = await prisma.expenseCategory.upsert({
      where:{companyId_code:{companyId:company.id,code:category.code}},
      update:{name:category.name,active:true},
      create:{companyId:company.id,...category,active:true}
    });
  }
  const expenseWorkflow = await prisma.approvalWorkflow.upsert({
    where:{companyId_key:{companyId:company.id,key:'expense-approval'}},
    update:{name:'Aprobación de gastos',entityType:'EXPENSE',active:true,priority:20},
    create:{companyId:company.id,key:'expense-approval',name:'Aprobación de gastos',description:'Autoriza gastos y viáticos antes de reembolso o pago.',entityType:'EXPENSE',active:true,priority:20}
  });
  await prisma.approvalRule.deleteMany({where:{workflowId:expenseWorkflow.id}});
  await prisma.approvalRule.create({
    data:{workflowId:expenseWorkflow.id,sequence:1,name:'Autorización financiera',actorType:'PERMISSION',permissionKey:'approvals.decide',minAmount:1000,required:true}
  });

  console.log('Creando aprobaciones demo...');
  const approvalWorkflow = await prisma.approvalWorkflow.upsert({
    where:{companyId_key:{companyId:company.id,key:'purchase-order-approval'}},
    update:{name:'Aprobación de órdenes de compra',entityType:'PURCHASE_ORDER',active:true,priority:10},
    create:{companyId:company.id,key:'purchase-order-approval',name:'Aprobación de órdenes de compra',description:'Flujo demo para órdenes de compra relevantes.',entityType:'PURCHASE_ORDER',active:true,priority:10}
  });
  await prisma.approvalRule.deleteMany({where:{workflowId:approvalWorkflow.id}});
  await prisma.approvalRule.create({
    data:{workflowId:approvalWorkflow.id,sequence:1,name:'Aprobación administrativa',actorType:'PERMISSION',permissionKey:'approvals.decide',minAmount:5000,required:true}
  });
  await prisma.approvalRequest.deleteMany({where:{companyId:company.id,entityType:'DEMO_APPROVAL'}});
  const demoApproval = await prisma.approvalRequest.create({
    data:{
      companyId:company.id,workflowId:approvalWorkflow.id,entityType:'DEMO_APPROVAL',entityId:'demo-oc-001',
      entityFolio:'OC-DEMO-001',title:'Autorizar compra de inventario',description:'Solicitud demo de aprobación.',
      requestedById:admin.id,status:'PENDING',currentStep:1,amount:18500,currency:'MXN',
      steps:{create:[{sequence:1,name:'Aprobación administrativa',permissionKey:'approvals.decide',status:'PENDING'}]}
    }
  });

  console.log('Creando billing SaaS demo...');
  const activeSubscription = await prisma.companySubscription.findFirst({
    where:{companyId:company.id,status:'ACTIVE'},
    orderBy:{startedAt:'desc'},
  });
  if(activeSubscription){
    await prisma.billingPaymentMethod.deleteMany({where:{companyId:company.id}});
    await prisma.billingPaymentMethod.create({
      data:{companyId:company.id,provider:'MERCADO_PAGO',externalId:'demo-card-4242',brand:'Visa',last4:'4242',expMonth:12,expYear:2029,isDefault:true}
    });

    const demoInvoice = await prisma.billingInvoice.upsert({
      where:{companyId_number:{companyId:company.id,number:'BILL-DEMO-0001'}},
      update:{status:'PAID',subtotal:5499,tax:879.84,total:6378.84,paidAt:d('2026-09-02')},
      create:{
        companyId:company.id,subscriptionId:activeSubscription.id,number:'BILL-DEMO-0001',
        status:'PAID',currency:'MXN',subtotal:5499,tax:879.84,total:6378.84,
        dueAt:d('2026-09-02'),paidAt:d('2026-09-02'),
        periodStart:d('2026-09-02'),periodEnd:d('2026-10-02'),
        lines:{create:[{type:'PLAN',description:'Business OS · mensual',quantity:1,unitAmount:5499,amount:5499}]}
      }
    });
    await prisma.billingPaymentAttempt.create({
      data:{companyId:company.id,invoiceId:demoInvoice.id,provider:'MERCADO_PAGO',externalPaymentId:'demo-payment-001',status:'SUCCEEDED',amount:6378.84,currency:'MXN',completedAt:d('2026-09-02')}
    });
  }

  console.log(`- ${Object.keys(employees).length} empleados`);
  console.log('- Compras, inventario, ventas, cobranza y postventa');
  console.log('- Tesorería, conciliación, flujo y presupuestos');
  console.log('- Contabilidad, nómina, RH, notificaciones y auditoría');
  console.log('- Proyectos, tareas, equipo, tiempos y costos');
  console.log('- Marketing: campañas, leads, atribución, gastos, métricas y calendario');
  console.log('- Facturación fiscal: CFDI 4.0, cancelaciones y complemento de pagos 2.0');
  console.log('- Producción: BOM, órdenes, operaciones, consumos, mermas, lotes y costos');
  console.log('- POS: terminales, sesiones de caja, tickets, pagos y movimientos');
  console.log('- Configuración SaaS: módulos, features, planes, límites y suscripción');
}

main()
  .catch((error) => {
    console.error('Error al cargar datos demo:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });