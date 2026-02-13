#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import https from 'https';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createReadStream } from 'fs';
import { basename } from 'path';

/**
 * MCP Redmine Server
 *
 * Provides comprehensive Redmine API integration for Claude Code via Model Context Protocol.
 * Supports issue management, workflows, relations, status filtering, and Git integration.
 */

// Load .env from current working directory (where Claude is running)
const cwdEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(cwdEnvPath)) {
  console.error(`Loading .env from: ${cwdEnvPath}`);
  dotenv.config({ path: cwdEnvPath });
} else {
  console.error(`No .env file found in: ${process.cwd()}`);
  console.error('Using global environment variables or defaults');
}

// Default Redmine configuration (can be overridden via environment variables)
const REDMINE_CONFIG = {
  baseUrl: process.env.REDMINE_BASE_URL || 'https://3cad.tech',
  apiKey: process.env.REDMINE_API_KEY || '',
  projectId: parseInt(process.env.REDMINE_PROJECT_ID || '8'),
  projectIdentifier: process.env.REDMINE_PROJECT_IDENTIFIER || 'cad-tech'
};

/**
 * Make HTTP request to Redmine API
 */
function makeRedmineRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = `${REDMINE_CONFIG.baseUrl}${endpoint}`;
    const options = {
      method: method,
      headers: {
        'X-Redmine-API-Key': REDMINE_CONFIG.apiKey,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Get Redmine issue details
 */
async function getIssue(issueId) {
  const result = await makeRedmineRequest('GET', `/issues/${issueId}.json?include=journals,changesets,relations,children`);
  return result.issue;
}

/**
 * Upload file to Redmine
 * Returns upload token that can be used to attach file to issue
 */
async function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    // Get file info
    const fileStats = fs.statSync(filePath);
    const fileName = basename(filePath);

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    const url = `${REDMINE_CONFIG.baseUrl}/uploads.json`;
    const options = {
      method: 'POST',
      headers: {
        'X-Redmine-API-Key': REDMINE_CONFIG.apiKey,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Add filename to response
            parsedData.upload.filename = fileName;
            resolve(parsedData.upload);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(fileContent);
    req.end();
  });
}

/**
 * Create Redmine issue
 */
async function createIssue(title, description, options = {}) {
  const issueData = {
    issue: {
      project_id: options.projectId || REDMINE_CONFIG.projectId,
      tracker_id: options.trackerId || 2, // Default: Feature
      status_id: options.statusId || 1,    // Default: New
      priority_id: options.priorityId || 2, // Default: Normal
      subject: title,
      description: description
    }
  };

  if (options.parentId) {
    issueData.issue.parent_issue_id = options.parentId;
  }

  // Add file uploads if provided
  if (options.uploads && Array.isArray(options.uploads) && options.uploads.length > 0) {
    issueData.issue.uploads = options.uploads.map(upload => ({
      token: upload.token,
      filename: upload.filename,
      content_type: upload.content_type || 'application/octet-stream'
    }));
  }

  const result = await makeRedmineRequest('POST', '/issues.json', issueData);
  return result.issue;
}

/**
 * Add comment to issue
 */
async function addComment(issueId, comment, statusId = null, uploads = null) {
  const updateData = {
    issue: {
      notes: comment
    }
  };

  if (statusId) {
    updateData.issue.status_id = statusId;
  }

  // Add file uploads if provided
  if (uploads && Array.isArray(uploads) && uploads.length > 0) {
    updateData.issue.uploads = uploads.map(upload => ({
      token: upload.token,
      filename: upload.filename,
      content_type: upload.content_type || 'application/octet-stream'
    }));
  }

  await makeRedmineRequest('PUT', `/issues/${issueId}.json`, updateData);
  return true;
}

/**
 * Add attachments to existing issue
 */
async function addAttachments(issueId, filePaths) {
  // Upload all files and get tokens
  const uploads = [];
  const uploadResults = [];

  for (const filePath of filePaths) {
    try {
      const upload = await uploadFile(filePath);
      uploads.push(upload);
      uploadResults.push({
        filePath,
        status: 'success',
        token: upload.token,
        filename: upload.filename
      });
    } catch (error) {
      uploadResults.push({
        filePath,
        status: 'error',
        error: error.message
      });
    }
  }

  // If we have successful uploads, attach them to the issue
  if (uploads.length > 0) {
    await addComment(
      issueId,
      `Added ${uploads.length} file(s): ${uploads.map(u => u.filename).join(', ')}`,
      null,
      uploads
    );
  }

  return {
    success: uploads.length > 0,
    totalFiles: filePaths.length,
    successfulUploads: uploads.length,
    results: uploadResults
  };
}

/**
 * Get issues by status
 */
async function getIssuesByStatus(statusName, limit = 50, projectId = null) {
  // Get all available statuses
  const statusesResult = await makeRedmineRequest('GET', '/issue_statuses.json');
  const statuses = statusesResult.issue_statuses || [];

  const targetStatus = statuses.find(status =>
    status.name.toLowerCase() === statusName.toLowerCase() ||
    status.name.toLowerCase().includes(statusName.toLowerCase())
  );

  if (!targetStatus) {
    return {
      error: `Status "${statusName}" not found`,
      availableStatuses: statuses.map(s => s.name)
    };
  }

  let url = `/issues.json?status_id=${targetStatus.id}&limit=${limit}`;

  // If projectId is provided, filter by it; otherwise get issues from all projects
  if (projectId) {
    url += `&project_id=${projectId}`;
  }

  const result = await makeRedmineRequest('GET', url);

  return {
    status: targetStatus,
    issues: result.issues || [],
    totalCount: result.total_count || 0
  };
}

/**
 * Get related issues
 */
async function getRelatedIssues(issueId) {
  const result = await makeRedmineRequest('GET', `/issues/${issueId}/relations.json`);
  return result.relations || [];
}

/**
 * Get child issues
 */
async function getChildIssues(issueId) {
  const result = await makeRedmineRequest('GET', `/issues.json?parent_id=${issueId}&status_id=*`);
  return result.issues || [];
}

/**
 * Get full issue tree
 */
async function getIssueTree(issueId) {
  const issue = await getIssue(issueId);
  const relations = await getRelatedIssues(issueId);
  const children = await getChildIssues(issueId);

  const formattedRelations = [];
  for (const relation of relations) {
    const relatedIssueId = relation.issue_id === parseInt(issueId) ? relation.issue_to_id : relation.issue_id;
    try {
      const relatedIssue = await getIssue(relatedIssueId);
      formattedRelations.push({
        id: relatedIssue.id,
        subject: relatedIssue.subject,
        status: relatedIssue.status.name,
        relation_type: relation.relation_type
      });
    } catch (err) {
      // Skip if related issue cannot be fetched
    }
  }

  return {
    main: {
      id: issue.id,
      subject: issue.subject,
      description: issue.description,
      status: issue.status.name,
      priority: issue.priority.name,
      assigned_to: issue.assigned_to ? issue.assigned_to.name : 'Unassigned'
    },
    relations: formattedRelations,
    children: children.map(child => ({
      id: child.id,
      subject: child.subject,
      status: child.status.name,
      priority: child.priority.name
    }))
  };
}

/**
 * Create issue relation
 */
async function createRelation(issueId, relatedIssueId, relationType = 'relates') {
  const relationData = {
    relation: {
      issue_to_id: relatedIssueId,
      relation_type: relationType
    }
  };

  const result = await makeRedmineRequest('POST', `/issues/${issueId}/relations.json`, relationData);
  return result.relation;
}

/**
 * Execute git command
 */
function execGitCommand(command, cwd = process.cwd()) {
  try {
    const result = execSync(command, { encoding: 'utf-8', cwd });
    return result.trim();
  } catch (error) {
    throw new Error(`Git command failed: ${command}\n${error.message}`);
  }
}

/**
 * Start fix workflow
 */
async function startFixWorkflow(issueId, workingDir = process.cwd()) {
  const issue = await getIssue(issueId);

  const branchName = `fix/issue-${issueId}-${issue.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`;

  // Check git status
  const gitStatus = execGitCommand('git status --porcelain', workingDir);
  if (gitStatus) {
    return {
      error: 'Working directory not clean. Please commit or stash changes first.',
      uncommittedChanges: gitStatus
    };
  }

  // Create branch
  try {
    execGitCommand(`git checkout -b ${branchName}`, workingDir);
  } catch (error) {
    // Branch might exist, try to switch
    try {
      execGitCommand(`git checkout ${branchName}`, workingDir);
    } catch (switchError) {
      return {
        error: `Failed to create or switch to branch: ${error.message}`
      };
    }
  }

  // Update issue status to "In Progress" (status_id: 2)
  await addComment(issueId,
    `Started working on this issue.\n\nBranch: ${branchName}\nDeveloper: Claude Code via MCP`,
    2
  );

  return {
    issue,
    branchName,
    message: 'Fix workflow started successfully'
  };
}

/**
 * Complete fix workflow
 */
async function completeFixWorkflow(issueId, completionMessage, workingDir = process.cwd()) {
  const currentBranch = execGitCommand('git branch --show-current', workingDir);
  const gitStatus = execGitCommand('git status --porcelain', workingDir);

  if (gitStatus) {
    return {
      error: 'You have uncommitted changes. Please commit them first.',
      uncommittedChanges: gitStatus
    };
  }

  const recentCommits = execGitCommand('git log --oneline -3', workingDir);

  const finalComment = `Task completed.\n\n**Result:**\n${completionMessage}\n\n**Branch:** ${currentBranch}\n**Commits:**\n${recentCommits}\n\nReady for review and testing.`;

  await addComment(issueId, finalComment, 3); // Resolved status

  return {
    success: true,
    currentBranch,
    recentCommits,
    message: 'Fix workflow completed successfully'
  };
}

/**
 * Get all available statuses
 */
async function getAllStatuses() {
  const result = await makeRedmineRequest('GET', '/issue_statuses.json');
  return result.issue_statuses || [];
}

/**
 * Get all available projects
 */
async function getAllProjects(limit = 100) {
  const result = await makeRedmineRequest('GET', `/projects.json?limit=${limit}`);
  return {
    projects: result.projects || [],
    totalCount: result.total_count || 0
  };
}

/**
 * Get project details
 */
async function getProject(projectId) {
  const result = await makeRedmineRequest('GET', `/projects/${projectId}.json?include=trackers,issue_categories,enabled_modules`);
  return result.project;
}

/**
 * Get issues from specific project
 */
async function getProjectIssues(projectId, options = {}) {
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const statusId = options.statusId || '*';

  let url = `/issues.json?project_id=${projectId}&status_id=${statusId}&limit=${limit}&offset=${offset}`;

  if (options.trackerId) {
    url += `&tracker_id=${options.trackerId}`;
  }
  if (options.assignedToId) {
    url += `&assigned_to_id=${options.assignedToId}`;
  }

  const result = await makeRedmineRequest('GET', url);
  return {
    issues: result.issues || [],
    totalCount: result.total_count || 0,
    offset: offset,
    limit: limit
  };
}

/**
 * Get wiki page
 */
async function getWikiPage(projectId, pageTitle) {
  const encodedTitle = encodeURIComponent(pageTitle);
  const result = await makeRedmineRequest('GET', `/projects/${projectId}/wiki/${encodedTitle}.json?include=attachments`);
  return result.wiki_page;
}

/**
 * Get wiki pages index
 */
async function getWikiIndex(projectId) {
  const result = await makeRedmineRequest('GET', `/projects/${projectId}/wiki/index.json`);
  return result.wiki_pages || [];
}

/**
 * Create or update wiki page
 */
async function putWikiPage(projectId, pageTitle, text, options = {}) {
  const encodedTitle = encodeURIComponent(pageTitle);
  const wikiData = {
    wiki_page: {
      text: text
    }
  };

  if (options.comments) {
    wikiData.wiki_page.comments = options.comments;
  }
  if (options.parentTitle) {
    wikiData.wiki_page.parent_title = options.parentTitle;
  }

  const result = await makeRedmineRequest('PUT', `/projects/${projectId}/wiki/${encodedTitle}.json`, wikiData);
  return result;
}

/**
 * Delete wiki page
 */
async function deleteWikiPage(projectId, pageTitle) {
  const encodedTitle = encodeURIComponent(pageTitle);
  await makeRedmineRequest('DELETE', `/projects/${projectId}/wiki/${encodedTitle}.json`);
  return true;
}

// Create MCP server instance
const server = new Server(
  {
    name: 'mcp-redmine-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'redmine_get_issue',
        description: 'Get detailed information about a Redmine issue including description, status, priority, assigned user, and comments',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Redmine issue ID',
            },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'redmine_create_issue',
        description: 'Create a new Redmine issue with specified title and description. Can optionally attach files by providing file paths.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Issue title/subject',
            },
            description: {
              type: 'string',
              description: 'Issue description',
            },
            project_id: {
              type: 'string',
              description: 'Project ID or identifier to create issue in. If not specified, uses default project from config',
            },
            tracker_id: {
              type: 'number',
              description: 'Tracker ID (1=Bug, 2=Feature, 3=Support). Default: 2',
            },
            priority_id: {
              type: 'number',
              description: 'Priority ID (1=Low, 2=Normal, 3=High, 4=Urgent, 5=Immediate). Default: 2',
            },
            parent_id: {
              type: 'number',
              description: 'Parent issue ID (for creating subtasks)',
            },
            file_paths: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Optional: Array of absolute file paths to attach to the issue',
            },
          },
          required: ['title', 'description'],
        },
      },
      {
        name: 'redmine_add_comment',
        description: 'Add a comment to an existing Redmine issue and optionally change its status',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Redmine issue ID',
            },
            comment: {
              type: 'string',
              description: 'Comment text',
            },
            status_id: {
              type: 'number',
              description: 'Optional: New status ID (1=New, 2=In Progress, 3=Resolved, 5=Closed)',
            },
          },
          required: ['issue_id', 'comment'],
        },
      },
      {
        name: 'redmine_get_issues_by_status',
        description: 'Get all issues with a specific status (e.g., "New", "In Progress", "Resolved"). Can filter by project or get from all projects',
        inputSchema: {
          type: 'object',
          properties: {
            status_name: {
              type: 'string',
              description: 'Status name to filter by',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 50)',
            },
            project_id: {
              type: 'string',
              description: 'Project ID or identifier to filter by. If not specified, returns issues from all accessible projects',
            },
          },
          required: ['status_name'],
        },
      },
      {
        name: 'redmine_get_issue_tree',
        description: 'Get full issue tree including related issues and child/subtask issues',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Redmine issue ID',
            },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'redmine_create_relation',
        description: 'Create a relation between two issues (relates, blocks, duplicates, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'Source issue ID',
            },
            related_issue_id: {
              type: 'string',
              description: 'Target issue ID',
            },
            relation_type: {
              type: 'string',
              description: 'Relation type: relates, blocks, blocked, duplicates, precedes, follows. Default: relates',
            },
          },
          required: ['issue_id', 'related_issue_id'],
        },
      },
      {
        name: 'redmine_start_fix',
        description: 'Start fix workflow: creates git branch, updates issue status to "In Progress", and provides task analysis',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Redmine issue ID to start fixing',
            },
            working_directory: {
              type: 'string',
              description: 'Working directory for git operations (default: current directory)',
            },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'redmine_complete_fix',
        description: 'Complete fix workflow: updates issue status to "Resolved" and adds completion comment with commit details',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Redmine issue ID to complete',
            },
            completion_message: {
              type: 'string',
              description: 'Message describing what was done',
            },
            working_directory: {
              type: 'string',
              description: 'Working directory for git operations (default: current directory)',
            },
          },
          required: ['issue_id', 'completion_message'],
        },
      },
      {
        name: 'redmine_get_statuses',
        description: 'Get all available issue statuses in the Redmine project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'redmine_get_projects',
        description: 'Get list of all available Redmine projects that the API key has access to',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'redmine_get_project',
        description: 'Get detailed information about a specific Redmine project including trackers and enabled modules',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Redmine project ID or identifier (e.g., "my-project" or "5")',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'redmine_get_project_issues',
        description: 'Get issues from a specific project with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Redmine project ID or identifier',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            status_id: {
              type: 'string',
              description: 'Status ID to filter by (use "*" for all statuses, default: "*")',
            },
            tracker_id: {
              type: 'number',
              description: 'Tracker ID to filter by (1=Bug, 2=Feature, 3=Support)',
            },
            assigned_to_id: {
              type: 'number',
              description: 'User ID to filter by assignee',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'redmine_wiki_get_page',
        description: 'Get a wiki page content from a Redmine project by page title',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Redmine project ID or identifier (e.g., "my-project")',
            },
            title: {
              type: 'string',
              description: 'Wiki page title (e.g., "Wiki", "Getting_Started"). Use underscores for spaces.',
            },
          },
          required: ['project_id', 'title'],
        },
      },
      {
        name: 'redmine_wiki_get_index',
        description: 'Get a list of all wiki pages in a Redmine project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Redmine project ID or identifier',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'redmine_wiki_put_page',
        description: 'Create a new wiki page or update an existing one in a Redmine project. Uses PUT — creates if not exists, updates if exists.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Redmine project ID or identifier',
            },
            title: {
              type: 'string',
              description: 'Wiki page title. Use underscores for spaces (e.g., "My_Page").',
            },
            text: {
              type: 'string',
              description: 'Wiki page content in Redmine Textile markup',
            },
            comments: {
              type: 'string',
              description: 'Optional comment describing the change (shown in page history)',
            },
            parent_title: {
              type: 'string',
              description: 'Optional parent wiki page title (for building hierarchy)',
            },
          },
          required: ['project_id', 'title', 'text'],
        },
      },
      {
        name: 'redmine_wiki_delete_page',
        description: 'Delete a wiki page from a Redmine project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Redmine project ID or identifier',
            },
            title: {
              type: 'string',
              description: 'Wiki page title to delete',
            },
          },
          required: ['project_id', 'title'],
        },
      },
      {
        name: 'redmine_upload_file',
        description: 'Upload a file to Redmine and get an upload token. This token can be used later to attach the file to an issue.',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Absolute path to the file to upload',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'redmine_add_attachments',
        description: 'Add one or more file attachments to an existing Redmine issue. Files are uploaded and automatically attached.',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Redmine issue ID to attach files to',
            },
            file_paths: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of absolute file paths to attach to the issue',
            },
          },
          required: ['issue_id', 'file_paths'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'redmine_get_issue': {
        const issue = await getIssue(args.issue_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      }

      case 'redmine_create_issue': {
        let uploads = [];

        // Upload files if provided
        if (args.file_paths && Array.isArray(args.file_paths) && args.file_paths.length > 0) {
          for (const filePath of args.file_paths) {
            try {
              const upload = await uploadFile(filePath);
              uploads.push(upload);
            } catch (error) {
              console.error(`Failed to upload file ${filePath}:`, error.message);
            }
          }
        }

        const issue = await createIssue(args.title, args.description, {
          projectId: args.project_id,
          trackerId: args.tracker_id,
          priorityId: args.priority_id,
          parentId: args.parent_id,
          uploads: uploads.length > 0 ? uploads : undefined,
        });

        let responseText = `Issue created successfully!\n\nID: #${issue.id}\nTitle: ${issue.subject}\nProject: ${issue.project.name}\nURL: ${REDMINE_CONFIG.baseUrl}/issues/${issue.id}`;

        if (uploads.length > 0) {
          responseText += `\n\nAttached files (${uploads.length}):\n${uploads.map(u => `- ${u.filename}`).join('\n')}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'redmine_add_comment': {
        await addComment(args.issue_id, args.comment, args.status_id);
        return {
          content: [
            {
              type: 'text',
              text: `Comment added successfully to issue #${args.issue_id}`,
            },
          ],
        };
      }

      case 'redmine_get_issues_by_status': {
        const result = await getIssuesByStatus(args.status_name, args.limit || 50, args.project_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'redmine_get_issue_tree': {
        const tree = await getIssueTree(args.issue_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tree, null, 2),
            },
          ],
        };
      }

      case 'redmine_create_relation': {
        const relation = await createRelation(
          args.issue_id,
          args.related_issue_id,
          args.relation_type || 'relates'
        );
        return {
          content: [
            {
              type: 'text',
              text: `Relation created successfully!\n\nIssue #${args.issue_id} ${args.relation_type || 'relates'} #${args.related_issue_id}`,
            },
          ],
        };
      }

      case 'redmine_start_fix': {
        const result = await startFixWorkflow(
          args.issue_id,
          args.working_directory
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'redmine_complete_fix': {
        const result = await completeFixWorkflow(
          args.issue_id,
          args.completion_message,
          args.working_directory
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'redmine_get_statuses': {
        const statuses = await getAllStatuses();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(statuses, null, 2),
            },
          ],
        };
      }

      case 'redmine_get_projects': {
        const result = await getAllProjects(args.limit || 100);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'redmine_get_project': {
        const project = await getProject(args.project_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case 'redmine_get_project_issues': {
        const result = await getProjectIssues(args.project_id, {
          limit: args.limit,
          offset: args.offset,
          statusId: args.status_id,
          trackerId: args.tracker_id,
          assignedToId: args.assigned_to_id,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'redmine_wiki_get_page': {
        const wikiPage = await getWikiPage(args.project_id, args.title);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(wikiPage, null, 2),
            },
          ],
        };
      }

      case 'redmine_wiki_get_index': {
        const wikiPages = await getWikiIndex(args.project_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(wikiPages, null, 2),
            },
          ],
        };
      }

      case 'redmine_wiki_put_page': {
        await putWikiPage(args.project_id, args.title, args.text, {
          comments: args.comments,
          parentTitle: args.parent_title,
        });
        const pageUrl = `${REDMINE_CONFIG.baseUrl}/projects/${args.project_id}/wiki/${encodeURIComponent(args.title)}`;
        return {
          content: [
            {
              type: 'text',
              text: `Wiki page "${args.title}" saved successfully!\n\nURL: ${pageUrl}`,
            },
          ],
        };
      }

      case 'redmine_wiki_delete_page': {
        await deleteWikiPage(args.project_id, args.title);
        return {
          content: [
            {
              type: 'text',
              text: `Wiki page "${args.title}" deleted successfully from project "${args.project_id}"`,
            },
          ],
        };
      }

      case 'redmine_upload_file': {
        const upload = await uploadFile(args.file_path);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                filename: upload.filename,
                token: upload.token,
                size: upload.filesize,
                message: `File "${upload.filename}" uploaded successfully. Use this token to attach it to an issue.`
              }, null, 2),
            },
          ],
        };
      }

      case 'redmine_add_attachments': {
        const result = await addAttachments(args.issue_id, args.file_paths);

        let responseText = '';
        if (result.success) {
          responseText = `Successfully attached ${result.successfulUploads} of ${result.totalFiles} file(s) to issue #${args.issue_id}\n\n`;
          responseText += `Issue URL: ${REDMINE_CONFIG.baseUrl}/issues/${args.issue_id}\n\n`;
          responseText += 'Upload results:\n';
          result.results.forEach(r => {
            if (r.status === 'success') {
              responseText += `✓ ${r.filename} (${basename(r.filePath)})\n`;
            } else {
              responseText += `✗ ${basename(r.filePath)}: ${r.error}\n`;
            }
          });
        } else {
          responseText = `Failed to attach files to issue #${args.issue_id}\n\n`;
          responseText += 'Errors:\n';
          result.results.forEach(r => {
            if (r.status === 'error') {
              responseText += `✗ ${basename(r.filePath)}: ${r.error}\n`;
            }
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  // Validate configuration
  if (!REDMINE_CONFIG.apiKey) {
    console.error('ERROR: REDMINE_API_KEY environment variable is required');
    console.error('Please set it before starting the server:');
    console.error('  export REDMINE_API_KEY=your_api_key_here');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Redmine Server running on stdio');
  console.error(`Connected to: ${REDMINE_CONFIG.baseUrl}`);
  console.error(`Project: ${REDMINE_CONFIG.projectIdentifier}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
