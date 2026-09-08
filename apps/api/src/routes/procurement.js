import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {procurementDashboard} from '../services/procurementFlow.js';

const router=Router();
router.use(requireAuth);

router.get('/dashboard',requirePermission('purchases.read'),async(req,res,next)=>{
  try{
    res.json(await procurementDashboard(req.auth.companyId));
  }catch(error){next(error)}
});

export default router;
