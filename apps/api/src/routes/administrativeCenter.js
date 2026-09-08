import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {getAdministrativeCenter} from '../services/administrativeCenter.js';

const router=Router();

router.use(requireAuth);

router.get('/dashboard',requirePermission('reports.read'),async(req,res,next)=>{
  try{
    res.json(await getAdministrativeCenter(req.auth.companyId));
  }catch(error){
    next(error);
  }
});

export default router;
