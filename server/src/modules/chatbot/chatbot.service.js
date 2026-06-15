const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const gemini = require('../../services/gemini.service');
const knowledge = require('./knowledge.service');
const workingHours = require('./workingHours.service');
const { toolDeclarations, executeTool } = require('./chatbot.tools');
const { logger } = require('../../utils/logger');

const HANDOVER_KEYWORDS = ['admin', 'operator', 'bendahara', 'manusia', 'petugas', 'cs ', 'customer service', 'orang asli', 'live agent', 'hubungi'];

function wantsHuman(message) {
  const m = message.toLowerCase();
  return HANDOVER_KEYWORDS.some((k) => m.includes(k));
}

async function getOrCreateSession(sessionId, user) {
  if (sessionId) {
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (session) return session;
  }
  return prisma.chatSession.create({
    data: { userId: user?.id || null, status: 'BOT' },
  });
}

async function buildSystemInstruction(context) {
  const profile = await prisma.schoolProfile.findFirst();
  const schoolName = profile?.name || 'SMP Pusponegoro Brebes';
  const { qas, docs } = await knowledge.retrieve(context.lastMessage, {});

  let kb = '';
  if (qas.length) {
    kb += '\n\nPERTANYAAN UMUM (FAQ) YANG RELEVAN:\n';
    qas.forEach((qa, i) => {
      kb += `${i + 1}. T: ${qa.question}\n   J: ${qa.answer}\n`;
    });
  }
  if (docs.length) {
    kb += '\n\nDOKUMEN SEKOLAH YANG RELEVAN:\n';
    docs.forEach((doc) => {
      kb += `### ${doc.title}\n${doc.content}\n`;
    });
  }

  return `Anda adalah "Asisten Keuangan ${schoolName}", chatbot ramah yang membantu siswa dan orang tua mengenai keuangan sekolah (tagihan, SPP, pembayaran, dispensasi).

Aturan:
- Jawab dalam Bahasa Indonesia yang sopan, singkat, dan jelas.
- Gunakan fungsi (tools) yang tersedia untuk mengambil data tagihan, tunggakan, metode pembayaran, atau info sekolah ketika relevan. Jangan mengarang angka atau nominal.
- Jika informasi tidak ada di basis pengetahuan maupun hasil fungsi, katakan dengan jujur dan sarankan menghubungi bendahara saat jam kerja.
- Jangan memberikan saran di luar konteks keuangan sekolah.
- Format nominal dalam Rupiah.
${kb}`;
}

function toGeminiHistory(messages) {
  return messages
    .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
    .map((m) => ({ role: m.role === 'USER' ? 'user' : 'model', parts: [{ text: m.content }] }));
}

async function handleMessage({ sessionId, message, user }) {
  if (!message || !message.trim()) throw ApiError.badRequest('Pesan tidak boleh kosong');
  const session = await getOrCreateSession(sessionId, user);

  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: message, senderId: user?.id || null },
  });

  // Human handover flow.
  if (wantsHuman(message) || session.status === 'WAITING_HUMAN' || session.status === 'HUMAN') {
    const open = await workingHours.isWithinWorkingHours();
    if (open) {
      await prisma.chatSession.update({ where: { id: session.id }, data: { status: 'WAITING_HUMAN' } });
      const reply =
        'Baik, saya akan menghubungkan Anda dengan bendahara. Mohon tunggu sebentar, petugas kami sedang dalam jam kerja dan akan segera membalas. Anda juga dapat tetap menuliskan pertanyaan Anda di sini.';
      const saved = await saveAssistant(session.id, reply, { handover: true });
      return { sessionId: session.id, status: 'WAITING_HUMAN', message: saved };
    }
    const hours = await workingHours.list();
    const reply =
      'Saat ini di luar jam kerja, sehingga bendahara belum dapat dihubungi secara langsung. Silakan tinggalkan pesan Anda, atau saya dapat membantu menjawab pertanyaan umum seputar tagihan dan pembayaran. Jam kerja layanan: Senin–Jumat.';
    const saved = await saveAssistant(session.id, reply, { handover: true, outsideHours: true, hours });
    return { sessionId: session.id, status: session.status, message: saved };
  }

  const context = { studentId: user?.studentId || null, userId: user?.id || null, lastMessage: message };

  // Use Gemini when configured, otherwise fall back to FAQ matching.
  if (gemini.isEnabled()) {
    try {
      const history = await prisma.chatMessage.findMany({
        where: { sessionId: session.id, role: { in: ['USER', 'ASSISTANT'] } },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      // Exclude the just-saved user message from history (it's passed as `message`).
      const priorHistory = history.slice(0, -1);
      const systemInstruction = await buildSystemInstruction(context);
      const { text } = await gemini.generate({
        systemInstruction,
        history: toGeminiHistory(priorHistory),
        message,
        tools: toolDeclarations,
        onFunctionCall: (name, args) => executeTool(name, args, context),
      });
      const saved = await saveAssistant(session.id, text || 'Maaf, saya belum dapat menjawab itu.');
      return { sessionId: session.id, status: 'BOT', message: saved };
    } catch (e) {
      logger.warn('Gemini gagal, beralih ke FAQ', e.message);
    }
  }

  // Fallback: lexical FAQ matching.
  const best = await knowledge.bestAnswer(message);
  const reply = best
    ? best.answer
    : 'Maaf, saya belum menemukan jawaban untuk pertanyaan tersebut. Anda dapat mengetik "hubungi bendahara" untuk berbicara dengan petugas pada jam kerja.';
  const saved = await saveAssistant(session.id, reply, best ? { matchedQaId: best.id } : { fallback: true });
  return { sessionId: session.id, status: 'BOT', message: saved };
}

async function saveAssistant(sessionId, content, metadata = null) {
  return prisma.chatMessage.create({
    data: { sessionId, role: 'ASSISTANT', content, metadata: metadata || undefined },
  });
}

async function agentReply({ sessionId, message, agent }) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw ApiError.notFound('Sesi chat tidak ditemukan');
  await prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'HUMAN' } });
  return prisma.chatMessage.create({
    data: { sessionId, role: 'HUMAN', content: message, senderId: agent.id },
  });
}

async function getSessionMessages(sessionId) {
  return prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });
}

async function listSessions(query = {}) {
  const where = {};
  if (query.status) where.status = query.status;
  return prisma.chatSession.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      user: { select: { fullName: true, username: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true } },
    },
  });
}

async function closeSession(sessionId) {
  return prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'CLOSED' } });
}

module.exports = {
  handleMessage,
  agentReply,
  getSessionMessages,
  listSessions,
  closeSession,
};
