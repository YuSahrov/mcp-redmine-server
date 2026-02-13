# MCP Redmine Server

Model Context Protocol (MCP) server for Redmine integration. Provides comprehensive Redmine API access to Claude Code and other MCP-compatible AI assistants.

## Features

- **Issue Management**: Create, read, update issues with full details
- **File Attachments**: Upload and attach files/images to issues
- **Workflow Support**: Start/complete fix workflows with Git integration
- **Relations & Tree**: Manage issue relations, subtasks, and hierarchies
- **Status Filtering**: Query issues by status with flexible filtering
- **Comments**: Add comments and update issue status
- **Git Integration**: Automatic branch creation and commit tracking
- **Wiki Support**: Full wiki page management (read, create, update, delete)

## Available Tools

The server provides the following MCP tools:

### Issue Operations

1. **redmine_get_issue** - Get detailed issue information
   - Includes description, status, priority, comments
   - Returns full issue object with all metadata

2. **redmine_create_issue** - Create new issue
   - Parameters: title, description, tracker_id, priority_id, parent_id, file_paths
   - Supports creating subtasks via parent_id
   - Can attach files during issue creation

3. **redmine_add_comment** - Add comment to issue
   - Can optionally update issue status
   - Useful for progress updates and status changes

### File & Attachment Operations

4. **redmine_upload_file** - Upload file to Redmine
   - Returns upload token for later use
   - Supports all file types (images, documents, archives, etc.)

5. **redmine_add_attachments** - Attach files to existing issue
   - Upload and attach multiple files in one operation
   - Automatically adds comment with file list

### Querying & Filtering

6. **redmine_get_issues_by_status** - Filter issues by status
   - Parameters: status_name, limit, project_id
   - Returns issues with specific status (e.g., "New", "In Progress")
   - Can filter by project or get from all projects

7. **redmine_get_statuses** - Get all available statuses
   - Returns complete list of project statuses
   - Useful for discovering valid status names

8. **redmine_get_projects** - Get all accessible projects
   - Lists all Redmine projects available to your API key
   - Useful for multi-project environments

9. **redmine_get_project** - Get project details
   - Returns project info with trackers and enabled modules

10. **redmine_get_project_issues** - Get issues from specific project
    - Supports pagination and filtering
    - Filter by status, tracker, assignee

### Relations & Hierarchy

11. **redmine_get_issue_tree** - Get full issue tree
    - Returns main issue, related issues, and child issues
    - Shows complete issue hierarchy

12. **redmine_create_relation** - Link two issues
    - Relation types: relates, blocks, blocked, duplicates, precedes, follows
    - Creates bidirectional relationships

### Workflow Automation

13. **redmine_start_fix** - Start fix workflow
    - Creates Git branch automatically
    - Updates issue status to "In Progress"
    - Adds workflow comment

14. **redmine_complete_fix** - Complete fix workflow
    - Updates issue status to "Resolved"
    - Adds completion comment with commit details
    - Validates working directory is clean

### Wiki Operations

15. **redmine_wiki_get_page** - Get wiki page content
    - Returns page text and metadata
    - Includes attachments information

16. **redmine_wiki_get_index** - List all wiki pages
    - Returns index of all pages in project

17. **redmine_wiki_put_page** - Create or update wiki page
    - Uses Redmine Textile markup
    - Supports page hierarchy via parent_title

18. **redmine_wiki_delete_page** - Delete wiki page
    - Permanently removes wiki page from project

## Installation

### Global Installation (Recommended)

Install the MCP server globally for use across all projects:

```bash
# Install dependencies
npm install

# Create global link
npm link

# Verify installation
which mcp-redmine
```

### Local Installation

Or install locally in a specific project:

```bash
npm install
```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required
export REDMINE_API_KEY=your_api_key_here

# Optional (defaults shown)
export REDMINE_BASE_URL=https://3cad.tech
export REDMINE_PROJECT_ID=8
export REDMINE_PROJECT_IDENTIFIER=cad-tech
```

### Get Your Redmine API Key

1. Log in to your Redmine instance
2. Go to "My account" (top right menu)
3. Click "Show" under "API access key" on the right sidebar
4. Copy the API key

## Claude Code Integration

### Method 1: Global MCP Configuration

Add to your global Claude Code MCP settings (`~/.config/claude-code/mcp.json` or similar):

```json
{
  "mcpServers": {
    "redmine": {
      "command": "mcp-redmine",
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

### Method 2: Project-Specific Configuration

Add to your project's `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["path/to/mcp-redmine-server/index.js"],
      "env": {
        "REDMINE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Method 3: Use with dotenv

If using local installation with `.env` file:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["-r", "dotenv/config", "path/to/mcp-redmine-server/index.js"],
      "cwd": "path/to/mcp-redmine-server"
    }
  }
}
```

## Usage Examples

Once configured in Claude Code, the AI assistant can use these tools automatically:

### Example Conversations

**User**: "Show me all issues that are in progress"

Claude will use `redmine_get_issues_by_status` with `status_name: "In Progress"`

---

**User**: "Create a new bug for the login page issue"

Claude will use `redmine_create_issue` with appropriate tracker_id

---

**User**: "Start working on issue #42"

Claude will use `redmine_start_fix` to:
- Create a Git branch `fix/issue-42-...`
- Update issue status to "In Progress"
- Add comment with branch name

---

**User**: "I've fixed issue #42, the login validation is working now"

Claude will use `redmine_complete_fix` to:
- Update status to "Resolved"
- Add completion comment with commits
- Provide next steps (PR, merge, etc.)

---

**User**: "Show me the full tree of issue #78"

Claude will use `redmine_get_issue_tree` to show:
- Main issue details
- All related issues
- All child/subtask issues

---

**User**: "Create a bug report for the login issue and attach the screenshot from my Desktop"

Claude will:
1. Use `redmine_upload_file` to upload the screenshot
2. Use `redmine_create_issue` with the upload token to create issue with attachment

---

**User**: "Add these error logs to issue #150: /path/to/error.log and /path/to/debug.log"

Claude will use `redmine_add_attachments` to:
- Upload both log files
- Attach them to issue #150
- Add comment with file list

---

**User**: "Create a new feature request with the mockup image attached"

Claude will use `redmine_create_issue` with `file_paths` parameter to create issue with attachment in one step

## File Upload API Details

### How File Attachments Work

Redmine API uses a two-step process for file attachments:

1. **Upload File**: First, upload the file to get a token
   ```javascript
   // Returns: { token: "abc123...", filename: "screenshot.png", filesize: 12345 }
   ```

2. **Attach to Issue**: Use the token when creating/updating an issue
   ```javascript
   // The token is automatically used in issue creation/update
   ```

The MCP server simplifies this by handling both steps automatically:

- `redmine_add_attachments`: Upload files and attach them in one call
- `redmine_create_issue` with `file_paths`: Create issue with attachments in one call
- `redmine_upload_file`: Manual upload if you need the token for later use

### Supported File Types

All file types are supported:
- **Images**: PNG, JPG, GIF, SVG, etc.
- **Documents**: PDF, DOC, DOCX, TXT, MD, etc.
- **Archives**: ZIP, TAR, GZ, RAR, etc.
- **Code**: JS, PY, JAVA, etc.
- **Logs**: LOG, TXT, etc.
- **Any other binary files**

### File Path Requirements

- Must be **absolute paths** (e.g., `/home/user/screenshot.png` or `C:\Users\User\image.png`)
- Files must exist and be readable
- No size limit enforced by MCP server (Redmine server may have limits)

## Testing

Test the MCP server manually:

```bash
# Set environment variables
export REDMINE_API_KEY=your_api_key_here

# Run server (it communicates via stdio)
node index.js

# In another terminal, use MCP client to test
# Or test with Claude Code directly
```

### Testing File Uploads

```bash
# Example: Create issue with attachment
# This is done automatically by Claude when using the MCP tools
# Just ask: "Create a bug report and attach /path/to/screenshot.png"
```

## Troubleshooting

### "REDMINE_API_KEY environment variable is required"

Make sure you've set the `REDMINE_API_KEY` environment variable or created a `.env` file.

### "Connection failed" errors

1. Check your `REDMINE_BASE_URL` is correct
2. Verify your API key is valid
3. Ensure you have network access to the Redmine server
4. Check firewall/proxy settings

### Git integration not working

1. Ensure Git is installed and available in PATH
2. Verify you're running commands from a Git repository
3. Check you have write permissions for the repository

## Architecture

```
┌─────────────────────────────────────────┐
│         Claude Code / MCP Client        │
│                                         │
└──────────────┬──────────────────────────┘
               │ MCP Protocol (stdio)
               │
┌──────────────▼──────────────────────────┐
│        MCP Redmine Server               │
│                                         │
│  • Issue Management Tools               │
│  • File Upload & Attachments            │
│  • Workflow Automation                  │
│  • Git Integration                      │
│  • Wiki Management                      │
│  • Status & Filtering                   │
│                                         │
└──────────────┬──────────────────────────┘
               │ HTTPS API
               │
┌──────────────▼──────────────────────────┐
│         Redmine REST API                │
│                                         │
│  • Issues                               │
│  • Relations                            │
│  • Statuses                             │
│  • Projects                             │
│                                         │
└─────────────────────────────────────────┘
```

## Security Notes

- **API Key**: Never commit your API key to version control
- **Environment Variables**: Use `.env` files or secure environment configuration
- **.gitignore**: The `.env` file is already in `.gitignore`
- **Permissions**: API key should have appropriate permissions in Redmine
- **Git Operations**: Server executes Git commands - ensure trusted environment

## Development

### Project Structure

```
mcp-redmine-server/
├── index.js              # Main MCP server implementation
├── package.json          # Node.js dependencies and metadata
├── .env.example          # Example environment configuration
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

### Adding New Tools

To add new Redmine functionality:

1. Add tool definition to `ListToolsRequestSchema` handler
2. Implement tool logic in `CallToolRequestSchema` handler
3. Add corresponding helper function if needed
4. Update this README with usage examples

## Related Projects

- [Model Context Protocol](https://github.com/anthropics/model-context-protocol) - MCP specification and SDKs
- [Redmine API](https://www.redmine.org/projects/redmine/wiki/Rest_api) - Official Redmine REST API documentation

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues specific to this MCP server, please open a GitHub issue.

For Redmine API questions, refer to the [official documentation](https://www.redmine.org/projects/redmine/wiki/Rest_api).
