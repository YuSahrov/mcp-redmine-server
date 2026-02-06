# MCP Redmine Server - Quick Start Guide

Get up and running with MCP Redmine Server in 5 minutes.

## TL;DR

```bash
# 1. Install dependencies
cd mcp-redmine-server
npm install

# 2. Set your API key
# Windows PowerShell:
$env:REDMINE_API_KEY = "your_api_key_here"

# macOS/Linux:
export REDMINE_API_KEY=your_api_key_here

# 3. Test the server
node index.js
# Press Ctrl+C to stop

# 4. Add to Claude Code config
# Edit: %APPDATA%\Claude Code\mcp.json (Windows)
# Or: ~/Library/Application Support/Claude Code/mcp.json (macOS)
```

Add this to `mcp.json`:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "C:\\Users\\Tom\\Desktop\\3cad.tech\\mcp-redmine-server",
      "env": {
        "REDMINE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Code. Done!

## Get Your API Key

1. Go to https://3cad.tech
2. My account → API access key → Show
3. Copy the key

## Quick Test

After setup, test in Claude Code:

**Try this:**
> "Show me all Redmine issues with status 'New'"

**Or this:**
> "Create a Redmine issue: 'Test MCP integration' with description 'Testing the new MCP server'"

**Or this:**
> "Get details for issue #78"

## Available Commands

Once configured, you can ask Claude to:

- ✅ **Get issue details**: "Show me issue #42"
- ✅ **Create issues**: "Create a bug about login validation"
- ✅ **Filter by status**: "List all in-progress issues"
- ✅ **Add comments**: "Add a comment to issue #42 saying it's ready for review"
- ✅ **Start workflow**: "Start working on issue #42" (creates branch, updates status)
- ✅ **Complete workflow**: "Mark issue #42 as complete" (updates status, adds commits)
- ✅ **Show relations**: "Show me the full tree for issue #78"
- ✅ **Link issues**: "Link issue #42 to issue #43 as 'relates'"

## What's Next?

- Read [INSTALLATION.md](INSTALLATION.md) for detailed setup
- Check [README.md](README.md) for all features
- Explore the 9 available MCP tools

## Common Issues

**"API key required" error:**
- Make sure you set `REDMINE_API_KEY` in the `env` section of `mcp.json`

**Claude doesn't see the tools:**
- Restart Claude Code completely
- Check `mcp.json` syntax is valid JSON
- Verify the `cwd` path is correct

**Connection errors:**
- Test your API key: `curl -H "X-Redmine-API-Key: your_key" https://3cad.tech/issues.json?limit=1`
- Check firewall/proxy settings

## Need Help?

See [INSTALLATION.md](INSTALLATION.md) for troubleshooting or [README.md](README.md) for full documentation.
