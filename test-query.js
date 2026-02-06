#!/usr/bin/env node

import https from 'https';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const REDMINE_CONFIG = {
  baseUrl: process.env.REDMINE_BASE_URL || 'https://3cad.tech',
  apiKey: process.env.REDMINE_API_KEY || '',
  projectId: parseInt(process.env.REDMINE_PROJECT_ID || '8'),
};

/**
 * Make HTTP request to Redmine API
 */
function makeRedmineRequest(method, endpoint) {
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

    req.end();
  });
}

/**
 * Get all available statuses
 */
async function getStatuses() {
  const result = await makeRedmineRequest('GET', '/issue_statuses.json');
  return result.issue_statuses;
}

/**
 * Get issues by status name
 */
async function getIssuesByStatus(statusName, limit = 100) {
  // First get all statuses to find the ID
  const statuses = await getStatuses();
  const status = statuses.find(s =>
    s.name.toLowerCase() === statusName.toLowerCase() ||
    s.name.toLowerCase().includes(statusName.toLowerCase())
  );

  if (!status) {
    throw new Error(`Status "${statusName}" not found. Available statuses: ${statuses.map(s => s.name).join(', ')}`);
  }

  // Get issues with this status
  const result = await makeRedmineRequest(
    'GET',
    `/issues.json?project_id=${REDMINE_CONFIG.projectId}&status_id=${status.id}&limit=${limit}`
  );

  return {
    status: status,
    issues: result.issues,
    total: result.total_count
  };
}

// Main execution
(async () => {
  try {
    console.log('Подключение к Redmine:', REDMINE_CONFIG.baseUrl);
    console.log('Проект ID:', REDMINE_CONFIG.projectId);
    console.log('\nПолучение задач со статусом "Новые"...\n');

    const result = await getIssuesByStatus('Новая', 100);

    console.log(`Статус: ${result.status.name} (ID: ${result.status.id})`);
    console.log(`Найдено задач: ${result.total}\n`);

    if (result.issues.length === 0) {
      console.log('Задач с этим статусом не найдено.');
    } else {
      console.log('Список задач:');
      console.log('─'.repeat(80));

      result.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [#${issue.id}] ${issue.subject}`);
        console.log(`   Трекер: ${issue.tracker.name}`);
        console.log(`   Приоритет: ${issue.priority.name}`);
        console.log(`   Автор: ${issue.author.name}`);
        if (issue.assigned_to) {
          console.log(`   Назначена: ${issue.assigned_to.name}`);
        }
        console.log(`   Создана: ${new Date(issue.created_on).toLocaleString('ru-RU')}`);
        console.log(`   Обновлена: ${new Date(issue.updated_on).toLocaleString('ru-RU')}`);
        if (issue.description) {
          const shortDesc = issue.description.substring(0, 100);
          console.log(`   Описание: ${shortDesc}${issue.description.length > 100 ? '...' : ''}`);
        }
      });

      console.log('\n' + '─'.repeat(80));
    }

  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
})();
