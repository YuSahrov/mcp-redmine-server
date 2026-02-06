#!/usr/bin/env node

import dotenv from 'dotenv';
import https from 'https';

// Load environment variables
dotenv.config();

const REDMINE_CONFIG = {
  baseUrl: process.env.REDMINE_BASE_URL || 'https://3cad.tech',
  apiKey: process.env.REDMINE_API_KEY || '',
  projectId: parseInt(process.env.REDMINE_PROJECT_ID || '4'),
};

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

async function testTools() {
  console.log('='.repeat(80));
  console.log('MCP REDMINE SERVER - ТЕСТИРОВАНИЕ ИНСТРУМЕНТОВ');
  console.log('='.repeat(80));
  console.log(`\nПодключение: ${REDMINE_CONFIG.baseUrl}`);
  console.log(`Проект ID: ${REDMINE_CONFIG.projectId}`);
  console.log(`API Key: ${REDMINE_CONFIG.apiKey ? '✓ Установлен' : '✗ Не установлен'}`);
  console.log('\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Get statuses
  try {
    console.log('📋 Тест 1: redmine_get_statuses');
    const statusesResult = await makeRedmineRequest('GET', '/issue_statuses.json');
    const statuses = statusesResult.issue_statuses || [];
    console.log(`   ✓ Успешно! Найдено статусов: ${statuses.length}`);
    statuses.forEach(s => console.log(`     - ${s.name} (ID: ${s.id})`));
    results.passed++;
    results.tests.push({ name: 'Get Statuses', status: 'PASS' });
  } catch (error) {
    console.log(`   ✗ Ошибка: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Get Statuses', status: 'FAIL', error: error.message });
  }

  console.log('\n');

  // Test 2: Get issues by status
  try {
    console.log('📋 Тест 2: redmine_get_issues_by_status (статус "Новая")');
    const issuesResult = await makeRedmineRequest('GET',
      `/issues.json?status_id=1&limit=5&project_id=${REDMINE_CONFIG.projectId}`);
    const issues = issuesResult.issues || [];
    console.log(`   ✓ Успешно! Найдено задач: ${issuesResult.total_count}`);
    if (issues.length > 0) {
      console.log(`   Примеры задач:`);
      issues.slice(0, 3).forEach(issue => {
        console.log(`     - #${issue.id}: ${issue.subject}`);
      });
    }
    results.passed++;
    results.tests.push({ name: 'Get Issues by Status', status: 'PASS' });
  } catch (error) {
    console.log(`   ✗ Ошибка: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Get Issues by Status', status: 'FAIL', error: error.message });
  }

  console.log('\n');

  // Test 3: Get specific issue (if exists)
  try {
    console.log('📋 Тест 3: redmine_get_issue (задача #119)');
    const issueResult = await makeRedmineRequest('GET',
      '/issues/119.json?include=journals,changesets,relations,children');
    const issue = issueResult.issue;
    console.log(`   ✓ Успешно!`);
    console.log(`     ID: #${issue.id}`);
    console.log(`     Тема: ${issue.subject}`);
    console.log(`     Статус: ${issue.status.name}`);
    console.log(`     Приоритет: ${issue.priority.name}`);
    console.log(`     Трекер: ${issue.tracker.name}`);
    if (issue.assigned_to) {
      console.log(`     Назначена: ${issue.assigned_to.name}`);
    }
    console.log(`     Комментариев: ${issue.journals ? issue.journals.length : 0}`);
    results.passed++;
    results.tests.push({ name: 'Get Issue', status: 'PASS' });
  } catch (error) {
    console.log(`   ✗ Ошибка: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Get Issue', status: 'FAIL', error: error.message });
  }

  console.log('\n');

  // Test 4: Get issue tree
  try {
    console.log('📋 Тест 4: redmine_get_issue_tree (задача #119)');
    const relationsResult = await makeRedmineRequest('GET', '/issues/119/relations.json');
    const childrenResult = await makeRedmineRequest('GET', '/issues.json?parent_id=119&status_id=*');
    const relations = relationsResult.relations || [];
    const children = childrenResult.issues || [];
    console.log(`   ✓ Успешно!`);
    console.log(`     Связанных задач: ${relations.length}`);
    console.log(`     Подзадач: ${children.length}`);
    results.passed++;
    results.tests.push({ name: 'Get Issue Tree', status: 'PASS' });
  } catch (error) {
    console.log(`   ✗ Ошибка: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Get Issue Tree', status: 'FAIL', error: error.message });
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(80));
  console.log(`✓ Успешно: ${results.passed}`);
  console.log(`✗ Провалено: ${results.failed}`);
  console.log(`Всего тестов: ${results.passed + results.failed}`);
  console.log('\n');

  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`  Ошибка: ${test.error}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('ДОСТУПНЫЕ MCP ИНСТРУМЕНТЫ:');
  console.log('='.repeat(80));
  console.log('1. redmine_get_issue - Получить задачу');
  console.log('2. redmine_create_issue - Создать задачу');
  console.log('3. redmine_add_comment - Добавить комментарий');
  console.log('4. redmine_get_issues_by_status - Получить задачи по статусу');
  console.log('5. redmine_get_issue_tree - Получить дерево задачи');
  console.log('6. redmine_create_relation - Создать связь между задачами');
  console.log('7. redmine_start_fix - Начать работу над задачей (Git + статус)');
  console.log('8. redmine_complete_fix - Завершить работу (Git + статус)');
  console.log('9. redmine_get_statuses - Получить все статусы');
  console.log('='.repeat(80));

  if (results.failed > 0) {
    process.exit(1);
  }
}

testTools().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});
