import crypto from 'node:crypto';

export function requestContext(req,res,next){
  const incoming=String(req.headers['x-request-id']||'').trim();
  const valid=/^[a-zA-Z0-9._:-]{8,120}$/.test(incoming);
  req.id=valid?incoming:crypto.randomUUID();
  res.setHeader('x-request-id',req.id);
  res.locals.requestStartedAt=Date.now();
  next();
}
