const { Router } = require('express');
const controller = require('./notification.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/read-all', controller.markAllRead);
router.post('/:id/read', controller.markRead);
router.post('/device-token', controller.registerToken);
router.delete('/device-token', controller.removeToken);

module.exports = router;
