import {Router} from 'express';
import {prisma} from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
const router=Router(); router.use(requireAuth);
const norm=v=>String(v||'').trim().toLowerCase();
const validEmail=v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
async function scan(companyId){
 const [customers,suppliers,products,employees]=await Promise.all([
  prisma.customer.findMany({where:{companyId}}),prisma.supplier.findMany({where:{companyId}}),
  prisma.product.findMany({where:{companyId}}),prisma.employee.findMany({where:{companyId}})
 ]);
 const issues=[]; const push=(entityType,entityId,issueType,field,message,fingerprint,metadata={})=>issues.push({companyId,entityType,entityId,issueType,field,message,fingerprint,metadata});
 const dup=(rows,type,field,get)=>{const map=new Map();for(const row of rows){const key=norm(get(row));if(!key)continue;if(!map.has(key))map.set(key,[]);map.get(key).push(row)}for(const [key,list] of map)if(list.length>1)for(const row of list)push(type,row.id,'DUPLICATE',field,`Posible duplicado por ${field}: ${get(row)}`,`${type}:${field}:${key}`,{matches:list.map(x=>x.id)})};
 dup(customers,'CUSTOMER','taxId',x=>x.taxId);dup(customers,'CUSTOMER','email',x=>x.email);dup(suppliers,'SUPPLIER','taxId',x=>x.taxId);dup(suppliers,'SUPPLIER','email',x=>x.email);dup(products,'PRODUCT','name',x=>x.name);dup(employees,'EMPLOYEE','email',x=>x.email);
 for(const x of customers){if(!validEmail(x.email))push('CUSTOMER',x.id,'INVALID_FORMAT','email',`Correo inválido: ${x.email}`,`CUSTOMER:email:${x.id}`);if(!x.taxId||!x.email||!x.phone)push('CUSTOMER',x.id,'INCOMPLETE',null,'Ficha de cliente incompleta',`CUSTOMER:incomplete:${x.id}`)}
 for(const x of suppliers){if(!validEmail(x.email))push('SUPPLIER',x.id,'INVALID_FORMAT','email',`Correo inválido: ${x.email}`,`SUPPLIER:email:${x.id}`);if(!x.taxId||!x.email||!x.phone)push('SUPPLIER',x.id,'INCOMPLETE',null,'Ficha de proveedor incompleta',`SUPPLIER:incomplete:${x.id}`)}
 for(const x of products)if(!x.description||!x.categoryId)push('PRODUCT',x.id,'INCOMPLETE',null,'Ficha de producto incompleta',`PRODUCT:incomplete:${x.id}`);
 for(const x of employees){if(!validEmail(x.email))push('EMPLOYEE',x.id,'INVALID_FORMAT','email',`Correo inválido: ${x.email}`,`EMPLOYEE:email:${x.id}`);if(!x.email||!x.phone||!x.departmentId)push('EMPLOYEE',x.id,'INCOMPLETE',null,'Ficha de empleado incompleta',`EMPLOYEE:incomplete:${x.id}`)}
 await prisma.$transaction(async tx=>{await tx.dataQualityIssue.deleteMany({where:{companyId,status:'OPEN'}});if(issues.length)await tx.dataQualityIssue.createMany({data:issues})});
 return {issues,counts:{customers:customers.length,suppliers:suppliers.length,products:products.length,employees:employees.length}};
}
router.get('/dashboard',requirePermission('master_data.read'),async(req,res,next)=>{try{
 const companyId=req.auth.companyId;
 const [customers,suppliers,products,employees,contacts,addresses,catalogs,issues]=await Promise.all([
  prisma.customer.count({where:{companyId,active:true}}),prisma.supplier.count({where:{companyId,active:true}}),prisma.product.count({where:{companyId,active:true}}),prisma.employee.count({where:{companyId,status:'ACTIVE'}}),
  prisma.masterDataContact.count({where:{companyId,active:true}}),prisma.masterDataAddress.count({where:{companyId,active:true}}),
  prisma.masterDataCatalog.findMany({where:{companyId,active:true},include:{values:{where:{active:true},orderBy:{sortOrder:'asc'}}},orderBy:{name:'asc'}}),
  prisma.dataQualityIssue.findMany({where:{companyId,status:'OPEN'},orderBy:{detectedAt:'desc'},take:100})
 ]);
 const total=customers+suppliers+products+employees,quality=Math.max(0,Math.round(100-(issues.length/Math.max(1,total))*100));
 res.json({summary:{customers,suppliers,products,employees,total,contacts,addresses,openIssues:issues.length,quality},catalogs,issues});
}catch(e){next(e)}});
router.post('/quality/scan',requirePermission('master_data.manage'),async(req,res,next)=>{try{res.json({ok:true,...await scan(req.auth.companyId)})}catch(e){next(e)}});
router.post('/quality/:id/resolve',requirePermission('master_data.manage'),async(req,res,next)=>{try{const issue=await prisma.dataQualityIssue.findFirst({where:{id:req.params.id,companyId:req.auth.companyId}});if(!issue)return res.status(404).json({ok:false,message:'Incidencia no encontrada'});res.json({ok:true,issue:await prisma.dataQualityIssue.update({where:{id:issue.id},data:{status:'RESOLVED',resolvedAt:new Date()}})})}catch(e){next(e)}});
router.get('/entities',requirePermission('master_data.read'),async(req,res,next)=>{try{const companyId=req.auth.companyId;const [customers,suppliers,products,employees]=await Promise.all([prisma.customer.findMany({where:{companyId},orderBy:{legalName:'asc'},take:200}),prisma.supplier.findMany({where:{companyId},orderBy:{legalName:'asc'},take:200}),prisma.product.findMany({where:{companyId},orderBy:{name:'asc'},include:{category:true},take:200}),prisma.employee.findMany({where:{companyId},orderBy:[{lastName:'asc'},{firstName:'asc'}],include:{department:true,position:true},take:200})]);res.json({customers,suppliers,products,employees})}catch(e){next(e)}});
export default router;
