import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import authRouter from './routes/auth.js';
import companyRouter from './routes/company.js';
import adminRouter from './routes/admin.js';
import warehousesRouter from './routes/warehouses.js';
import suppliersRouter from './routes/suppliers.js';
import productsRouter from './routes/products.js';
import purchaseRequestsRouter from './routes/purchaseRequests.js';
import procurementRouter from './routes/procurement.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import receiptsRouter from './routes/receipts.js';
import inventoryRouter from './routes/inventory.js';
import inventoryOperationsRouter from './routes/inventoryOperations.js';
import accountsPayableRouter from './routes/accountsPayable.js';
import customersRouter from './routes/customers.js';
import accountsReceivableRouter from './routes/accountsReceivable.js';
import humanResourcesRouter from './routes/humanResources.js';
import hrOperationsRouter from './routes/hrOperations.js';
import employeeDocumentsRouter from './routes/employeeDocuments.js';
import payrollRouter from './routes/payroll.js';
import reportsRouter from './routes/reports.js';
import activityRouter from './routes/activity.js';
import treasuryRouter from './routes/treasury.js';
import budgetsRouter from './routes/budgets.js';
import salesRouter from './routes/sales.js';
import salesEnterpriseRouter from './routes/salesEnterprise.js';
import salesFulfillmentRouter from './routes/salesFulfillment.js';
import salesReturnsRouter from './routes/salesReturns.js';
import collectionsRouter from './routes/collections.js';
import bankReconciliationRouter from './routes/bankReconciliation.js';
import cashFlowRouter from './routes/cashFlow.js';
import accountingRouter from './routes/accounting.js';
import dashboardRouter from './routes/dashboard.js';
import projectsRouter from './routes/projects.js';
import marketingRouter from './routes/marketing.js';
import fiscalRouter from './routes/fiscal.js';
import productionRouter from './routes/production.js';
import posRouter from './routes/pos.js';
import modulesRouter from './routes/modules.js';
import billingRouter from './routes/billing.js';
import approvalsRouter from './routes/approvals.js';
import expensesRouter from './routes/expenses.js';
import fixedAssetsRouter from './routes/fixedAssets.js';
import masterDataRouter from './routes/masterData.js';
import dataHubRouter from './routes/dataHub.js';
import integrationsRouter from './routes/integrations.js';
import publicApiRouter from './routes/publicApi.js';
import flowRouter from './routes/flow.js';
import intelligenceRouter from './routes/intelligence.js';
import businessPartiesRouter from './routes/businessParties.js';
import aiRouter from './routes/ai.js';
import {startIntegrationWorker,stopIntegrationWorker} from './services/integrationWorker.js';
import {startIntelligenceWorker,stopIntelligenceWorker} from './services/intelligenceWorker.js';
import {startHousekeepingWorker,stopHousekeepingWorker} from './services/housekeepingWorker.js';
import {startAgendaReminderWorker,stopAgendaReminderWorker} from './services/agendaReminderWorker.js';
import {prisma} from './lib/prisma.js';
import {requestContext} from './middleware/requestContext.js';
import {operationalTelemetry} from './middleware/operationalTelemetry.js';
import {mutationAudit} from './middleware/mutationAudit.js';
import hrClientRouter from './routes/hrClient.js';
import administrativeCenterRouter from './routes/administrativeCenter.js';
import orderToCashRouter from './routes/orderToCash.js';
import operationsRouter from './routes/operations.js';
import agendaRouter from './routes/agenda.js';

const requiredEnvironment = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);

if (missingEnvironment.length > 0) {
  console.error(`Variables faltantes: ${missingEnvironment.join(', ')}`);
  process.exit(1);
}

import {APP_VERSION} from './lib/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, '../uploads');

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.use(requestContext);
app.use(helmet());
app.use(cors({origin: clientUrl, credentials: true}));
app.use(express.json({limit: '1mb'}));
app.use(pinoHttp());
app.use(operationalTelemetry);
app.use('/uploads', express.static(uploadsDirectory, {fallthrough: false, maxAge: '1h'}));

app.get('/api/health', (_request, response) => {
  response.json({ok: true, service: 'ERP Cliente API', version: APP_VERSION, timestamp: new Date().toISOString()});
});

app.get('/api/ready', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ok:true,database:'reachable',version:APP_VERSION,timestamp:new Date().toISOString()});
  } catch (error) {
    response.status(503).json({
      ok:false,
      database:'unreachable',
      code:error?.code??null,
      message:'La API está activa, pero PostgreSQL no está disponible.',
      timestamp:new Date().toISOString()
    });
  }
});

app.use(mutationAudit);

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/company', companyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/products', productsRouter);
app.use('/api/purchase-requests', purchaseRequestsRouter);
app.use('/api/procurement', procurementRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/inventory-operations', inventoryOperationsRouter);
app.use('/api/accounts-payable', accountsPayableRouter);
app.use('/api/customers', customersRouter);
app.use('/api/accounts-receivable', accountsReceivableRouter);
app.use('/api/human-resources', humanResourcesRouter);
app.use('/api/hr-operations', hrOperationsRouter);
app.use('/api/employee-documents', employeeDocumentsRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/treasury', treasuryRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/sales-enterprise', salesEnterpriseRouter);
app.use('/api/sales-fulfillment', salesFulfillmentRouter);
app.use('/api/sales-returns', salesReturnsRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/bank-reconciliation', bankReconciliationRouter);
app.use('/api/cash-flow', cashFlowRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/fiscal', fiscalRouter);
app.use('/api/production', productionRouter);
app.use('/api/pos', posRouter);
app.use('/api/modules', modulesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/fixed-assets', fixedAssetsRouter);
app.use('/api/master-data', masterDataRouter);
app.use('/api/data-hub', dataHubRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/public/v1', publicApiRouter);
app.use('/api/flow', flowRouter);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api/business-parties', businessPartiesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/administration', administrativeCenterRouter);
app.use('/api/order-to-cash', orderToCashRouter);
app.use('/api/operations', operationsRouter);

app.use((error, request, response, _next) => {
  request.log?.error(error);
  const statusCode=Number(error?.statusCode)||500;
  const expose=Boolean(error?.expose)&&statusCode<500;
  response.status(statusCode).json({
    ok:false,
    code:expose?(error.code||'OPERATION_CONFLICT'):'INTERNAL_ERROR',
    message:expose?error.message:'Error interno del servidor',
    requestId:request.id||null
  });
});

startIntegrationWorker();
startIntelligenceWorker();
startHousekeepingWorker();
startAgendaReminderWorker();

const server=app.listen(port, () => {
  console.log(`ERP API v${APP_VERSION} disponible en http://localhost:${port}/api`);
});

let shuttingDown=false;
async function shutdown(signal){
  if(shuttingDown)return;
  shuttingDown=true;
  console.log(`[Shutdown] ${signal} recibido. Cerrando workers y conexiones…`);
  stopIntegrationWorker();
  stopIntelligenceWorker();
  stopHousekeepingWorker();
  stopAgendaReminderWorker();
  server.close(async()=>{
    try{await prisma.$disconnect();}catch{}
    process.exit(0);
  });
  setTimeout(()=>{
    console.error('[Shutdown] cierre forzado por timeout.');
    process.exit(1);
  },10_000).unref?.();
}
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('SIGTERM',()=>shutdown('SIGTERM'));

