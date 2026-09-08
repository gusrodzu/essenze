export function operationalTelemetry(req,res,next){
  const started=process.hrtime.bigint();

  res.on('finish',()=>{
    const durationMs=Number(process.hrtime.bigint()-started)/1e6;
    req.log?.info({
      event:'request.completed',
      requestId:req.id||null,
      companyId:req.auth?.companyId||null,
      userId:req.auth?.sub||null,
      method:req.method,
      path:req.originalUrl.split('?')[0],
      statusCode:res.statusCode,
      durationMs:Number(durationMs.toFixed(2)),
      idempotencyStatus:res.getHeader('x-idempotency-status')||null
    },'request.completed');
  });

  next();
}
