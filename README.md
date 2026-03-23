# ClawSearch CLI

Safe skill discovery for AI agents. Search 33,000+ skills with Trust Score, 10-language support, and @author lookup.

## Install

```bash
npm install -g clawsearch
```

Or use directly with npx:

```bash
npx clawsearch slack
```

## Usage

```bash
# Search skills (10 languages supported)
clawsearch slack
clawsearch "消息推送" --safe
clawsearch tool --type tool --limit 10

# Search by author
clawsearch @steipete
clawsearch @steipete --json

# View Trust Score breakdown
clawsearch trust slack

# Compare skills side by side
clawsearch compare slack discord feishu

# Pre-install security check
clawsearch check slack
clawsearch check https://clawhub.ai/steipete/slack

# Show trending skills
clawsearch trending

# JSON output (for agent integration)
clawsearch security --json
clawsearch trust slack --json
```

## Options

| Option | Description |
|--------|-------------|
| `--safe` | Only show SAFE skills |
| `--json` | Output as JSON (for agent integration) |
| `--type <type>` | Filter by type (tool, prompt_template, mcp_server, etc.) |
| `--limit <n>` | Max results (default 20) |

## Trust Score

Every skill gets a Trust Score (0-1) based on four dimensions:

- **Safety** (40%) — ClawSec 5-tier audit verdict + D2 security score
- **Author** (20%) — GitHub account age, skill count, malicious ratio
- **Community** (20%) — Downloads, stars
- **Transparency** (20%) — Open source, license, no obfuscation

```
●●●●● Verified Safe    (0.8-1.0)
●●●●○ Mostly Safe      (0.6-0.8)
●●●○○ Use with Caution (0.4-0.6)
●●○○○ Suspicious       (0.2-0.4)
●○○○○ Dangerous        (0.0-0.2)
```

## Supported Languages

Search in: English, 中文, 日本語, 한국어, Deutsch, Français, Español, Português, Русский, العربية

## API

Powered by [ClawSearch](https://clawsearch.cc) — the security-first AI agent skill search engine.

- Web: https://clawsearch.cc
- API: https://api.clawsearch.cc
- API Docs: https://api.clawsearch.cc/api/v1/docs
- Audit Engine: [ClawSec](https://clawsec.cc)
- Pre-install Guard: [clawsearch-guard](https://www.npmjs.com/package/clawsearch-guard)

## License

MIT
