# MCP Redmine Server - Installation Guide

This guide will help you install and configure the MCP Redmine Server for global use with Claude Code.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Redmine account with API access
- Claude Code installed

## Step-by-Step Installation

### 1. Clone or Navigate to the Server Directory

```bash
cd C:\Users\Tom\Desktop\3cad.tech\mcp-redmine-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get Your Redmine API Key

1. Log in to https://3cad.tech (or your Redmine instance)
2. Click on your name in the top-right corner
3. Click "My account"
4. On the right sidebar, find "API access key"
5. Click "Show" to reveal your API key
6. Copy the key

### 4. Configure Environment Variables

Choose one of the following methods:

#### Method A: Using .env File (Local Configuration)

```bash
# Copy the example file
copy .env.example .env

# Edit .env and add your API key
# Replace 'your_api_key_here' with your actual API key
```

#### Method B: System Environment Variables (Global Configuration)

**Windows (PowerShell):**
```powershell
[Environment]::SetEnvironmentVariable("REDMINE_API_KEY", "your_api_key_here", "User")
```

**Windows (Command Prompt):**
```cmd
setx REDMINE_API_KEY "your_api_key_here"
```

**macOS/Linux:**
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export REDMINE_API_KEY=your_api_key_here
export REDMINE_BASE_URL=https://3cad.tech
export REDMINE_PROJECT_ID=8
export REDMINE_PROJECT_IDENTIFIER=cad-tech
```

### 5. Test the Server

```bash
# Test basic functionality
node index.js
```

You should see output like:
```
MCP Redmine Server running on stdio
Connected to: https://3cad.tech
Project: cad-tech
```

Press `Ctrl+C` to stop the test.

### 6. Configure Claude Code

You need to add the MCP server configuration to Claude Code's settings.

#### Find Claude Code Configuration Directory

**Windows:**
```
%APPDATA%\Claude Code\mcp.json
```

**macOS:**
```
~/Library/Application Support/Claude Code/mcp.json
```

**Linux:**
```
~/.config/claude-code/mcp.json
```

#### Add MCP Server Configuration

Edit or create the `mcp.json` file with the following content:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "C:\\Users\\Tom\\Desktop\\3cad.tech\\mcp-redmine-server",
      "env": {
        "REDMINE_API_KEY": "your_api_key_here",
        "REDMINE_BASE_URL": "https://3cad.tech",
        "REDMINE_PROJECT_ID": "8",
        "REDMINE_PROJECT_IDENTIFIER": "cad-tech"
      }
    }
  }
}
```

**Important:**
- Replace `your_api_key_here` with your actual API key
- Update `cwd` path to match your installation location
- On Windows, use double backslashes (`\\`) in paths

#### Alternative: Use Provided Configuration File

You can copy the provided configuration:

```bash
# View the example configuration
cat claude-mcp-config.json

# Copy it to Claude Code config directory (adjust path as needed)
# Windows:
copy claude-mcp-config.json "%APPDATA%\Claude Code\mcp.json"

# macOS/Linux:
cp claude-mcp-config.json ~/Library/Application\ Support/Claude\ Code/mcp.json
```

### 7. Restart Claude Code

After adding the configuration:

1. Completely quit Claude Code
2. Restart Claude Code
3. The MCP server will be loaded automatically

### 8. Verify Integration

Open Claude Code and try these commands:

**Example 1: Get issue details**
```
User: "Show me details for Redmine issue #78"
```

**Example 2: List issues by status**
```
User: "Show me all issues with status 'In Progress'"
```

**Example 3: Create a new issue**
```
User: "Create a new Redmine issue: 'Fix login validation' with description 'Users can bypass email validation'"
```

If everything is configured correctly, Claude should be able to interact with your Redmine instance.

## Troubleshooting

### Error: "REDMINE_API_KEY environment variable is required"

**Solution:** Make sure you've set the API key in either:
- The `.env` file in the server directory
- The `env` section of `mcp.json`
- System environment variables

### Error: "Connection failed" or "HTTP 401"

**Possible causes:**
1. Invalid API key - verify it's correct
2. API key doesn't have proper permissions
3. Redmine server URL is incorrect

**Solution:**
```bash
# Test your API key manually with curl
curl -H "X-Redmine-API-Key: your_api_key_here" https://3cad.tech/issues.json?limit=1
```

### MCP Server Not Loading in Claude Code

**Solution:**
1. Check `mcp.json` file syntax (must be valid JSON)
2. Verify the `cwd` path is correct and accessible
3. Check Claude Code logs for errors
4. Ensure Node.js is in system PATH

**Windows - Check Node.js:**
```cmd
where node
```

**macOS/Linux - Check Node.js:**
```bash
which node
```

### "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:**
```bash
cd mcp-redmine-server
npm install
```

## Advanced Configuration

### Using Multiple Redmine Projects

You can configure multiple MCP servers for different Redmine projects:

```json
{
  "mcpServers": {
    "redmine-project1": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "C:\\Users\\Tom\\Desktop\\3cad.tech\\mcp-redmine-server",
      "env": {
        "REDMINE_API_KEY": "key1",
        "REDMINE_PROJECT_ID": "8",
        "REDMINE_PROJECT_IDENTIFIER": "cad-tech"
      }
    },
    "redmine-project2": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "C:\\Users\\Tom\\Desktop\\3cad.tech\\mcp-redmine-server",
      "env": {
        "REDMINE_API_KEY": "key2",
        "REDMINE_PROJECT_ID": "15",
        "REDMINE_PROJECT_IDENTIFIER": "another-project"
      }
    }
  }
}
```

### Global npm Installation (Alternative)

For easier access across all projects:

```bash
# In the mcp-redmine-server directory
npm link

# This makes 'mcp-redmine' available globally
# Then in mcp.json, you can use:
{
  "mcpServers": {
    "redmine": {
      "command": "mcp-redmine",
      "env": {
        "REDMINE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Security Best Practices

1. **Never commit API keys** - Keep `.env` in `.gitignore`
2. **Use environment-specific keys** - Different keys for dev/prod
3. **Rotate keys periodically** - Generate new API keys regularly
4. **Restrict key permissions** - Use Redmine role-based access
5. **Secure storage** - Use system credential managers for production

## Updating the Server

To update to a newer version:

```bash
cd mcp-redmine-server
git pull  # if using git
npm install  # update dependencies
```

Then restart Claude Code.

## Uninstalling

To remove the MCP server:

1. Remove the configuration from Claude Code's `mcp.json`
2. Restart Claude Code
3. Optionally delete the server directory

## Next Steps

- Read [README.md](README.md) for usage examples
- Explore available tools and capabilities
- Integrate with your workflow
- Customize for your team's needs

## Support

- Check the [README.md](README.md) for detailed documentation
- Review Redmine API docs: https://www.redmine.org/projects/redmine/wiki/Rest_api
- Check MCP specification: https://modelcontextprotocol.io

## Version History

- **1.0.0** - Initial release with core functionality
  - Issue management
  - Workflow automation
  - Git integration
  - Status filtering
  - Relations and tree views
