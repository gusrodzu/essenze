import {Router} from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {emitIntegrationEventAsync} from '../services/integrationEvents.js';

const router=Router();
router.use(requireAuth);

const upload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:10*1024*1024},
  fileFilter(_req,file,cb){
    const ok=/\.(csv|xlsx|xls)$/i.test(file.originalname);
    cb(ok?null:new Error('Formato no soportado. Usa CSV, XLSX o XLS.'),ok);
  }
});

const definitions={
  CUSTOMER:{
    label:'Clientes',
    fields:[
      ['code','Código',true],['legalName','Razón social',true],['commercialName','Nombre comercial',false],
      ['taxId','RFC / Tax ID',false],['contactName','Contacto',false],['email','Email',false],
      ['phone','Teléfono',false],['address','Dirección',false],['creditDays','Días de crédito',false],
      ['creditLimit','Límite de crédito',false]
    ],
    aliases:{
      code:['codigo','código','code','id cliente','clave'],
      legalName:['razon social','razón social','legal name','nombre fiscal','cliente','nombre'],
      commercialName:['nombre comercial','commercial name'],
      taxId:['rfc','tax id','taxid','identificacion fiscal'],
      contactName:['contacto','contact name'],
      email:['email','correo','correo electronico','correo electrónico'],
      phone:['telefono','teléfono','phone','celular'],
      address:['direccion','dirección','address'],
      creditDays:['dias credito','días crédito','dias de credito','credit days'],
      creditLimit:['limite credito','límite crédito','limite de credito','credit limit']
    }
  },
  SUPPLIER:{
    label:'Proveedores',
    fields:[
      ['code','Código',true],['legalName','Razón social',true],['commercialName','Nombre comercial',false],
      ['taxId','RFC / Tax ID',false],['contactName','Contacto',false],['email','Email',false],
      ['phone','Teléfono',false],['address','Dirección',false],['paymentTerms','Días de pago',false]
    ],
    aliases:{
      code:['codigo','código','code','clave proveedor','clave'],
      legalName:['razon social','razón social','legal name','proveedor','nombre'],
      commercialName:['nombre comercial','commercial name'],
      taxId:['rfc','tax id','taxid'],
      contactName:['contacto','contact name'],
      email:['email','correo','correo electronico','correo electrónico'],
      phone:['telefono','teléfono','phone'],
      address:['direccion','dirección','address'],
      paymentTerms:['dias pago','días pago','payment terms','dias de pago']
    }
  },
  PRODUCT:{
    label:'Productos',
    fields:[
      ['sku','SKU',true],['name','Nombre',true],['description','Descripción',false],['unit','Unidad',false],
      ['cost','Costo',false],['price','Precio',false],['minStock','Stock mínimo',false],['category','Categoría',false]
    ],
    aliases:{
      sku:['sku','codigo','código','clave producto','clave'],
      name:['producto','nombre','name'],
      description:['descripcion','descripción','description'],
      unit:['unidad','unit','uom'],
      cost:['costo','cost'],
      price:['precio','price'],
      minStock:['stock minimo','stock mínimo','min stock','minstock'],
      category:['categoria','categoría','category']
    }
  },
  EMPLOYEE:{
    label:'Empleados',
    fields:[
      ['employeeNumber','Número empleado',true],['firstName','Nombre',true],['lastName','Apellidos',true],
      ['email','Email',false],['phone','Teléfono',false],['hireDate','Fecha ingreso',true],
      ['salary','Salario',false],['department','Departamento',false],['position','Puesto',false]
    ],
    aliases:{
      employeeNumber:['numero empleado','número empleado','employee number','no empleado','clave'],
      firstName:['nombre','first name','nombres'],
      lastName:['apellido','apellidos','last name'],
      email:['email','correo'],
      phone:['telefono','teléfono','phone'],
      hireDate:['fecha ingreso','fecha de ingreso','hire date'],
      salary:['salario','salary','sueldo'],
      department:['departamento','department'],
      position:['puesto','position','cargo']
    }
  }
};

const clean=v=>typeof v==='string'?v.trim():v;
const key=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const codeFromName=v=>{
  const base=key(v).toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24);
  return base||`AUTO-${Date.now()}`;
};
const number=v=>{
  if(v===null||v===undefined||v==='')return 0;
  const n=Number(String(v).replace(/[,$\s]/g,''));
  return Number.isFinite(n)?n:null;
};
const emailOk=v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));

function parseDate(v){
  if(!v)return null;
  if(v instanceof Date&&!Number.isNaN(v.getTime()))return v;
  if(typeof v==='number'){
    const d=XLSX.SSF.parse_date_code(v);
    if(d)return new Date(Date.UTC(d.y,d.m-1,d.d,12));
  }
  const s=String(v).trim();
  const mx=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(mx)return new Date(Date.UTC(Number(mx[3]),Number(mx[2])-1,Number(mx[1]),12));
  const d=new Date(s);
  return Number.isNaN(d.getTime())?null:d;
}

function readWorkbook(file){
  const workbook=XLSX.read(file.buffer,{type:'buffer',cellDates:true});
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  if(!sheet)throw new Error('El archivo no contiene una hoja legible.');
  const rows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:true});
  const headers=rows.length?Object.keys(rows[0]):[];
  return {rows,headers,sheetName:workbook.SheetNames[0]};
}

function suggestMapping(entityType,headers){
  const def=definitions[entityType],result={};
  for(const [field] of def.fields){
    const aliases=(def.aliases[field]||[]).map(key);
    const found=headers.find(h=>aliases.includes(key(h)));
    if(found)result[field]=found;
  }
  return result;
}

function normalizeRow(entityType,row,mapping){
  const get=f=>clean(row[mapping[f]]);
  const errors=[],warnings=[];
  let data={};

  if(entityType==='CUSTOMER'){
    data={
      code:get('code'),legalName:get('legalName'),commercialName:get('commercialName')||null,
      taxId:get('taxId')||null,contactName:get('contactName')||null,email:get('email')||null,
      phone:get('phone')||null,address:get('address')||null,
      creditDays:number(get('creditDays'))??0,creditLimit:number(get('creditLimit'))??0
    };
    if(!data.code)errors.push('Código requerido');
    if(!data.legalName)errors.push('Razón social requerida');
    if(!emailOk(data.email))errors.push('Email inválido');
    if(!data.taxId)warnings.push('RFC / Tax ID vacío');
  }

  if(entityType==='SUPPLIER'){
    data={
      code:get('code'),legalName:get('legalName'),commercialName:get('commercialName')||null,
      taxId:get('taxId')||null,contactName:get('contactName')||null,email:get('email')||null,
      phone:get('phone')||null,address:get('address')||null,paymentTerms:number(get('paymentTerms'))??0
    };
    if(!data.code)errors.push('Código requerido');
    if(!data.legalName)errors.push('Razón social requerida');
    if(!emailOk(data.email))errors.push('Email inválido');
  }

  if(entityType==='PRODUCT'){
    data={
      sku:get('sku'),name:get('name'),description:get('description')||null,unit:get('unit')||'PZA',
      cost:number(get('cost')),price:number(get('price')),minStock:number(get('minStock')),
      category:get('category')||null
    };
    if(!data.sku)errors.push('SKU requerido');
    if(!data.name)errors.push('Nombre requerido');
    if(data.cost===null)errors.push('Costo inválido');
    if(data.price===null)errors.push('Precio inválido');
    if(data.minStock===null)errors.push('Stock mínimo inválido');
  }

  if(entityType==='EMPLOYEE'){
    const hireDate=parseDate(get('hireDate'));
    data={
      employeeNumber:get('employeeNumber'),firstName:get('firstName'),lastName:get('lastName'),
      email:get('email')||null,phone:get('phone')||null,
      hireDate:hireDate?hireDate.toISOString():null,salary:number(get('salary')),
      department:get('department')||null,position:get('position')||null
    };
    if(!data.employeeNumber)errors.push('Número de empleado requerido');
    if(!data.firstName)errors.push('Nombre requerido');
    if(!data.lastName)errors.push('Apellidos requeridos');
    if(!hireDate)errors.push('Fecha de ingreso inválida');
    if(!emailOk(data.email))errors.push('Email inválido');
    if(data.salary===null)errors.push('Salario inválido');
  }

  return {data,errors,warnings};
}

async function findExisting(companyId,entityType,data){
  if(entityType==='CUSTOMER'){
    return prisma.customer.findFirst({
      where:{companyId,OR:[{code:data.code},...(data.taxId?[{taxId:data.taxId}]:[])]}
    });
  }
  if(entityType==='SUPPLIER'){
    return prisma.supplier.findFirst({
      where:{companyId,OR:[{code:data.code},...(data.taxId?[{taxId:data.taxId}]:[])]}
    });
  }
  if(entityType==='PRODUCT'){
    return prisma.product.findFirst({where:{companyId,sku:data.sku}});
  }
  return prisma.employee.findFirst({where:{companyId,employeeNumber:data.employeeNumber}});
}

function snapshotFor(entityType,record){
  if(!record)return null;
  if(entityType==='CUSTOMER')return {
    code:record.code,legalName:record.legalName,commercialName:record.commercialName,taxId:record.taxId,
    contactName:record.contactName,email:record.email,phone:record.phone,address:record.address,
    creditDays:record.creditDays,creditLimit:String(record.creditLimit),active:record.active
  };
  if(entityType==='SUPPLIER')return {
    code:record.code,legalName:record.legalName,commercialName:record.commercialName,taxId:record.taxId,
    contactName:record.contactName,email:record.email,phone:record.phone,address:record.address,
    paymentTerms:record.paymentTerms,active:record.active
  };
  if(entityType==='PRODUCT')return {
    sku:record.sku,name:record.name,description:record.description,unit:record.unit,
    cost:String(record.cost),price:String(record.price),minStock:String(record.minStock),
    categoryId:record.categoryId,active:record.active
  };
  return {
    employeeNumber:record.employeeNumber,firstName:record.firstName,lastName:record.lastName,
    email:record.email,phone:record.phone,hireDate:record.hireDate?.toISOString?.()||record.hireDate,
    salary:String(record.salary),departmentId:record.departmentId,positionId:record.positionId,
    branchId:record.branchId,status:record.status,notes:record.notes
  };
}

function comparableBefore(entityType,snapshot){
  if(!snapshot)return null;
  if(entityType==='PRODUCT'){
    const {categoryId,...rest}=snapshot;
    return rest;
  }
  if(entityType==='EMPLOYEE'){
    const {departmentId,positionId,branchId,status,notes,...rest}=snapshot;
    return rest;
  }
  const {active,...rest}=snapshot;
  return rest;
}

async function ensureCategory(companyId,name){
  if(!name)return null;
  let row=await prisma.productCategory.findFirst({where:{companyId,name:{equals:name,mode:'insensitive'}}});
  if(row)return row.id;
  let base=codeFromName(name),code=base,n=1;
  while(await prisma.productCategory.findFirst({where:{companyId,code}})){n++;code=`${base.slice(0,20)}-${n}`}
  row=await prisma.productCategory.create({data:{companyId,code,name,active:true}});
  return row.id;
}

async function ensureDepartment(companyId,name){
  if(!name)return null;
  let row=await prisma.department.findFirst({where:{companyId,name:{equals:name,mode:'insensitive'}}});
  if(row)return row.id;
  let base=codeFromName(name),code=base,n=1;
  while(await prisma.department.findFirst({where:{companyId,code}})){n++;code=`${base.slice(0,20)}-${n}`}
  row=await prisma.department.create({data:{companyId,code,name,active:true}});
  return row.id;
}

async function ensurePosition(companyId,name,departmentId){
  if(!name)return null;
  let row=await prisma.position.findFirst({where:{companyId,name:{equals:name,mode:'insensitive'},...(departmentId?{departmentId}: {})}});
  if(row)return row.id;
  let base=codeFromName(name),code=base,n=1;
  while(await prisma.position.findFirst({where:{companyId,code}})){n++;code=`${base.slice(0,20)}-${n}`}
  row=await prisma.position.create({data:{companyId,departmentId:departmentId||null,code,name,active:true}});
  return row.id;
}

async function materializeData(companyId,entityType,data){
  if(entityType==='PRODUCT'){
    const categoryId=await ensureCategory(companyId,data.category);
    const {category,...rest}=data;
    return {...rest,categoryId};
  }
  if(entityType==='EMPLOYEE'){
    const departmentId=await ensureDepartment(companyId,data.department);
    const positionId=await ensurePosition(companyId,data.position,departmentId);
    const {department,position,...rest}=data;
    return {...rest,departmentId,positionId,hireDate:new Date(rest.hireDate),salary:rest.salary??0};
  }
  return data;
}

async function createTarget(companyId,entityType,data){
  const materialized=await materializeData(companyId,entityType,data);
  if(entityType==='CUSTOMER')return prisma.customer.create({data:{companyId,...materialized}});
  if(entityType==='SUPPLIER')return prisma.supplier.create({data:{companyId,...materialized}});
  if(entityType==='PRODUCT')return prisma.product.create({data:{companyId,...materialized}});
  return prisma.employee.create({data:{companyId,...materialized}});
}

async function updateTarget(companyId,entityType,targetId,data){
  const materialized=await materializeData(companyId,entityType,data);
  if(entityType==='CUSTOMER'){
    const target=await prisma.customer.findFirst({where:{id:targetId,companyId}});
    if(!target)throw new Error('Cliente objetivo no encontrado.');
    return prisma.customer.update({where:{id:target.id},data:materialized});
  }
  if(entityType==='SUPPLIER'){
    const target=await prisma.supplier.findFirst({where:{id:targetId,companyId}});
    if(!target)throw new Error('Proveedor objetivo no encontrado.');
    return prisma.supplier.update({where:{id:target.id},data:materialized});
  }
  if(entityType==='PRODUCT'){
    const target=await prisma.product.findFirst({where:{id:targetId,companyId}});
    if(!target)throw new Error('Producto objetivo no encontrado.');
    return prisma.product.update({where:{id:target.id},data:materialized});
  }
  const target=await prisma.employee.findFirst({where:{id:targetId,companyId}});
  if(!target)throw new Error('Empleado objetivo no encontrado.');
  return prisma.employee.update({where:{id:target.id},data:materialized});
}

async function restoreTarget(companyId,entityType,targetId,beforeData){
  if(entityType==='CUSTOMER'){
    const target=await prisma.customer.findFirst({where:{id:targetId,companyId}});
    if(!target)throw new Error('El cliente actualizado ya no existe.');
    return prisma.customer.update({where:{id:target.id},data:beforeData});
  }
  if(entityType==='SUPPLIER'){
    const target=await prisma.supplier.findFirst({where:{id:targetId,companyId}});
    if(!target)throw new Error('El proveedor actualizado ya no existe.');
    return prisma.supplier.update({where:{id:target.id},data:beforeData});
  }
  if(entityType==='PRODUCT'){
    const target=await prisma.product.findFirst({where:{id:targetId,companyId}});
    if(!target)throw new Error('El producto actualizado ya no existe.');
    return prisma.product.update({where:{id:target.id},data:beforeData});
  }
  const target=await prisma.employee.findFirst({where:{id:targetId,companyId}});
  if(!target)throw new Error('El empleado actualizado ya no existe.');
  return prisma.employee.update({
    where:{id:target.id},
    data:{...beforeData,hireDate:new Date(beforeData.hireDate)}
  });
}

async function deleteCreatedTarget(companyId,entityType,targetId){
  if(entityType==='CUSTOMER'){
    const target=await prisma.customer.findFirst({where:{id:targetId,companyId}});
    if(!target)return;
    return prisma.customer.delete({where:{id:target.id}});
  }
  if(entityType==='SUPPLIER'){
    const target=await prisma.supplier.findFirst({where:{id:targetId,companyId}});
    if(!target)return;
    return prisma.supplier.delete({where:{id:target.id}});
  }
  if(entityType==='PRODUCT'){
    const target=await prisma.product.findFirst({where:{id:targetId,companyId}});
    if(!target)return;
    return prisma.product.delete({where:{id:target.id}});
  }
  const target=await prisma.employee.findFirst({where:{id:targetId,companyId}});
  if(!target)return;
  return prisma.employee.delete({where:{id:target.id}});
}

router.get('/definitions',requirePermission('data_hub.read'),async(_req,res)=>{
  res.json({
    definitions:Object.fromEntries(
      Object.entries(definitions).map(([k,v])=>[
        k,
        {label:v.label,fields:v.fields.map(([field,label,required])=>({key:field,label,required}))}
      ])
    ),
    modes:[
      {key:'CREATE_ONLY',label:'Solo crear',description:'Bloquea filas que coincidan con registros existentes.'},
      {key:'UPSERT',label:'Crear y actualizar',description:'Crea registros nuevos y prepara una comparación antes/después para coincidencias existentes.'}
    ]
  });
});

router.get('/dashboard',requirePermission('data_hub.read'),async(req,res,next)=>{
  try{
    const companyId=req.auth.companyId;
    const jobs=await prisma.dataImportJob.findMany({
      where:{companyId},
      orderBy:{createdAt:'desc'},
      take:25,
      include:{createdBy:{select:{firstName:true,lastName:true,email:true}}}
    });
    const summary=jobs.reduce((a,j)=>{
      a.jobs++;
      a.rows+=j.totalRows;
      a.imported+=j.importedRows;
      a.errors+=j.errorRows+j.invalidRows;
      if(j.status==='ROLLED_BACK'||j.status==='ROLLBACK_PARTIAL')a.rollbacks++;
      return a;
    },{jobs:0,rows:0,imported:0,errors:0,rollbacks:0});
    res.json({summary,jobs});
  }catch(e){next(e)}
});

router.post('/preview',requirePermission('data_hub.import'),upload.single('file'),async(req,res,next)=>{
  try{
    if(!req.file)return res.status(400).json({ok:false,message:'Selecciona un archivo.'});

    const entityType=String(req.body.entityType||'').toUpperCase();
    const mode=String(req.body.mode||'CREATE_ONLY').toUpperCase();

    if(!definitions[entityType]){
      return res.status(400).json({ok:false,message:'Entidad de importación no válida.'});
    }
    if(!['CREATE_ONLY','UPSERT'].includes(mode)){
      return res.status(400).json({ok:false,message:'Modo de importación no válido.'});
    }

    const {rows,headers,sheetName}=readWorkbook(req.file);

    if(!headers.length){
      return res.status(400).json({ok:false,message:'El archivo no contiene encabezados o registros.'});
    }
    if(rows.length>5000){
      return res.status(400).json({ok:false,message:'Data Hub admite hasta 5,000 filas por importación.'});
    }

    let mapping={};
    if(req.body.mapping){
      try{mapping=JSON.parse(req.body.mapping)}
      catch{return res.status(400).json({ok:false,message:'Mapeo de columnas inválido.'})}
    }

    const suggested=suggestMapping(entityType,headers);

    if(!req.body.mapping){
      return res.json({
        ok:true,requiresMapping:true,headers,suggestedMapping:suggested,
        sample:rows.slice(0,5),sheetName,totalRows:rows.length,mode
      });
    }

    const required=definitions[entityType].fields.filter(x=>x[2]).map(x=>x[0]);
    const missing=required.filter(f=>!mapping[f]);
    if(missing.length){
      return res.status(400).json({
        ok:false,
        message:`Faltan campos obligatorios en el mapeo: ${missing.join(', ')}`
      });
    }

    const staged=[];

    for(let i=0;i<rows.length;i++){
      const normalized=normalizeRow(entityType,rows[i],mapping);
      let existing=null;
      let action='CREATE';
      let beforeData=null;

      if(!normalized.errors.length){
        existing=await findExisting(req.auth.companyId,entityType,normalized.data);

        if(existing&&mode==='CREATE_ONLY'){
          normalized.errors.push('Ya existe un registro con la misma clave/RFC/SKU.');
        }else if(existing&&mode==='UPSERT'){
          action='UPDATE';
          beforeData=snapshotFor(entityType,existing);
        }
      }

      staged.push({
        rowNumber:i+2,
        status:normalized.errors.length?'INVALID':'VALID',
        action:normalized.errors.length?null:action,
        rawData:rows[i],
        normalizedData:normalized.data,
        beforeData,
        errors:normalized.errors,
        warnings:normalized.warnings,
        targetId:existing?.id||null
      });
    }

    const validRows=staged.filter(x=>x.status==='VALID').length;
    const invalidRows=staged.length-validRows;
    const creates=staged.filter(x=>x.status==='VALID'&&x.action==='CREATE').length;
    const updates=staged.filter(x=>x.status==='VALID'&&x.action==='UPDATE').length;

    const job=await prisma.dataImportJob.create({
      data:{
        companyId:req.auth.companyId,
        createdById:req.auth.sub,
        entityType,
        mode,
        fileName:req.file.originalname,
        fileType:req.file.mimetype||req.file.originalname.split('.').pop(),
        status:validRows?'READY':'PREVIEW',
        totalRows:staged.length,
        validRows,
        invalidRows,
        mapping,
        headers,
        summary:{sheetName,creates,updates}
      }
    });

    if(staged.length){
      await prisma.dataImportRow.createMany({
        data:staged.map(x=>({...x,jobId:job.id}))
      });
    }

    const preview=await prisma.dataImportRow.findMany({
      where:{jobId:job.id},
      orderBy:{rowNumber:'asc'},
      take:100
    });

    res.status(201).json({
      ok:true,
      requiresMapping:false,
      job,
      preview,
      diffSummary:{creates,updates,invalid:invalidRows}
    });
  }catch(e){next(e)}
});

router.get('/jobs/:id',requirePermission('data_hub.read'),async(req,res,next)=>{
  try{
    const job=await prisma.dataImportJob.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!job)return res.status(404).json({ok:false,message:'Importación no encontrada'});

    const rows=await prisma.dataImportRow.findMany({
      where:{jobId:job.id},
      orderBy:{rowNumber:'asc'},
      take:500
    });

    res.json({job,rows});
  }catch(e){next(e)}
});

router.post('/jobs/:id/commit',requirePermission('data_hub.import'),async(req,res,next)=>{
  try{
    const job=await prisma.dataImportJob.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });

    if(!job)return res.status(404).json({ok:false,message:'Importación no encontrada'});
    if(!['READY','PREVIEW'].includes(job.status)){
      return res.status(409).json({ok:false,message:'Esta importación ya fue procesada o no puede ejecutarse.'});
    }

    await prisma.dataImportJob.update({
      where:{id:job.id},
      data:{status:'IMPORTING',startedAt:new Date()}
    });

    const rows=await prisma.dataImportRow.findMany({
      where:{jobId:job.id,status:'VALID'},
      orderBy:{rowNumber:'asc'}
    });

    let imported=0,errors=0,created=0,updated=0;

    for(const row of rows){
      try{
        let target;

        if(row.action==='UPDATE'){
          if(!row.targetId)throw new Error('La fila marcada para actualizar no tiene registro objetivo.');
          target=await updateTarget(
            req.auth.companyId,
            job.entityType,
            row.targetId,
            row.normalizedData
          );
          updated++;
        }else{
          target=await createTarget(
            req.auth.companyId,
            job.entityType,
            row.normalizedData
          );
          created++;
        }

        imported++;
        await prisma.dataImportRow.update({
          where:{id:row.id},
          data:{status:'IMPORTED',targetId:target.id}
        });
      }catch(error){
        errors++;
        await prisma.dataImportRow.update({
          where:{id:row.id},
          data:{status:'ERROR',errors:[error.message||'Error al importar']}
        });
      }
    }

    const status=errors?'COMPLETED_WITH_ERRORS':'COMPLETED';
    const updatedJob=await prisma.dataImportJob.update({
      where:{id:job.id},
      data:{
        status,
        importedRows:imported,
        errorRows:errors,
        skippedRows:job.invalidRows,
        completedAt:new Date(),
        summary:{...(job.summary||{}),created,updated}
      }
    });

    emitIntegrationEventAsync({
      companyId:req.auth.companyId,
      event:'datahub.import.completed',
      entityType:'DataImportJob',
      entityId:updatedJob.id,
      payload:{
        jobId:updatedJob.id,
        entityType:updatedJob.entityType,
        mode:updatedJob.mode,
        importedRows:updatedJob.importedRows,
        errorRows:updatedJob.errorRows,
        status:updatedJob.status
      }
    });
    res.json({ok:true,job:updatedJob});
  }catch(e){next(e)}
});

router.post('/jobs/:id/rollback',requirePermission('data_hub.rollback'),async(req,res,next)=>{
  try{
    const job=await prisma.dataImportJob.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });

    if(!job)return res.status(404).json({ok:false,message:'Importación no encontrada'});
    if(!['COMPLETED','COMPLETED_WITH_ERRORS','ROLLBACK_PARTIAL'].includes(job.status)){
      return res.status(409).json({
        ok:false,
        message:'Solo se pueden revertir lotes completados.'
      });
    }

    await prisma.dataImportJob.update({
      where:{id:job.id},
      data:{status:'ROLLING_BACK'}
    });

    const rows=await prisma.dataImportRow.findMany({
      where:{
        jobId:job.id,
        status:{in:['IMPORTED','ROLLBACK_ERROR']}
      },
      orderBy:{rowNumber:'desc'}
    });

    let rolledBack=0,rollbackErrors=0;

    for(const row of rows){
      try{
        if(!row.targetId)throw new Error('No hay registro objetivo para revertir.');

        if(row.action==='UPDATE'){
          if(!row.beforeData)throw new Error('No existe snapshot anterior para restaurar.');
          await restoreTarget(
            req.auth.companyId,
            job.entityType,
            row.targetId,
            row.beforeData
          );
        }else{
          await deleteCreatedTarget(
            req.auth.companyId,
            job.entityType,
            row.targetId
          );
        }

        rolledBack++;
        await prisma.dataImportRow.update({
          where:{id:row.id},
          data:{status:'ROLLED_BACK',rollbackError:null}
        });
      }catch(error){
        rollbackErrors++;
        await prisma.dataImportRow.update({
          where:{id:row.id},
          data:{
            status:'ROLLBACK_ERROR',
            rollbackError:error.message||'No fue posible revertir la fila.'
          }
        });
      }
    }

    const finalStatus=rollbackErrors?'ROLLBACK_PARTIAL':'ROLLED_BACK';
    const updatedJob=await prisma.dataImportJob.update({
      where:{id:job.id},
      data:{
        status:finalStatus,
        rollbackAt:new Date(),
        summary:{...(job.summary||{}),rolledBack,rollbackErrors}
      }
    });

    res.json({
      ok:rollbackErrors===0,
      job:updatedJob,
      rollback:{rolledBack,errors:rollbackErrors}
    });
  }catch(e){next(e)}
});

router.post('/jobs/:id/cancel',requirePermission('data_hub.import'),async(req,res,next)=>{
  try{
    const job=await prisma.dataImportJob.findFirst({
      where:{id:req.params.id,companyId:req.auth.companyId}
    });
    if(!job)return res.status(404).json({ok:false,message:'Importación no encontrada'});

    if(['COMPLETED','COMPLETED_WITH_ERRORS','ROLLED_BACK'].includes(job.status)){
      return res.status(409).json({ok:false,message:'No se puede cancelar una importación ya terminada.'});
    }

    res.json({
      ok:true,
      job:await prisma.dataImportJob.update({
        where:{id:job.id},
        data:{status:'CANCELLED'}
      })
    });
  }catch(e){next(e)}
});

export default router;
