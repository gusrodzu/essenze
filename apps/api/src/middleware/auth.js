import jwt from 'jsonwebtoken';
import {prisma} from '../lib/prisma.js';

export async function requireAuth(request, response, next) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({ok:false,message:'Sesión requerida',requestId:request.id||null});
  }

  const token = authorization.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.sub || !payload?.companyId) {
      return response.status(401).json({ok:false,message:'Token incompleto',requestId:request.id||null});
    }

    const user = await prisma.user.findFirst({
      where:{
        id:payload.sub,
        companyId:payload.companyId,
        active:true,
        company:{active:true},
      },
      select:{id:true,companyId:true,active:true},
    });

    if (!user) {
      return response.status(401).json({
        ok:false,
        message:'Sesión inválida para esta empresa',
        requestId:request.id||null,
      });
    }

    request.auth = payload;
    return next();
  } catch {
    return response.status(401).json({
      ok:false,
      message:'Sesión inválida o expirada',
      requestId:request.id||null,
    });
  }
}
