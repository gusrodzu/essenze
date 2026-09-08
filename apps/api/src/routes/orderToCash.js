import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {requirePermission} from '../middleware/permissions.js';
import {getOrderToCashDashboard} from '../services/orderToCash.js';

const router=Router();
router.use(requireAuth);

router.get('/dashboard',requirePermission('sales.read'),async(req,res,next)=>{
  try{
    res.json(await getOrderToCashDashboard(req.auth.companyId));
  }catch(error){
    next(error);
  }
});

export default router;
