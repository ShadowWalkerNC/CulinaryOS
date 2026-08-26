# Post-Pilot MCP Server — CulinaryOS Integration

This MCP server exposes Post-Pilot's repository audit/fix tools and customer loyalty postcard dispatch tools to any MCP-compatible client: Claude Desktop, Cursor, Windsurf, or a hosted HTTP endpoint.

---

## Tools Available

| Tool | Category | What it does |
|---|---|---|
| `send_marketing_postcard` | Loyalty / Marketing | Dispatches a physical marketing postcard coupon to a customer address for loyalty rewards |
| `evaluate_loyalty_milestone` | Loyalty / Marketing | Evaluates customer loyalty stats against visit/spend reward thresholds and queues postcard |
| `get_repo_structure` | Repo Automation | List files/dirs in any GitHub repo |
| `read_file` | Repo Automation | Read any file from the repo |
| `audit_repo` | Repo Automation | Automated checklist: CI, tests, db.py, plan_guard, scheduler, etc. |
| `write_file` | Repo Automation | Create or update any file (auto-fetches SHA so no mismatch errors) |
| `list_open_issues` | Repo Automation | List open GitHub issues, optionally filtered by label |
| `create_issue` | Repo Automation | Create a GitHub issue from an audit finding |
| `list_recent_commits` | Repo Automation | Verify fix commits landed on any branch |

---

## Setup

### 1. Install dependencies

```bash
pip install mcp PyGithub
```

### 2. Create a GitHub Fine-Grained Personal Access Token (Optional for Repo Tools)

Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**

Grant it:
- **Contents**: Read & Write
- **Issues**: Read & Write
- **Metadata**: Read-only

### 3. Set the environment variable

```bash
export GITHUB_TOKEN=your_token_here
```

---

## Run Locally — Claude Desktop / Cursor (stdio)

### Python FastMCP Server
```bash
python mcp/post-pilot-server.py
```

### TypeScript MCP Server (Node / Stdio)
```bash
pnpm --filter culinaryos-mcp-servers run build
node mcp/dist/post-pilot-server.js
```

### Claude Desktop Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "post-pilot": {
      "command": "python",
      "args": ["/path/to/CulinaryOS/mcp/post-pilot-server.py"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Cursor Configuration

Add `.cursor/mcp.json` to your project root:

```json
{
  "mcpServers": {
    "post-pilot": {
      "command": "python",
      "args": ["mcp/post-pilot-server.py"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## Run as HTTP Server (Hosted / Shareable)

```bash
python mcp/post-pilot-server.py --transport sse --port 8001
```

Point any MCP client at `http://localhost:8001/sse`.

---

## Example Prompts Once Connected

- *"Dispatch a 15% discount postcard to Eleanor Vance at 100 Hill House Lane"*
- *"Evaluate loyalty milestone for customer cust-102 with $275 spend and 3 visits"*
- *"Audit the ShadowWalkerNC/CulinaryOS repo and check open issues"*
