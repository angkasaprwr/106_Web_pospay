const { prisma } = require('../../config/prisma');

const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'saya', 'apa', 'bagaimana', 'cara', 'kapan',
  'berapa', 'adalah', 'ini', 'itu', 'dengan', 'pada', 'atau', 'the', 'a', 'is', 'how', 'what',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function scoreText(queryTokens, text) {
  const haystack = String(text || '').toLowerCase();
  let score = 0;
  queryTokens.forEach((t) => {
    if (haystack.includes(t)) score += 1;
  });
  return score;
}

/**
 * Retrieve the most relevant Q&A entries and document chunks for a query (lexical RAG).
 */
async function retrieve(query, { qaLimit = 4, docLimit = 3 } = {}) {
  const tokens = tokenize(query);
  const [qas, docs] = await Promise.all([
    prisma.chatbotQA.findMany({ where: { isActive: true } }),
    prisma.chatbotDocument.findMany({ where: { isActive: true } }),
  ]);

  const rankedQa = qas
    .map((qa) => ({ qa, score: scoreText(tokens, `${qa.question} ${qa.keywords || ''} ${qa.answer}`) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, qaLimit)
    .map((r) => r.qa);

  const rankedDocs = docs
    .map((doc) => ({ doc, score: scoreText(tokens, `${doc.title} ${doc.content}`) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, docLimit)
    .map((r) => ({ ...r.doc, content: r.doc.content.slice(0, 1200) }));

  return { qas: rankedQa, docs: rankedDocs };
}

/** Best single Q&A answer for fallback mode (no LLM). */
async function bestAnswer(query) {
  const tokens = tokenize(query);
  const qas = await prisma.chatbotQA.findMany({ where: { isActive: true } });
  let best = null;
  let bestScore = 0;
  qas.forEach((qa) => {
    const score = scoreText(tokens, `${qa.question} ${qa.keywords || ''}`);
    if (score > bestScore) {
      best = qa;
      bestScore = score;
    }
  });
  return bestScore > 0 ? best : null;
}

module.exports = { retrieve, bestAnswer, tokenize };
