import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma=new PrismaClient();

const money=n=>Number(Number(n).toFixed(2));
const addDays=(date,days)=>{
  const d=new Date(date);
  d.setDate(d.getDate()+days);
  return d;
};
const startOfDay=value=>{
  const d=new Date(value);
  d.setHours(0,0,0,0);
  return d;
};

async function ensureDemoCompany(){
  const taxId='BBD260904D01';

  return prisma.company.upsert({
    where:{taxId},
    update:{
      name:'BuzzBee Demo Company',
      legalName:'BuzzBee Demo Company SA de CV',
      email:'demo-company@buzzbee.mx',
      industry:'Servicios empresariales',
      country:'MX',
      currency:'MXN',
      timezone:'America/Monterrey',
      active:true
    },
    create:{
      name:'BuzzBee Demo Company',
      legalName:'BuzzBee Demo Company SA de CV',
      taxId,
      email:'demo-company@buzzbee.mx',
      industry:'Servicios empresariales',
      country:'MX',
      currency:'MXN',
      timezone:'America/Monterrey',
      active:true
    }
  });
}

async function getAdminRole(){
  return prisma.role.findUnique({where:{name:'Administrador'}});
}

async function ensureDemoUser(company,role){
  const email='demo@buzzbee.mx';
  const passwordHash=await bcrypt.hash('BuzzBee2026!',12);

  const user=await prisma.user.upsert({
    where:{email},
    update:{
      companyId:company.id,
      firstName:'Demo',
      lastName:'BuzzBee',
      active:true,
      passwordHash
    },
    create:{
      companyId:company.id,
      email,
      firstName:'Demo',
      lastName:'BuzzBee',
      active:true,
      passwordHash
    }
  });

  if(role){
    await prisma.userRole.upsert({
      where:{userId_roleId:{userId:user.id,roleId:role.id}},
      update:{},
      create:{userId:user.id,roleId:role.id}
    });
  }else{
    console.warn('Advertencia: no se encontró el rol Administrador. Ejecuta npm run db:seed antes del seed demo.');
  }

  return user;
}

async function main(){
  console.log('Creando/actualizando empresa demo BuzzBee...');

  const company=await ensureDemoCompany();
  const role=await getAdminRole();
  const demoUser=await ensureDemoUser(company,role);

  const branch=await prisma.branch.upsert({
    where:{companyId_code:{companyId:company.id,code:'MTY'}},
    update:{name:'Monterrey',active:true},
    create:{
      companyId:company.id,
      code:'MTY',
      name:'Monterrey',
      active:true
    }
  });

  const warehouse=await prisma.warehouse.upsert({
    where:{branchId_code:{branchId:branch.id,code:'ALM-MTY'}},
    update:{name:'Almacén Monterrey',active:true},
    create:{
      branchId:branch.id,
      code:'ALM-MTY',
      name:'Almacén Monterrey',
      active:true
    }
  });

  const categories=[];
  for(const [code,name] of [
    ['MAT-OFI','Material de oficina'],
    ['LIM','Limpieza'],
    ['TEC','Tecnología'],
    ['MRO','Mantenimiento']
  ]){
    categories.push(await prisma.productCategory.upsert({
      where:{companyId_code:{companyId:company.id,code}},
      update:{name,active:true},
      create:{companyId:company.id,code,name,active:true}
    }));
  }
  const catByCode=Object.fromEntries(categories.map(x=>[x.code,x]));

  const productDefs=[
    ['PAP-A4','Papel bond carta','MAT-OFI',145,100,40],
    ['TON-001','Tóner impresora','MAT-OFI',890,22,8],
    ['CLN-001','Limpiador multiusos','LIM',72,35,15],
    ['LAP-001','Laptop corporativa','TEC',18500,8,3],
    ['MSE-001','Mouse inalámbrico','TEC',420,18,10],
    ['MRO-001','Kit mantenimiento preventivo','MRO',1250,3,5]
  ];

  const products=[];
  for(const [sku,name,categoryCode,cost,qty,minStock] of productDefs){
    products.push(await prisma.product.upsert({
      where:{companyId_sku:{companyId:company.id,sku}},
      update:{
        name,
        categoryId:catByCode[categoryCode].id,
        cost,
        price:money(cost*1.35),
        minStock,
        active:true
      },
      create:{
        companyId:company.id,
        sku,
        name,
        categoryId:catByCode[categoryCode].id,
        cost,
        price:money(cost*1.35),
        minStock,
        active:true
      }
    }));
  }
  const productBySku=Object.fromEntries(products.map(x=>[x.sku,x]));

  const supplierDefs=[
    ['PROV-001','Tecnología del Norte SA de CV','TDN260101AA1','ventas@tecnologiadelnorte.mx',30],
    ['PROV-002','Suministros Regios SA de CV','SRE260101BB2','compras@suministrosregios.mx',15],
    ['PROV-003','Mantenimiento Industrial MX','MIM260101CC3','contacto@mantenimientoindustrial.mx',30]
  ];
  const suppliers=[];
  for(const [code,legalName,taxId,email,paymentTerms] of supplierDefs){
    suppliers.push(await prisma.supplier.upsert({
      where:{companyId_code:{companyId:company.id,code}},
      update:{
        legalName,
        commercialName:legalName,
        taxId,
        email,
        paymentTerms,
        active:true
      },
      create:{
        companyId:company.id,
        code,
        legalName,
        commercialName:legalName,
        taxId,
        email,
        paymentTerms,
        active:true
      }
    }));
  }
  const supplierByCode=Object.fromEntries(suppliers.map(x=>[x.code,x]));

  const customerDefs=[
    ['CLI-001','Grupo Comercial Monterrey SA de CV','GCM260101DD4','administracion@grupocomercial.mx',30,150000],
    ['CLI-002','Servicios Corporativos del Norte','SCN260101EE5','pagos@scn.mx',15,80000],
    ['CLI-003','Hotel Sierra Azul','HSA260101FF6','compras@hotelsierraazul.mx',30,120000]
  ];
  const customers=[];
  for(const [code,legalName,taxId,email,creditDays,creditLimit] of customerDefs){
    customers.push(await prisma.customer.upsert({
      where:{companyId_code:{companyId:company.id,code}},
      update:{
        legalName,
        commercialName:legalName,
        taxId,
        email,
        creditDays,
        creditLimit,
        active:true
      },
      create:{
        companyId:company.id,
        code,
        legalName,
        commercialName:legalName,
        taxId,
        email,
        creditDays,
        creditLimit,
        active:true
      }
    }));
  }

  const departments=[];
  for(const [code,name] of [
    ['ADM','Administración'],
    ['COM','Compras'],
    ['ALM','Almacén'],
    ['VEN','Ventas']
  ]){
    departments.push(await prisma.department.upsert({
      where:{companyId_code:{companyId:company.id,code}},
      update:{name,active:true},
      create:{companyId:company.id,code,name,active:true}
    }));
  }
  const dept=Object.fromEntries(departments.map(x=>[x.code,x]));

  const positions=[];
  for(const [code,name,departmentCode] of [
    ['GER-ADM','Gerente Administrativo','ADM'],
    ['AN-COM','Analista de Compras','COM'],
    ['SUP-ALM','Supervisor de Almacén','ALM'],
    ['EJE-VEN','Ejecutivo de Ventas','VEN']
  ]){
    positions.push(await prisma.position.upsert({
      where:{companyId_code:{companyId:company.id,code}},
      update:{
        name,
        departmentId:dept[departmentCode].id,
        active:true
      },
      create:{
        companyId:company.id,
        code,
        name,
        departmentId:dept[departmentCode].id,
        active:true
      }
    }));
  }
  const pos=Object.fromEntries(positions.map(x=>[x.code,x]));

  const employeeDefs=[
    ['EMP-001','Ana','Torres','ADM','GER-ADM',42000],
    ['EMP-002','Luis','Ramírez','COM','AN-COM',26000],
    ['EMP-003','Mariana','Gómez','ALM','SUP-ALM',24000],
    ['EMP-004','Carlos','Mendoza','VEN','EJE-VEN',23000],
    ['EMP-005','Sofía','Villarreal','VEN','EJE-VEN',23500]
  ];
  const employees=[];
  for(const [employeeNumber,firstName,lastName,departmentCode,positionCode,salary] of employeeDefs){
    employees.push(await prisma.employee.upsert({
      where:{companyId_employeeNumber:{companyId:company.id,employeeNumber}},
      update:{
        branchId:branch.id,
        firstName,
        lastName,
        departmentId:dept[departmentCode].id,
        positionId:pos[positionCode].id,
        salary,
        status:'ACTIVE'
      },
      create:{
        companyId:company.id,
        branchId:branch.id,
        employeeNumber,
        firstName,
        lastName,
        departmentId:dept[departmentCode].id,
        positionId:pos[positionCode].id,
        salary,
        status:'ACTIVE',
        hireDate:new Date('2025-01-15')
      }
    }));
  }
  const employeeByNumber=Object.fromEntries(employees.map(x=>[x.employeeNumber,x]));

  // Inventario inicial demo. Un producto queda debajo del mínimo de forma intencional.
  for(const [sku,,,cost,qty] of productDefs){
    await prisma.inventoryBalance.upsert({
      where:{
        warehouseId_productId:{
          warehouseId:warehouse.id,
          productId:productBySku[sku].id
        }
      },
      update:{quantity:qty,averageCost:cost},
      create:{
        warehouseId:warehouse.id,
        productId:productBySku[sku].id,
        quantity:qty,
        averageCost:cost
      }
    });
  }

  const now=new Date();

  const purchaseRequest=await prisma.purchaseRequest.upsert({
    where:{companyId_folio:{companyId:company.id,folio:'SOL-DEM-001'}},
    update:{
      warehouseId:warehouse.id,
      requestedById:demoUser.id,
      title:'Reposición de equipo y consumibles',
      justification:'Reabastecimiento preventivo para operación mensual.',
      status:'APPROVED',
      priority:'HIGH',
      submittedAt:addDays(now,-8),
      resolvedAt:addDays(now,-7),
      resolvedById:demoUser.id,
      resolutionNote:'Aprobada para demo comercial.'
    },
    create:{
      companyId:company.id,
      warehouseId:warehouse.id,
      requestedById:demoUser.id,
      folio:'SOL-DEM-001',
      title:'Reposición de equipo y consumibles',
      justification:'Reabastecimiento preventivo para operación mensual.',
      status:'APPROVED',
      priority:'HIGH',
      submittedAt:addDays(now,-8),
      resolvedAt:addDays(now,-7),
      resolvedById:demoUser.id,
      resolutionNote:'Aprobada para demo comercial.'
    }
  });

  const requestLines=[
    ['LAP-001',2],
    ['TON-001',8],
    ['MRO-001',5]
  ];
  for(const [sku,quantity] of requestLines){
    const product=productBySku[sku];
    await prisma.purchaseRequestItem.upsert({
      where:{
        purchaseRequestId_productId:{
          purchaseRequestId:purchaseRequest.id,
          productId:product.id
        }
      },
      update:{
        quantity,
        estimatedUnitCost:Number(product.cost),
        notes:'Partida demo'
      },
      create:{
        purchaseRequestId:purchaseRequest.id,
        productId:product.id,
        quantity,
        estimatedUnitCost:Number(product.cost),
        notes:'Partida demo'
      }
    });
  }

  const poSubtotal=44120;
  const poTax=7059.20;
  const poTotal=51179.20;

  const purchaseOrder=await prisma.purchaseOrder.upsert({
    where:{companyId_folio:{companyId:company.id,folio:'OC-DEM-001'}},
    update:{
      supplierId:supplierByCode['PROV-001'].id,
      warehouseId:warehouse.id,
      purchaseRequestId:purchaseRequest.id,
      createdById:demoUser.id,
      status:'PARTIALLY_RECEIVED',
      orderDate:addDays(now,-6),
      currency:'MXN',
      paymentTerms:30,
      subtotal:poSubtotal,
      taxAmount:poTax,
      total:poTotal,
      issuedAt:addDays(now,-6),
      notes:'Orden demo parcialmente recibida.'
    },
    create:{
      companyId:company.id,
      supplierId:supplierByCode['PROV-001'].id,
      warehouseId:warehouse.id,
      purchaseRequestId:purchaseRequest.id,
      createdById:demoUser.id,
      folio:'OC-DEM-001',
      status:'PARTIALLY_RECEIVED',
      orderDate:addDays(now,-6),
      currency:'MXN',
      paymentTerms:30,
      subtotal:poSubtotal,
      taxAmount:poTax,
      total:poTotal,
      issuedAt:addDays(now,-6),
      notes:'Orden demo parcialmente recibida.'
    }
  });

  const orderLines=[
    ['LAP-001',2,18500,16],
    ['TON-001',8,890,16]
  ];
  const orderItems={};
  for(const [sku,quantity,unitCost,taxRate] of orderLines){
    const subtotal=money(quantity*unitCost);
    const taxAmount=money(subtotal*(taxRate/100));
    const total=money(subtotal+taxAmount);

    orderItems[sku]=await prisma.purchaseOrderItem.upsert({
      where:{
        purchaseOrderId_productId:{
          purchaseOrderId:purchaseOrder.id,
          productId:productBySku[sku].id
        }
      },
      update:{
        quantity,
        unitCost,
        taxRate,
        subtotal,
        taxAmount,
        total,
        receivedQuantity:sku==='TON-001'?4:0,
        notes:'Partida demo'
      },
      create:{
        purchaseOrderId:purchaseOrder.id,
        productId:productBySku[sku].id,
        quantity,
        unitCost,
        taxRate,
        subtotal,
        taxAmount,
        total,
        receivedQuantity:sku==='TON-001'?4:0,
        notes:'Partida demo'
      }
    });
  }

  const receipt=await prisma.goodsReceipt.upsert({
    where:{companyId_folio:{companyId:company.id,folio:'REC-DEM-001'}},
    update:{
      purchaseOrderId:purchaseOrder.id,
      warehouseId:warehouse.id,
      createdById:demoUser.id,
      status:'POSTED',
      supplierDocument:'FAC-DEM-1001',
      receivedAt:addDays(now,-2),
      notes:'Recepción parcial para demo comercial.'
    },
    create:{
      companyId:company.id,
      purchaseOrderId:purchaseOrder.id,
      warehouseId:warehouse.id,
      createdById:demoUser.id,
      folio:'REC-DEM-001',
      status:'POSTED',
      supplierDocument:'FAC-DEM-1001',
      receivedAt:addDays(now,-2),
      notes:'Recepción parcial para demo comercial.'
    }
  });

  let receiptItem=await prisma.goodsReceiptItem.findFirst({
    where:{
      goodsReceiptId:receipt.id,
      purchaseOrderItemId:orderItems['TON-001'].id,
      productId:productBySku['TON-001'].id
    }
  });
  if(receiptItem){
    receiptItem=await prisma.goodsReceiptItem.update({
      where:{id:receiptItem.id},
      data:{quantity:4,unitCost:890,notes:'Recepción demo'}
    });
  }else{
    receiptItem=await prisma.goodsReceiptItem.create({
      data:{
        goodsReceiptId:receipt.id,
        purchaseOrderItemId:orderItems['TON-001'].id,
        productId:productBySku['TON-001'].id,
        quantity:4,
        unitCost:890,
        notes:'Recepción demo'
      }
    });
  }

  await prisma.accountsPayable.upsert({
    where:{
      companyId_supplierId_invoiceNumber:{
        companyId:company.id,
        supplierId:supplierByCode['PROV-001'].id,
        invoiceNumber:'FAC-DEM-1001'
      }
    },
    update:{
      purchaseOrderId:purchaseOrder.id,
      createdById:demoUser.id,
      issueDate:addDays(now,-2),
      dueDate:addDays(now,28),
      currency:'MXN',
      subtotal:3560,
      taxAmount:569.60,
      total:4129.60,
      paidAmount:0,
      status:'PENDING',
      notes:'CxP demo ligada a recepción.'
    },
    create:{
      companyId:company.id,
      supplierId:supplierByCode['PROV-001'].id,
      purchaseOrderId:purchaseOrder.id,
      createdById:demoUser.id,
      invoiceNumber:'FAC-DEM-1001',
      issueDate:addDays(now,-2),
      dueDate:addDays(now,28),
      currency:'MXN',
      subtotal:3560,
      taxAmount:569.60,
      total:4129.60,
      paidAmount:0,
      status:'PENDING',
      notes:'CxP demo ligada a recepción.'
    }
  });

  const customer=customers[0];
  await prisma.accountsReceivable.upsert({
    where:{
      companyId_customerId_invoiceNumber:{
        companyId:company.id,
        customerId:customer.id,
        invoiceNumber:'CXC-DEM-001'
      }
    },
    update:{
      createdById:demoUser.id,
      issueDate:addDays(now,-45),
      dueDate:addDays(now,-15),
      currency:'MXN',
      subtotal:42000,
      taxAmount:6720,
      total:48720,
      paidAmount:10000,
      status:'PARTIALLY_PAID',
      notes:'Cartera demo vencida.'
    },
    create:{
      companyId:company.id,
      customerId:customer.id,
      createdById:demoUser.id,
      invoiceNumber:'CXC-DEM-001',
      issueDate:addDays(now,-45),
      dueDate:addDays(now,-15),
      currency:'MXN',
      subtotal:42000,
      taxAmount:6720,
      total:48720,
      paidAmount:10000,
      status:'PARTIALLY_PAID',
      notes:'Cartera demo vencida.'
    }
  });

  const today=startOfDay(now);
  for(const [index,employee] of employees.entries()){
    const status=index===4?'LATE':'PRESENT';
    const checkIn=new Date(today);
    checkIn.setHours(status==='LATE'?9:8,status==='LATE'?35:50,0,0);

    await prisma.attendanceRecord.upsert({
      where:{employeeId_date:{employeeId:employee.id,date:today}},
      update:{
        companyId:company.id,
        status,
        checkIn,
        notes:'Registro demo'
      },
      create:{
        companyId:company.id,
        employeeId:employee.id,
        date:today,
        status,
        checkIn,
        notes:'Registro demo'
      }
    });
  }

  let leave=await prisma.leaveRequest.findFirst({
    where:{
      companyId:company.id,
      employeeId:employeeByNumber['EMP-004'].id,
      status:'PENDING',
      reason:'Trámite personal demo'
    }
  });
  if(!leave){
    leave=await prisma.leaveRequest.create({
      data:{
        companyId:company.id,
        employeeId:employeeByNumber['EMP-004'].id,
        type:'PERSONAL',
        startDate:addDays(today,5),
        endDate:addDays(today,5),
        days:1,
        reason:'Trámite personal demo',
        status:'PENDING'
      }
    });
  }

  let incident=await prisma.hrIncident.findFirst({
    where:{
      companyId:company.id,
      employeeId:employeeByNumber['EMP-005'].id,
      description:'Retardo recurrente detectado en demo'
    }
  });
  if(!incident){
    incident=await prisma.hrIncident.create({
      data:{
        companyId:company.id,
        employeeId:employeeByNumber['EMP-005'].id,
        type:'LATE_ARRIVAL',
        date:addDays(today,-3),
        amount:0,
        description:'Retardo recurrente detectado en demo',
        notes:'Incidencia informativa para la demostración.'
      }
    });
  }

  for(const supplier of suppliers){
    let party=await prisma.businessParty.findFirst({
      where:{
        companyId:company.id,
        OR:[
          {supplierId:supplier.id},
          ...(supplier.taxId?[{taxId:supplier.taxId}]:[]),
          ...(supplier.email?[{email:supplier.email}]:[])
        ]
      }
    });

    if(!party){
      party=await prisma.businessParty.create({
        data:{
          companyId:company.id,
          type:'ORGANIZATION',
          displayName:supplier.commercialName||supplier.legalName,
          legalName:supplier.legalName,
          commercialName:supplier.commercialName,
          taxId:supplier.taxId,
          email:supplier.email,
          phone:supplier.phone,
          supplierId:supplier.id,
          active:true,
          tags:['demo','proveedor']
        }
      });
    }else if(!party.supplierId){
      party=await prisma.businessParty.update({
        where:{id:party.id},
        data:{supplierId:supplier.id}
      });
    }

    await prisma.businessPartyRole.upsert({
      where:{partyId_role:{partyId:party.id,role:'SUPPLIER'}},
      update:{active:true},
      create:{partyId:party.id,role:'SUPPLIER',active:true}
    });
  }

  for(const customerItem of customers){
    let party=await prisma.businessParty.findFirst({
      where:{
        companyId:company.id,
        OR:[
          {customerId:customerItem.id},
          ...(customerItem.taxId?[{taxId:customerItem.taxId}]:[]),
          ...(customerItem.email?[{email:customerItem.email}]:[])
        ]
      }
    });

    if(!party){
      party=await prisma.businessParty.create({
        data:{
          companyId:company.id,
          type:'ORGANIZATION',
          displayName:customerItem.commercialName||customerItem.legalName,
          legalName:customerItem.legalName,
          commercialName:customerItem.commercialName,
          taxId:customerItem.taxId,
          email:customerItem.email,
          phone:customerItem.phone,
          customerId:customerItem.id,
          active:true,
          tags:['demo','cliente']
        }
      });
    }else if(!party.customerId){
      party=await prisma.businessParty.update({
        where:{id:party.id},
        data:{customerId:customerItem.id}
      });
    }

    await prisma.businessPartyRole.upsert({
      where:{partyId_role:{partyId:party.id,role:'CUSTOMER'}},
      update:{active:true},
      create:{partyId:party.id,role:'CUSTOMER',active:true}
    });
  }

  console.log('');
  console.log('BuzzBee Demo Company lista');
  console.log('==========================');
  console.log(`Empresa: ${company.name}`);
  console.log(`RFC demo: ${company.taxId}`);
  console.log('Usuario demo: demo@buzzbee.mx');
  console.log('Password demo: BuzzBee2026!');
  console.log(`Productos: ${products.length}`);
  console.log(`Proveedores: ${suppliers.length}`);
  console.log(`Clientes: ${customers.length}`);
  console.log(`Empleados: ${employees.length}`);
  console.log('SOLPED: SOL-DEM-001');
  console.log('OC: OC-DEM-001');
  console.log('Recepción: REC-DEM-001');
  console.log('');
  console.log('Seed idempotente y aislado por empresa. No elimina información existente.');
}

main()
  .catch(error=>{
    console.error(error);
    process.exit(1);
  })
  .finally(async()=>prisma.$disconnect());
