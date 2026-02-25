import { Router, Request, Response, NextFunction } from 'express';
import { handleWebhook, getFormData } from '../controllers/telegram.controller.js';

const router = Router();

router.post('/webhook', (req: Request, res: Response, next: NextFunction) => {
    handleWebhook(req, res).catch(next);
});

router.get('/form-data', (req: Request, res: Response, next: NextFunction) => {
    getFormData(req, res).catch(next);
});

export default router; 