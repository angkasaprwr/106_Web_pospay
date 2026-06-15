const { prisma } = require('../../config/prisma');
const { recordAudit } = require('../audit/audit.service');

const qa = {
  list: (query = {}) => {
    const where = {};
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { question: { contains: query.search, mode: 'insensitive' } },
        { answer: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.chatbotQA.findMany({ where, orderBy: { updatedAt: 'desc' } });
  },
  create: async (data, actorId, req) => {
    const item = await prisma.chatbotQA.create({ data });
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'ChatbotQA', entityId: item.id, req });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.chatbotQA.update({ where: { id }, data });
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'ChatbotQA', entityId: id, req });
    return item;
  },
  remove: async (id, actorId, req) => {
    await prisma.chatbotQA.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'ChatbotQA', entityId: id, req });
  },
};

const docs = {
  list: () => prisma.chatbotDocument.findMany({ orderBy: { updatedAt: 'desc' } }),
  create: async (data, actorId, req) => {
    const item = await prisma.chatbotDocument.create({ data });
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'ChatbotDocument', entityId: item.id, req });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.chatbotDocument.update({ where: { id }, data });
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'ChatbotDocument', entityId: id, req });
    return item;
  },
  remove: async (id, actorId, req) => {
    await prisma.chatbotDocument.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'ChatbotDocument', entityId: id, req });
  },
};

module.exports = { qa, docs };
