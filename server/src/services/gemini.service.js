const { env } = require('../config/env');
const { logger } = require('../utils/logger');

let GoogleGenerativeAI = null;
let client = null;

function getClient() {
  if (!env.gemini.apiKey) return null;
  if (client) return client;
  try {
    // eslint-disable-next-line global-require
    ({ GoogleGenerativeAI } = require('@google/generative-ai'));
    client = new GoogleGenerativeAI(env.gemini.apiKey);
    logger.info(`Gemini siap (model: ${env.gemini.model})`);
  } catch (e) {
    logger.warn('Gagal menginisialisasi Gemini', e.message);
    client = null;
  }
  return client;
}

function isEnabled() {
  return !!env.gemini.apiKey && !!getClient();
}

/**
 * Run a multi-turn conversation with optional function calling.
 * @param {object} params
 * @param {string} params.systemInstruction
 * @param {Array<{role:'user'|'model', parts:Array}>} params.history
 * @param {string} params.message - latest user message
 * @param {Array} [params.tools] - functionDeclarations
 * @param {(name:string, args:object)=>Promise<object>} [params.onFunctionCall]
 * @returns {Promise<{text:string, functionCalls:string[]}>}
 */
async function generate({ systemInstruction, history = [], message, tools = [], onFunctionCall }) {
  const c = getClient();
  if (!c) throw new Error('Gemini tidak dikonfigurasi');

  const model = c.getGenerativeModel({
    model: env.gemini.model,
    systemInstruction,
    ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
  });

  const chat = model.startChat({ history });
  let result = await chat.sendMessage(message);
  const executed = [];

  // Handle up to 5 rounds of function calls.
  for (let i = 0; i < 5; i += 1) {
    const calls = result.response.functionCalls?.() || [];
    if (!calls.length) break;

    const responses = [];
    for (const call of calls) {
      executed.push(call.name);
      let data = { error: 'Fungsi tidak tersedia' };
      if (onFunctionCall) {
        try {
          // eslint-disable-next-line no-await-in-loop
          data = await onFunctionCall(call.name, call.args || {});
        } catch (e) {
          data = { error: e.message };
        }
      }
      responses.push({ functionResponse: { name: call.name, response: { result: data } } });
    }
    // eslint-disable-next-line no-await-in-loop
    result = await chat.sendMessage(responses);
  }

  return { text: result.response.text(), functionCalls: executed };
}

module.exports = { isEnabled, generate };
