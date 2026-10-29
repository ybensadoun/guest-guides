// The Claude API for the worker's research and translation (RESEARCH=api), in place of the `claude` command: for a server,
// with its own key and spending limit (docs/plan-worker-on-server.md). Research gets Anthropic's web search and web fetch
// tools, run on Anthropic's side; translation gets no tools. Each call logs its searches, tokens and expected cost.
// Settings (worker/.env.local or the server's environment). Their own names, so nothing set for Claude Code or another
// app on the same computer (ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL, CLAUDE_EFFORT...) changes what the worker does:
//   WORKER_ANTHROPIC_KEY     the worker's own API key (Claude Console, a workspace with a monthly spend limit)
//   RESEARCH_MODEL           default claude-opus-5-5; TRANSLATE_MODEL for translation (default claude-haiku-5-5)
//   RESEARCH_EFFORT          low | medium | high (default medium)
//   RESEARCH_MAX_SEARCHES    web searches per request (default 20; a long research carries on in up to 5 more requests)
//   RESEARCH_USD_PER_DAY     this worker stops asking Claude past this expected cost, until the next day (default 5)
//   RESEARCH_API_URL         tests only: another address for the API
// Needs the SDK once: npm ci --prefix worker
import Anthropic from '@anthropic-ai/sdk';

// USD per million tokens, input and output (Oct 2026). Cache writes cost 1.25x the input price; cache reads 0.05x on
// Opus 5.5 and Sonnet 5.5, 0.1x on Haiku 5.5. Web search: 10 USD per 1,000 searches; web fetch costs only its tokens.
const PRICE = { 'claude-opus-5-5': [4, 20, 0.05], 'claude-sonnet-5-5': [2, 10, 0.05], 'claude-haiku-5-5': [0.1, 0.5, 0.1] };
const SEARCH_USD = 0.01, MAX_TURNS = 6;
// Models that take the server-side fallback: a request declined by the model's safety checks is answered by another one.
const FALLBACK = /^claude-(fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/;
export const cost = (model, n) => { const [i, o, r] = PRICE[model] || PRICE['claude-opus-5-5'];
  return (n.in * i + n.cw * i * 1.25 + n.cr * i * r + n.out * o) / 1e6 + n.s * SEARCH_USD; };
// After a fallback in the middle of an answer, only the text before the switch goes back with the next request.
const echo = c => { const i = c.map(b => b.type).lastIndexOf('fallback'); return i < 0 ? c : [...c.slice(0, i).filter(b => b.type === 'text'), ...c.slice(i)]; };
// The answer is the text after the last search or page read (like the `claude` command's output), else all the text.
const answer = c => { const last = c.findLastIndex(b => !['text', 'thinking', 'redacted_thinking', 'fallback'].includes(b.type));
  const t = c.slice(last + 1).filter(b => b.type === 'text').map(b => b.text).join('');
  return t.trim() ? t : c.filter(b => b.type === 'text').map(b => b.text).join(''); };
const k = x => x >= 1000 ? Math.round(x / 1000) + 'k' : String(x);

export function makeClaude(env, log = console.log) {
  const client = new Anthropic({ apiKey: env.WORKER_ANTHROPIC_KEY, authToken: null, baseURL: env.RESEARCH_API_URL || 'https://api.anthropic.com', maxRetries: 3, timeout: 900000 });
  const MODEL = env.RESEARCH_MODEL || 'claude-opus-5-5', TMODEL = env.TRANSLATE_MODEL || 'claude-haiku-5-5', EFFORT = env.RESEARCH_EFFORT || 'medium';
  const SEARCHES = Math.max(1, +env.RESEARCH_MAX_SEARCHES || 20), PER_DAY = +env.RESEARCH_USD_PER_DAY || 5;
  let day = '', spent = 0;
  // One question to Claude, with the web (research) or without (translation). Returns the text of the answer.
  // meter (optional): { usd } that this question's expected cost is added to (what one piece of work costs).
  // searches (optional): fewer web searches than RESEARCH_MAX_SEARCHES for this question.
  return async function ask(prompt, { web = false, what = 'text', meter = null, searches = 0 } = {}) {
    const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; spent = 0; }
    const paused = web ? 'Searches are paused for now. Try again later.' : 'Translation is paused for now. Try again later.';
    if (spent >= PER_DAY) { log(`  claude api: ${what} not asked, about ${spent.toFixed(2)} USD spent today (RESEARCH_USD_PER_DAY=${PER_DAY})`); throw new Error(web ? 'Searches are paused for today. Try again tomorrow.' : 'Translation is paused for today. Try again tomorrow.'); }
    const model = web ? MODEL : TMODEL;
    const req = { model, max_tokens: 64000, output_config: { effort: EFFORT }, cache_control: { type: 'ephemeral' },
      ...(FALLBACK.test(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
      ...(web ? { tools: [{ type: 'web_search_20260318', name: 'web_search', max_uses: Math.min(SEARCHES, searches || SEARCHES), response_inclusion: 'excluded' },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: Math.min(SEARCHES, searches || SEARCHES), max_content_tokens: 30000 }] } : {}) };
    const messages = [{ role: 'user', content: prompt }], n = { in: 0, out: 0, cw: 0, cr: 0, s: 0, f: 0 }, t0 = Date.now();
    const done = m => { const usd = cost(model, n); spent += usd; if (meter) meter.usd = (meter.usd || 0) + usd;
      log(`  claude api, ${what}: ${m ? m.model : model}, ${n.s} searches, ${n.f} pages read, ${k(n.in + n.cw + n.cr)} tokens in, ${k(n.out)} out, ${Math.round((Date.now() - t0) / 1000)} s, about ${usd.toFixed(2)} USD (${spent.toFixed(2)} today)`); };
    // A long search comes back paused (pause_turn) after Anthropic's own loop of steps: sent back as it is, it carries on.
    for (let turn = 1; ; turn++) {
      let m;
      try { m = await client.beta.messages.stream({ ...req, messages }).finalMessage(); }
      catch (e) {   // the API's own words are for us, not the host: they go to the log only
        done(null); log('  claude api said:', e.status || '', String(e.message || e).slice(0, 200));
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError || e instanceof Anthropic.BadRequestError) throw new Error(paused);
        throw new Error(web ? 'The search did not work this time. Try again in a few minutes.' : 'The translation did not work this time. Try again in a few minutes.');
      }
      const u = m.usage || {};
      n.in += u.input_tokens || 0; n.out += u.output_tokens || 0; n.cw += u.cache_creation_input_tokens || 0; n.cr += u.cache_read_input_tokens || 0;
      n.s += (u.server_tool_use || {}).web_search_requests || 0; n.f += (u.server_tool_use || {}).web_fetch_requests || 0;
      if (m.stop_reason === 'pause_turn' && turn < MAX_TURNS) { messages.push({ role: 'assistant', content: echo(m.content) }); continue; }
      done(m);
      if (m.stop_reason === 'refusal') { log('  claude api: declined,', (m.stop_details || {}).category || ''); throw new Error(web ? 'The search did not work this time. Try again later.' : 'The translation did not work this time. Try again later.'); }
      if (m.stop_reason === 'pause_turn') throw new Error('The search took too long. Try again later.');
      if (m.stop_reason === 'max_tokens') log(`  claude api: the answer for ${what} was cut at its length limit`);
      return answer(m.content);
    }
  };
}
