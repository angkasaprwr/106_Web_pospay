const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created } = require('../../core/ApiResponse');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const chatbot = require('./chatbot.service');
const admin = require('./chatbot.admin.service');
const workingHours = require('./workingHours.service');
const gemini = require('../../services/gemini.service');

const router = Router();

const messageSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1, 'Pesan tidak boleh kosong'),
});

const qaSchema = z.object({
  question: z.string().min(3),
  answer: z.string().min(1),
  keywords: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const docSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(1),
  source: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const workingHoursSchema = z.object({
  hours: z.array(
    z.object({
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      isOpen: z.boolean(),
      openTime: z.string().regex(/^\d{2}:\d{2}$/),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  ),
});

// ---- Chat (available to any authenticated user) ----
router.post('/message', authenticate, validate({ body: messageSchema }), asyncHandler(async (req, res) => {
  const result = await chatbot.handleMessage({ sessionId: req.body.sessionId, message: req.body.message, user: req.user });
  return ok(res, result, 'Balasan chatbot');
}));

router.get('/sessions/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const messages = await chatbot.getSessionMessages(req.params.id);
  return ok(res, messages);
}));

router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const open = await workingHours.isWithinWorkingHours();
  const summary = await workingHours.getSummary();
  return ok(res, { workingHoursOpen: open, aiEnabled: gemini.isEnabled(), workingHours: summary });
}));

// ---- Treasurer-only management ----
router.use(authenticate, authorize('BENDAHARA'));

// Live chat sessions / human handover
router.get('/sessions', asyncHandler(async (req, res) => ok(res, await chatbot.listSessions(req.query), 'Daftar percakapan')));
router.get('/sessions/:id', asyncHandler(async (req, res) => ok(res, await chatbot.getSessionDetail(req.params.id), 'Detail percakapan')));
router.post('/sessions/:id/reply', asyncHandler(async (req, res) => ok(res, await chatbot.agentReply({ sessionId: req.params.id, message: req.body.message, agent: req.user }), 'Balasan terkirim')));
router.post('/sessions/:id/close', asyncHandler(async (req, res) => ok(res, await chatbot.closeSession(req.params.id), 'Sesi ditutup')));

// Q&A management
router.get('/qa', asyncHandler(async (req, res) => ok(res, await admin.qa.list(req.query))));
router.post('/qa', validate({ body: qaSchema }), asyncHandler(async (req, res) => created(res, await admin.qa.create(req.body, req.user.id, req))));
router.patch('/qa/:id', validate({ body: qaSchema.partial() }), asyncHandler(async (req, res) => ok(res, await admin.qa.update(req.params.id, req.body, req.user.id, req))));
router.delete('/qa/:id', asyncHandler(async (req, res) => { await admin.qa.remove(req.params.id, req.user.id, req); return ok(res, null, 'Dihapus'); }));

// Document (RAG) management
router.get('/documents', asyncHandler(async (req, res) => ok(res, await admin.docs.list())));
router.post('/documents', validate({ body: docSchema }), asyncHandler(async (req, res) => created(res, await admin.docs.create(req.body, req.user.id, req))));
router.patch('/documents/:id', validate({ body: docSchema.partial() }), asyncHandler(async (req, res) => ok(res, await admin.docs.update(req.params.id, req.body, req.user.id, req))));
router.delete('/documents/:id', asyncHandler(async (req, res) => { await admin.docs.remove(req.params.id, req.user.id, req); return ok(res, null, 'Dihapus'); }));

// Working hours
router.get('/working-hours', asyncHandler(async (req, res) => ok(res, await workingHours.list())));
router.put('/working-hours', validate({ body: workingHoursSchema }), asyncHandler(async (req, res) => ok(res, await workingHours.upsertMany(req.body.hours), 'Jam kerja diperbarui')));

module.exports = router;
