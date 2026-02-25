import { Router } from 'express';
import { handleWebhook, getFormData } from '../controllers/telegram.controller.js';
const router = Router();
router.post('/webhook', (req, res, next) => {
    handleWebhook(req, res).catch(next);
});
router.get('/form-data', (req, res, next) => {
    getFormData(req, res).catch(next);
});
export default router;
