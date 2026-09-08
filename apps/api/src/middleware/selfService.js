export function requireAuthenticatedSelfService(req,res,next){
  if(!req.auth?.sub||!req.auth?.companyId){
    return res.status(401).json({ok:false,message:'Autenticación requerida'});
  }
  next();
}
