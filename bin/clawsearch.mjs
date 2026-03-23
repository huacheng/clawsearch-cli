#!/usr/bin/env node
/**
 * ClawSearch CLI — Safe Skill Discovery for AI Agents
 * https://clawsearch.cc
 */

const API = 'https://api.clawsearch.cc/api/v1';

// ─── Colors ───
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// ─── Trust Badge ───
function trustBadge(level, score) {
  const config = {
    verified_safe:    { dots: 5, color: c.green,  label: 'Verified Safe' },
    mostly_safe:      { dots: 4, color: c.blue,   label: 'Mostly Safe' },
    use_with_caution: { dots: 3, color: c.yellow, label: 'Caution' },
    suspicious:       { dots: 2, color: c.red,    label: 'Suspicious' },
    dangerous:        { dots: 1, color: c.red,    label: 'Dangerous' },
    unknown:          { dots: 0, color: c.gray,   label: 'Unknown' },
  };
  const cfg = config[level] || config.unknown;
  const filled = '\u25CF'.repeat(cfg.dots);
  const empty = '\u25CB'.repeat(5 - cfg.dots);
  return `${cfg.color}${filled}${c.dim}${empty}${c.reset} ${cfg.color}${cfg.label}${c.reset}`;
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ─── API ───
async function api(path) {
  const resp = await fetch(`${API}${path}`);
  if (resp.status === 429) {
    console.error(`${c.red}Rate limit exceeded. Try again later.${c.reset}`);
    process.exit(1);
  }
  if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

// ─── Commands ───
async function cmdSearch(query, opts) {
  // @author search
  if (query.startsWith('@')) {
    const handle = query.slice(1);
    try {
      const data = await api(`/author/${handle}`);
      if (opts.json) { console.log(JSON.stringify(data, null, 2)); return; }
      console.log(`\n ${c.bold}Author: @${handle}${c.reset}  Score: ${data.author_score}  Level: ${data.author_level}`);
      console.log(` Skills: ${data.skills.length}\n`);
      for (const s of data.skills) {
        const slug = (s.skill_id || '').split('/').pop();
        const dl = formatNum(s.downloads || 0);
        console.log(` ${c.bold}${slug}${c.reset}  ${s.verdict}  ${c.cyan}${dl}\u2B07${c.reset}`);
      }
      console.log();
    } catch { console.error(`${c.red}Author "${handle}" not found.${c.reset}`); }
    return;
  }

  const type = opts.type ? `&skill_type=${opts.type}` : '';
  const data = await api(`/search?q=${encodeURIComponent(query)}&limit=${opts.limit || 20}${type}`);

  let items = data.items;
  if (opts.safe) items = items.filter(i => i.verdict === 'SAFE');

  if (opts.json) { console.log(JSON.stringify({ items, total: data.total, query: data.query }, null, 2)); return; }

  console.log(`\n ${c.bold}ClawSearch${c.reset} ${c.dim}— ${data.total} results for "${data.query}"${c.reset}\n`);

  if (items.length === 0) {
    console.log(` ${c.dim}No results found.${c.reset}\n`);
    return;
  }

  for (const item of items) {
    const slug = (item.skill_id || '').split('/').pop();
    const badge = trustBadge(item.trust_level, item.trust_score);
    const dl = formatNum(item.downloads || 0);
    console.log(` ${badge}  ${c.bold}${slug}${c.reset}  ${c.dim}${item.author || ''}${c.reset}  ${c.cyan}${dl}\u2B07${c.reset}`);
    if (item.intent) console.log(`   ${c.dim}${item.intent.slice(0, 80)}${c.reset}`);
  }
  console.log();
}

async function cmdTrust(slug) {
  try {
    const data = await api(`/trust/${slug}`);
    const bd = data.breakdown || {};

    console.log(`\n ${c.bold}Trust Score: ${slug}${c.reset}\n`);
    console.log(` ${trustBadge(data.trust_level, data.trust_score)}  ${c.bold}${data.trust_score}${c.reset}\n`);

    const bar = (label, score) => {
      const width = 20;
      const filled = Math.round(score * width);
      const empty = width - filled;
      const color = score >= 0.7 ? c.green : score >= 0.4 ? c.yellow : c.red;
      return ` ${label.padEnd(14)} ${color}${'█'.repeat(filled)}${c.dim}${'░'.repeat(empty)}${c.reset} ${score.toFixed(2)}`;
    };

    console.log(bar('Safety', bd.safety?.score || 0));
    console.log(bar('Author', bd.author?.score || 0));
    console.log(bar('Community', bd.community?.score || 0));
    console.log(bar('Transparency', bd.transparency?.score || 0));

    console.log(`\n ${c.dim}Verdict: ${bd.safety?.verdict || 'UNKNOWN'}${c.reset}`);
    if (data.intent) console.log(` ${c.dim}Intent: ${data.intent.slice(0, 100)}${c.reset}`);
    console.log(` ${c.dim}Install: clawhub install ${slug}${c.reset}\n`);
  } catch {
    console.error(`${c.red}Skill "${slug}" not found or not yet audited.${c.reset}`);
  }
}

async function cmdCompare(slugs) {
  const data = await api(`/compare?slugs=${slugs.join(',')}`);

  console.log(`\n ${c.bold}Security Comparison${c.reset}\n`);

  for (const item of data.items) {
    console.log(` ${trustBadge(item.trust_level, item.trust_score)}  ${c.bold}${item.slug}${c.reset}  ${item.trust_score}`);
    if (item.intent) console.log(`   ${c.dim}${item.intent.slice(0, 70)}${c.reset}`);
  }
  console.log();
}

async function cmdCheck(slugOrUrl) {
  // Extract slug from URL if needed
  let slug = slugOrUrl;
  const match = slugOrUrl.match(/clawhub\.\w+\/(?:skills\/)?(?:[^/]+\/)?([^/]+)\/?$/);
  if (match) slug = match[1];
  slug = slug.replace(/^clawhub\//, '');

  const resp = await fetch(`${API}/pre-install-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  const result = await resp.json();

  console.log(`\n ${c.bold}Pre-install Security Check: ${slug}${c.reset}\n`);
  console.log(` ${trustBadge(result.trust_level, result.trust_score)}  Score: ${result.trust_score}\n`);

  if (result.decision === 'allow') {
    console.log(` ${c.green}✓ ALLOW${c.reset} — Safe to install\n`);
  } else if (result.decision === 'warn') {
    console.log(` ${c.yellow}⚠ WARN${c.reset} — Use with caution\n`);
  } else if (result.decision === 'block') {
    console.log(` ${c.red}✗ BLOCK${c.reset} — Not recommended\n`);
  } else {
    console.log(` ${c.gray}? UNKNOWN${c.reset} — Not yet audited\n`);
  }
}

async function cmdTrending() {
  const data = await api('/trending?limit=20');
  console.log(`\n ${c.bold}Trending Skills${c.reset}\n`);
  for (const item of data.items) {
    const slug = (item.skill_id || '').split('/').pop();
    const badge = trustBadge(item.trust_level, item.trust_score);
    console.log(` ${badge}  ${c.bold}${slug}${c.reset}  ${c.cyan}${formatNum(item.downloads || 0)}\u2B07${c.reset}`);
  }
  console.log();
}

// ─── Help ───
function showHelp() {
  console.log(`
 ${c.bold}ClawSearch${c.reset} — Safe Skill Discovery for AI Agents
 ${c.dim}https://clawsearch.cc${c.reset}

 ${c.bold}Usage:${c.reset}
   clawsearch <query>              Search skills (10 languages supported)
   clawsearch @<author>            View author profile and skills
   clawsearch trust <slug>         View Trust Score breakdown
   clawsearch compare <a> <b> ...  Compare skills side by side
   clawsearch check <slug|url>     Pre-install security check
   clawsearch trending             Show trending skills
   clawsearch --help               Show this help

 ${c.bold}Options:${c.reset}
   --safe         Only show SAFE skills
   --json         Output as JSON (for agent integration)
   --type <type>  Filter by type (tool, prompt_template, mcp_server, etc.)
   --limit <n>    Max results (default 20)

 ${c.bold}Examples:${c.reset}
   clawsearch slack
   clawsearch "消息推送" --safe
   clawsearch @steipete
   clawsearch trust slack --json
   clawsearch check https://clawhub.ai/steipete/slack
   clawsearch compare slack discord feishu
`);
}

// ─── Main ───
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const cmd = args[0];
const opts = {
  safe: args.includes('--safe'),
  json: args.includes('--json'),
  type: args.includes('--type') ? args[args.indexOf('--type') + 1] : '',
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 20,
};
const restArgs = args.filter(a => !a.startsWith('--') && a !== opts.type && a !== String(opts.limit));

(async () => {
  try {
    if (cmd === 'trust' && restArgs[1]) {
      await cmdTrust(restArgs[1]);
    } else if (cmd === 'compare' && restArgs.length > 1) {
      await cmdCompare(restArgs.slice(1));
    } else if (cmd === 'check' && restArgs[1]) {
      await cmdCheck(restArgs[1]);
    } else if (cmd === 'trending') {
      await cmdTrending();
    } else {
      // Default: search
      const query = restArgs.join(' ');
      if (query.length < 2) {
        showHelp();
        process.exit(1);
      }
      await cmdSearch(query, opts);
    }
  } catch (e) {
    console.error(`${c.red}Error: ${e.message}${c.reset}`);
    process.exit(1);
  }
})();
