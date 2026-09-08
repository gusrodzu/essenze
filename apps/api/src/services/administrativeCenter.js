import {prisma} from '../lib/prisma.js';

const num=(value)=>Number(value??0);
const balance=(row)=>Math.max(0,num(row.total)-num(row.paidAmount));

function monthsBetween(start,end){
  const a=new Date(start),b=new Date(end);
  let months=(b.getUTCFullYear()-a.getUTCFullYear())*12+(b.getUTCMonth()-a.getUTCMonth());
  if(b.getUTCDate()<a.getUTCDate())months--;
  return Math.max(0,months);
}
function assetBookValue(asset){
  const cost=num(asset.acquisitionCost);
  const residual=num(asset.residualValue);
  const life=Number(asset.usefulLifeMonths||0);
  const depreciable=Math.max(0,cost-residual);
  const monthly=life>0?depreciable/life:0;
  const elapsed=Math.min(life,monthsBetween(asset.depreciationStartDate,new Date()));
  const accumulated=Math.min(depreciable,monthly*elapsed);
  return {cost,accumulated,bookValue:Math.max(residual,cost-accumulated)};
}

export async function getAdministrativeCenter(companyId){
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const year=now.getFullYear();

  const [
    company,
    payables,
    receivables,
    expenses,
    treasuryAccounts,
    treasuryMovements,
    budgets,
    assets
  ]=await Promise.all([
    prisma.company.findUnique({
      where:{id:companyId},
      select:{id:true,name:true,currency:true}
    }),
    prisma.accountsPayable.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{
        id:true,invoiceNumber:true,dueDate:true,total:true,paidAmount:true,status:true,
        supplier:{select:{legalName:true,commercialName:true}}
      },
      orderBy:{dueDate:'asc'},
      take:200
    }),
    prisma.accountsReceivable.findMany({
      where:{companyId,status:{not:'CANCELLED'}},
      select:{
        id:true,invoiceNumber:true,dueDate:true,total:true,paidAmount:true,status:true,
        customer:{select:{legalName:true,commercialName:true}}
      },
      orderBy:{dueDate:'asc'},
      take:200
    }),
    prisma.expense.findMany({
      where:{companyId,expenseDate:{gte:monthStart},status:{not:'CANCELLED'}},
      select:{id:true,folio:true,title:true,amount:true,status:true,expenseDate:true,reimbursable:true},
      orderBy:{expenseDate:'desc'},
      take:100
    }),
    prisma.treasuryAccount.findMany({
      where:{companyId,active:true},
      select:{id:true,code:true,name:true,type:true,currency:true,currentBalance:true},
      orderBy:{name:'asc'}
    }),
    prisma.treasuryMovement.findMany({
      where:{companyId,movementDate:{gte:monthStart}},
      select:{id:true,type:true,amount:true,movementDate:true,concept:true,accountId:true},
      orderBy:{movementDate:'desc'},
      take:100
    }),
    prisma.budget.findMany({
      where:{companyId,year},
      select:{id:true,name:true,status:true,totalAmount:true,year:true},
      orderBy:{name:'asc'}
    }),
    prisma.fixedAsset.findMany({
      where:{companyId,status:'ACTIVE'},
      select:{
        id:true,code:true,name:true,acquisitionCost:true,accumulatedDepreciation:true,
        residualValue:true,usefulLifeMonths:true,depreciationStartDate:true,status:true
      },
      orderBy:{name:'asc'},
      take:200
    })
  ]);

  if(!company)throw new Error('Empresa no encontrada');

  const openPayables=payables.filter(x=>balance(x)>0);
  const openReceivables=receivables.filter(x=>balance(x)>0);
  const overduePayables=openPayables.filter(x=>new Date(x.dueDate)<now);
  const overdueReceivables=openReceivables.filter(x=>new Date(x.dueDate)<now);

  const payableBalance=openPayables.reduce((sum,x)=>sum+balance(x),0);
  const receivableBalance=openReceivables.reduce((sum,x)=>sum+balance(x),0);
  const overduePayableBalance=overduePayables.reduce((sum,x)=>sum+balance(x),0);
  const overdueReceivableBalance=overdueReceivables.reduce((sum,x)=>sum+balance(x),0);
  const expensesMonth=expenses.reduce((sum,x)=>sum+num(x.amount),0);
  const treasuryBalance=treasuryAccounts.reduce((sum,x)=>sum+num(x.currentBalance),0);
  const budgetTotal=budgets.reduce((sum,x)=>sum+num(x.totalAmount),0);
  const assetValues=assets.map(assetBookValue);
  const assetGross=assetValues.reduce((sum,x)=>sum+x.cost,0);
  const assetDepreciation=assetValues.reduce((sum,x)=>sum+x.accumulated,0);
  const assetNet=assetValues.reduce((sum,x)=>sum+x.bookValue,0);

  const treasuryIncome=treasuryMovements
    .filter(x=>x.type==='INCOME')
    .reduce((sum,x)=>sum+num(x.amount),0);
  const treasuryOut=treasuryMovements
    .filter(x=>x.type==='EXPENSE')
    .reduce((sum,x)=>sum+num(x.amount),0);

  const attention=[
    ...(overduePayables.length?[{
      key:'OVERDUE_AP',
      level:'HIGH',
      title:`${overduePayables.length} cuenta(s) por pagar vencida(s)`,
      detail:`Saldo vencido por ${overduePayableBalance.toFixed(2)}`,
      to:'/finanzas/cuentas-por-pagar'
    }]:[]),
    ...(overdueReceivables.length?[{
      key:'OVERDUE_AR',
      level:'HIGH',
      title:`${overdueReceivables.length} cuenta(s) por cobrar vencida(s)`,
      detail:`Cartera vencida por ${overdueReceivableBalance.toFixed(2)}`,
      to:'/finanzas/cuentas-por-cobrar'
    }]:[]),
    ...(expenses.filter(x=>x.status==='SUBMITTED').length?[{
      key:'EXPENSES',
      level:'MEDIUM',
      title:'Gastos pendientes de revisión',
      detail:`${expenses.filter(x=>x.status==='SUBMITTED').length} gasto(s) enviados`,
      to:'/gastos'
    }]:[]),
    ...(treasuryBalance<0?[{
      key:'TREASURY_NEGATIVE',
      level:'HIGH',
      title:'Tesorería con saldo negativo',
      detail:'Revisa cuentas y movimientos de caja/bancos.',
      to:'/finanzas/tesoreria'
    }]:[])
  ].slice(0,6);

  return {
    ok:true,
    generatedAt:now.toISOString(),
    company,
    summary:{
      payableBalance,
      receivableBalance,
      overduePayableBalance,
      overdueReceivableBalance,
      expensesMonth,
      treasuryBalance,
      budgetTotal,
      assetNet,
      treasuryIncome,
      treasuryOut
    },
    counts:{
      payables:openPayables.length,
      receivables:openReceivables.length,
      overduePayables:overduePayables.length,
      overdueReceivables:overdueReceivables.length,
      expenses:expenses.length,
      treasuryAccounts:treasuryAccounts.length,
      budgets:budgets.length,
      assets:assets.length
    },
    attention,
    recent:{
      expenses:expenses.slice(0,6),
      payables:openPayables.slice(0,6),
      receivables:openReceivables.slice(0,6),
      treasury:treasuryMovements.slice(0,6)
    }
  };
}
