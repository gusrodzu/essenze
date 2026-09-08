import {prisma} from '../lib/prisma.js';
import {emitIntegrationEventAsync} from './integrationEvents.js';

function applicableRules(workflow,amount){
  return workflow.rules.filter(rule=>{
    if(amount==null)return true;
    if(rule.minAmount!=null&&amount<Number(rule.minAmount))return false;
    if(rule.maxAmount!=null&&amount>Number(rule.maxAmount))return false;
    return true;
  });
}

export async function createApprovalForEntity({
  companyId,userId,entityType,entityId,entityFolio,title,description,
  amount=null,currency='MXN',metadata={}
}){
  const workflow=await prisma.approvalWorkflow.findFirst({
    where:{companyId,entityType,active:true},
    orderBy:[{priority:'asc'},{createdAt:'asc'}],
    include:{rules:{orderBy:{sequence:'asc'}}}
  });

  if(!workflow)return null;

  const existing=await prisma.approvalRequest.findFirst({
    where:{companyId,entityType,entityId,status:{in:['PENDING','APPROVED']}},
    orderBy:{requestedAt:'desc'},
    include:{workflow:true,steps:{orderBy:{sequence:'asc'}}}
  });
  if(existing)return existing;

  const rules=applicableRules(workflow,amount);
  if(!rules.length)return null;

  const request=await prisma.approvalRequest.create({
    data:{
      companyId,
      workflowId:workflow.id,
      entityType,
      entityId,
      entityFolio:entityFolio||null,
      title,
      description:description||null,
      requestedById:userId,
      status:'PENDING',
      currentStep:1,
      amount,
      currency,
      metadata,
      steps:{
        create:rules.map((rule,index)=>({
          ruleId:rule.id,
          sequence:index+1,
          name:rule.name,
          approverUserId:rule.approverUserId,
          roleId:rule.roleId,
          permissionKey:rule.permissionKey,
          status:index===0?'PENDING':'WAITING'
        }))
      }
    },
    include:{workflow:true,steps:{orderBy:{sequence:'asc'}}}
  });

  emitIntegrationEventAsync({
    companyId,
    event:'approval.required',
    entityType:'ApprovalRequest',
    entityId:request.id,
    payload:{approvalRequest:request,source:{entityType,entityId,folio:entityFolio||null}}
  });

  return request;
}

export async function applyApprovalDecisionToEntity({
  companyId,userId,approvalRequest
}){
  if(!approvalRequest||!['APPROVED','REJECTED'].includes(approvalRequest.status))return null;

  if(approvalRequest.entityType==='PURCHASE_REQUEST'){
    const entity=await prisma.purchaseRequest.findFirst({
      where:{id:approvalRequest.entityId,companyId}
    });
    if(!entity)return null;

    const nextStatus=approvalRequest.status==='APPROVED'?'APPROVED':'REJECTED';
    if(entity.status!=='PENDING'&&entity.status!==nextStatus)return null;

    const updated=await prisma.purchaseRequest.update({
      where:{id:entity.id},
      data:{
        status:nextStatus,
        resolvedAt:new Date(),
        resolvedById:userId,
        resolutionNote:approvalRequest.status==='APPROVED'
          ?'Aprobada mediante BuzzBee Aprobaciones.'
          :'Rechazada mediante BuzzBee Aprobaciones.'
      }
    });

    await prisma.auditLog.create({
      data:{
        userId,
        action:nextStatus,
        entity:'PurchaseRequest',
        entityId:updated.id,
        description:`${updated.folio} ${nextStatus==='APPROVED'?'aprobada':'rechazada'} por workflow`,
      }
    });

    emitIntegrationEventAsync({
      companyId,
      event:nextStatus==='APPROVED'?'purchase.request.approved':'purchase.request.rejected',
      entityType:'PurchaseRequest',
      entityId:updated.id,
      payload:{purchaseRequest:updated,approvalRequestId:approvalRequest.id}
    });

    return updated;
  }

  if(approvalRequest.entityType==='PURCHASE_ORDER'){
    emitIntegrationEventAsync({
      companyId,
      event:approvalRequest.status==='APPROVED'
        ?'purchase.order.approved'
        :'purchase.order.rejected',
      entityType:'PurchaseOrder',
      entityId:approvalRequest.entityId,
      payload:{approvalRequestId:approvalRequest.id}
    });
  }

  return null;
}

export async function procurementDashboard(companyId){
  const [
    requests,orders,receipts,payables,balances
  ]=await Promise.all([
    prisma.purchaseRequest.findMany({
      where:{companyId},
      orderBy:{createdAt:'desc'},
      take:80,
      include:{
        warehouse:true,
        requestedBy:{select:{firstName:true,lastName:true}},
        items:true,
        purchaseOrder:{select:{id:true,folio:true,status:true}}
      }
    }),
    prisma.purchaseOrder.findMany({
      where:{companyId},
      orderBy:{createdAt:'desc'},
      take:80,
      include:{
        supplier:{select:{id:true,code:true,legalName:true,commercialName:true}},
        warehouse:true,
        purchaseRequest:{select:{id:true,folio:true,title:true}},
        items:true,
        receipts:{select:{id:true,folio:true,receivedAt:true}}
      }
    }),
    prisma.goodsReceipt.findMany({
      where:{companyId},
      orderBy:{receivedAt:'desc'},
      take:80,
      include:{
        purchaseOrder:{select:{id:true,folio:true,total:true,currency:true,supplierId:true}},
        items:true
      }
    }),
    prisma.accountsPayable.findMany({
      where:{companyId},
      orderBy:{createdAt:'desc'},
      take:80,
      include:{
        supplier:{select:{legalName:true,commercialName:true}},
        purchaseOrder:{select:{id:true,folio:true}}
      }
    }),
    prisma.inventoryBalance.findMany({
      where:{warehouse:{branch:{companyId}}},
      include:{product:{select:{minStock:true}}}
    })
  ]);

  const pendingRequests=requests.filter(x=>x.status==='PENDING').length;
  const approvedRequests=requests.filter(x=>x.status==='APPROVED').length;
  const draftOrders=orders.filter(x=>x.status==='DRAFT').length;
  const issuedOrders=orders.filter(x=>['ISSUED','PARTIALLY_RECEIVED'].includes(x.status)).length;
  const completedOrders=orders.filter(x=>x.status==='RECEIVED').length;
  const openPayables=payables.filter(x=>!['PAID','CANCELLED'].includes(x.status));
  const openPayableBalance=openPayables.reduce(
    (sum,x)=>sum+Math.max(0,Number(x.total)-Number(x.paidAmount)),0
  );
  const lowStock=balances.filter(x=>Number(x.quantity)<=Number(x.product.minStock)).length;

  const recent=[
    ...requests.slice(0,15).map(x=>({
      at:x.createdAt,
      type:'REQUEST',
      folio:x.folio,
      title:x.title,
      status:x.status,
      amount:x.items.reduce((s,i)=>s+Number(i.quantity)*Number(i.estimatedUnitCost),0)
    })),
    ...orders.slice(0,15).map(x=>({
      at:x.createdAt,
      type:'ORDER',
      folio:x.folio,
      title:x.supplier.commercialName||x.supplier.legalName,
      status:x.status,
      amount:Number(x.total),
      currency:x.currency
    })),
    ...receipts.slice(0,15).map(x=>({
      at:x.receivedAt,
      type:'RECEIPT',
      folio:x.folio,
      title:x.purchaseOrder.folio,
      status:'POSTED',
      amount:x.items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unitCost),0)
    })),
    ...payables.slice(0,15).map(x=>({
      at:x.createdAt,
      type:'PAYABLE',
      folio:x.invoiceNumber,
      title:x.supplier.commercialName||x.supplier.legalName,
      status:x.status,
      amount:Number(x.total)-Number(x.paidAmount),
      currency:x.currency
    }))
  ].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,20);

  return {
    ok:true,
    summary:{
      pendingRequests,
      approvedRequests,
      draftOrders,
      issuedOrders,
      completedOrders,
      receipts:receipts.length,
      openPayables:openPayables.length,
      openPayableBalance,
      lowStock
    },
    pipeline:{
      requests:{
        draft:requests.filter(x=>x.status==='DRAFT').length,
        pending:pendingRequests,
        approved:approvedRequests,
        rejected:requests.filter(x=>x.status==='REJECTED').length,
        ordered:requests.filter(x=>x.status==='ORDERED').length
      },
      orders:{
        draft:draftOrders,
        issued:orders.filter(x=>x.status==='ISSUED').length,
        partial:orders.filter(x=>x.status==='PARTIALLY_RECEIVED').length,
        received:completedOrders
      }
    },
    recent
  };
}
