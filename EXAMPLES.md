# MCP Redmine Server - Usage Examples

Real-world examples of using the MCP Redmine Server with Claude Code.

## Basic Issue Operations

### Get Issue Details

**User:**
> "Show me details for issue #78"

**Claude uses:** `redmine_get_issue`

**Result:**
```json
{
  "id": 78,
  "subject": "Implement user authentication system",
  "description": "Create JWT-based authentication...",
  "status": { "name": "In Progress" },
  "priority": { "name": "High" },
  "assigned_to": { "name": "John Doe" }
}
```

### Create a New Issue

**User:**
> "Create a bug report: 'Login page crashes on mobile Safari' with description 'When users try to login on mobile Safari, the page freezes after entering credentials'"

**Claude uses:** `redmine_create_issue`

**Parameters:**
```json
{
  "title": "Login page crashes on mobile Safari",
  "description": "When users try to login on mobile Safari, the page freezes after entering credentials",
  "tracker_id": 1,
  "priority_id": 4
}
```

**Result:**
- Issue #124 created
- URL: https://3cad.tech/issues/124

### Create a Subtask

**User:**
> "Create a subtask for issue #78: 'Implement JWT token generation' with description 'Create service to generate and validate JWT tokens'"

**Claude uses:** `redmine_create_issue`

**Parameters:**
```json
{
  "title": "Implement JWT token generation",
  "description": "Create service to generate and validate JWT tokens",
  "parent_id": 78,
  "tracker_id": 2
}
```

## Workflow Automation

### Start Working on an Issue

**User:**
> "I want to start working on issue #42"

**Claude uses:** `redmine_start_fix`

**What happens:**
1. Creates Git branch: `fix/issue-42-fix-login-validation`
2. Updates issue status to "In Progress"
3. Adds comment: "Started working on this issue. Branch: fix/issue-42-..."

**Result:**
```json
{
  "branchName": "fix/issue-42-fix-login-validation",
  "issue": {
    "id": 42,
    "subject": "Fix login validation",
    "status": { "name": "In Progress" }
  },
  "message": "Fix workflow started successfully"
}
```

### Complete an Issue

**User:**
> "I've finished issue #42. I added proper email validation and password strength checking. All tests are passing."

**Claude uses:** `redmine_complete_fix`

**Parameters:**
```json
{
  "issue_id": "42",
  "completion_message": "Added proper email validation and password strength checking. All tests are passing."
}
```

**What happens:**
1. Updates issue status to "Resolved"
2. Adds comment with:
   - Completion message
   - Branch name
   - Recent commits
   - "Ready for review and testing"

## Status Filtering

### List Issues by Status

**User:**
> "Show me all issues that are currently in progress"

**Claude uses:** `redmine_get_issues_by_status`

**Parameters:**
```json
{
  "status_name": "In Progress",
  "limit": 50
}
```

**Result:**
```json
{
  "status": { "name": "In Progress", "id": 2 },
  "issues": [
    {
      "id": 78,
      "subject": "Implement user authentication system",
      "priority": { "name": "High" }
    },
    {
      "id": 82,
      "subject": "Add dark mode support",
      "priority": { "name": "Normal" }
    }
  ],
  "totalCount": 2
}
```

### Get All Available Statuses

**User:**
> "What statuses are available in this Redmine project?"

**Claude uses:** `redmine_get_statuses`

**Result:**
```json
[
  { "id": 1, "name": "New", "is_closed": false },
  { "id": 2, "name": "In Progress", "is_closed": false },
  { "id": 3, "name": "Resolved", "is_closed": false },
  { "id": 4, "name": "Feedback", "is_closed": false },
  { "id": 5, "name": "Closed", "is_closed": true }
]
```

## Issue Relations & Hierarchy

### Show Full Issue Tree

**User:**
> "Show me the complete tree for issue #78, including all related and child issues"

**Claude uses:** `redmine_get_issue_tree`

**Result:**
```json
{
  "main": {
    "id": 78,
    "subject": "Implement user authentication system",
    "status": "In Progress",
    "priority": "High"
  },
  "relations": [
    {
      "id": 65,
      "subject": "Design security architecture",
      "status": "Resolved",
      "relation_type": "precedes"
    }
  ],
  "children": [
    {
      "id": 125,
      "subject": "Implement JWT token generation",
      "status": "New",
      "priority": "High"
    },
    {
      "id": 126,
      "subject": "Create login API endpoint",
      "status": "In Progress",
      "priority": "High"
    }
  ]
}
```

### Link Two Issues

**User:**
> "Link issue #42 to issue #43 as 'blocks' - issue 42 blocks 43"

**Claude uses:** `redmine_create_relation`

**Parameters:**
```json
{
  "issue_id": "42",
  "related_issue_id": "43",
  "relation_type": "blocks"
}
```

**Result:**
- Relation created: Issue #42 blocks #43

## Comments & Updates

### Add Progress Comment

**User:**
> "Add a comment to issue #78: 'JWT implementation is complete. Moving on to session management.'"

**Claude uses:** `redmine_add_comment`

**Parameters:**
```json
{
  "issue_id": "78",
  "comment": "JWT implementation is complete. Moving on to session management."
}
```

### Add Comment and Update Status

**User:**
> "Mark issue #42 as resolved and add comment 'Fixed the validation logic. Ready for testing.'"

**Claude uses:** `redmine_add_comment`

**Parameters:**
```json
{
  "issue_id": "42",
  "comment": "Fixed the validation logic. Ready for testing.",
  "status_id": 3
}
```

## Complex Workflows

### Feature Implementation Workflow

**Conversation Example:**

**User:**
> "I want to implement a new feature for dark mode support"

**Claude:**
> "I'll help you set up the workflow. First, let me create an issue for this feature."

**Claude uses:** `redmine_create_issue`
```json
{
  "title": "Add dark mode support",
  "description": "Implement dark mode theme switching across the application",
  "tracker_id": 2,
  "priority_id": 2
}
```

**Claude:**
> "Created issue #127. Now let me create subtasks for the implementation."

**Claude uses:** `redmine_create_issue` (3 times)
```json
[
  {
    "title": "Create dark mode CSS variables",
    "description": "Define CSS custom properties for dark theme colors",
    "parent_id": 127
  },
  {
    "title": "Add theme toggle component",
    "description": "Create UI component for switching themes",
    "parent_id": 127
  },
  {
    "title": "Persist theme preference",
    "description": "Save user's theme choice in localStorage",
    "parent_id": 127
  }
]
```

**Claude:**
> "I've created issue #127 with 3 subtasks (#128, #129, #130). Would you like to start working on the first subtask?"

**User:**
> "Yes, let's start with subtask #128"

**Claude uses:** `redmine_start_fix`
```json
{
  "issue_id": "128",
  "working_directory": "/path/to/project"
}
```

**Claude:**
> "I've created branch `fix/issue-128-create-dark-mode-css-variables` and updated the issue status to 'In Progress'. You can now implement the dark mode CSS variables."

### Bug Fix Workflow

**User:**
> "There's a bug in the login form - it doesn't validate email addresses properly. Can you help me fix it?"

**Claude:**
> "I'll create a bug report and start the fix workflow. Let me first create the issue."

**Claude uses:** `redmine_create_issue`
```json
{
  "title": "Fix email validation in login form",
  "description": "Login form doesn't properly validate email addresses, allowing invalid formats",
  "tracker_id": 1,
  "priority_id": 4
}
```

**Claude:**
> "Created bug #131. Now let me start the fix workflow."

**Claude uses:** `redmine_start_fix`

**Claude:**
> "I've created branch `fix/issue-131-fix-email-validation` and set the issue to 'In Progress'. Now, let me help you implement the fix..."

*[After implementing the fix]*

**User:**
> "Great! I've committed the fix. All tests are passing now."

**Claude uses:** `redmine_complete_fix`
```json
{
  "issue_id": "131",
  "completion_message": "Implemented proper email validation using regex pattern. Added unit tests to verify valid and invalid email formats. All existing tests continue to pass."
}
```

**Claude:**
> "Perfect! Issue #131 is now marked as 'Resolved'. The completion comment includes your recent commits. You can now create a pull request for review."

## Integration with Other Tools

### Combined with Git Operations

**User:**
> "Show me all issues related to the authentication system that I'm currently working on"

**Claude:**
1. Uses `redmine_get_issues_by_status` to get "In Progress" issues
2. Filters for authentication-related issues
3. For each issue, uses `redmine_get_issue_tree` to show dependencies

**User:**
> "I want to commit my changes for issue #78. What should I put in the commit message?"

**Claude:**
1. Uses `redmine_get_issue` to fetch issue details
2. Suggests commit message: `feat: implement JWT token generation (refs #78)`

### Project Planning

**User:**
> "Show me all high-priority issues that are not yet started"

**Claude:**
1. Uses `redmine_get_issues_by_status` with status "New"
2. Filters results for high priority
3. Displays list with suggestions for which to tackle first

## Advanced Examples

### Bulk Operations

**User:**
> "Create a set of tasks for implementing the user profile feature"

**Claude creates:**
1. Parent issue: "Implement user profile feature"
2. Subtasks:
   - "Create profile database schema"
   - "Implement profile API endpoints"
   - "Create profile UI components"
   - "Add profile image upload"
   - "Implement profile privacy settings"

Uses `redmine_create_issue` 6 times total.

### Dependency Management

**User:**
> "Show me what needs to be done before I can start issue #95"

**Claude:**
1. Uses `redmine_get_issue_tree` for issue #95
2. Identifies all "blocks" and "precedes" relations
3. Checks status of blocking issues
4. Provides ordered list of prerequisites

## Tips & Best Practices

### For Best Results

1. **Be specific:** "Create a bug for login validation" vs "Create an issue"
2. **Include context:** "I finished issue #42, the email validation is working" vs "Close #42"
3. **Use natural language:** Claude understands conversational commands
4. **Combine operations:** "Create issue and start working on it"

### Common Patterns

**Starting your day:**
> "Show me all issues assigned to me that are in progress"

**Planning sprint:**
> "Show me all high-priority issues in the backlog"

**Completing work:**
> "I've finished issue #X. [description of what was done]"

**Creating related work:**
> "Create a subtask for issue #Y to handle [specific aspect]"

## More Examples

See [README.md](README.md) for detailed tool documentation and [INSTALLATION.md](INSTALLATION.md) for setup instructions.
