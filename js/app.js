// FlowMate UI (Minimal) - integrates with Node backend + Python engine
// This file expects the HTML IDs used in index.html.

const API_BASE = 'http://localhost:3000/api';

let appState = {
  flows: [],
  history: [],
  currentFlow: { name: '', trigger: null, condition: null, action: null, type: 'custom', config: {} },
  aiSuggestion: null
};

// ------------------------------
// API helpers
// ------------------------------
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  return res.json();
}

// ------------------------------
// View management
// ------------------------------
function showView(viewName) {
  document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active', 'bg-indigo-600', 'text-white');
    item.classList.add('text-gray-700');
  });
  const activeItem = document.querySelector(`[data-view="${viewName}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
    activeItem.classList.remove('text-gray-700');
  }

  const titles = {
    dashboard: ['Dashboard', "Welcome back! Here's your automation overview."],
    'my-flows': ['My Flows', 'Manage and run your workflows.'],
    'create-flow': ['Create Flow', 'Build a new automation using When → If → Do.'],
    history: ['Run History', 'Track when your flows run and what they do.'],
    analytics: ['Analytics', 'Success/failure insights for your automations.'],
    'ai-assistant': ['AI Assistant', 'Generate flows using natural language.']
  };

  document.getElementById('page-title').textContent = titles[viewName]?.[0] || 'FlowMate';
  document.getElementById('page-subtitle').textContent = titles[viewName]?.[1] || '';

  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'my-flows') renderFlows();
  if (viewName === 'history') renderHistory();
  if (viewName === 'analytics') renderAnalytics();
  if (viewName === 'create-flow') resetFlowBuilder();
}

// ------------------------------
// Modals
// ------------------------------
function openTriggerModal() { document.getElementById('trigger-modal').classList.remove('hidden'); }
function openConditionModal() { document.getElementById('condition-modal').classList.remove('hidden'); }
function openActionModal() { document.getElementById('action-modal').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ------------------------------
// Builder selections
// ------------------------------
function selectTrigger(type, name, icon) {
  appState.currentFlow.trigger = { type, name, icon };
  document.getElementById('trigger-display').textContent = name;
  closeModal('trigger-modal');
  showToast(`Trigger selected: ${name}`, 'success');
}

function selectAction(type, name, icon) {
  appState.currentFlow.action = { type, name, icon };
  document.getElementById('action-display').textContent = name;
  closeModal('action-modal');
  showToast(`Action selected: ${name}`, 'success');
}

function saveCondition() {
  const value = document.getElementById('condition-value').value.trim();
  const operator = document.getElementById('condition-operator').value;
  const compare = document.getElementById('condition-compare').value.trim();
  if (!value || !compare) return showToast('Please complete the condition fields', 'error');

  const opText = { equals: 'equals', not_equals: 'does not equal', greater: 'is greater than', less: 'is less than', contains: 'contains' };
  const text = `${value} ${opText[operator]} ${compare}`;

  appState.currentFlow.condition = { value, operator, compare, text };
  document.getElementById('condition-display').textContent = text;
  closeModal('condition-modal');
  showToast('Condition added!', 'success');
}

function skipCondition() {
  appState.currentFlow.condition = null;
  document.getElementById('condition-display').textContent = 'No condition (always run)';
  closeModal('condition-modal');
}

function resetFlowBuilder() {
  appState.currentFlow = { name: '', trigger: null, condition: null, action: null, type: 'custom', config: {} };
  document.getElementById('flow-name').value = '';
  document.getElementById('trigger-display').textContent = 'Click to select trigger...';
  document.getElementById('condition-display').textContent = 'Add a condition...';
  document.getElementById('action-display').textContent = 'Click to select action...';
}

// ------------------------------
// Real templates (integrated)
// ------------------------------
async function createTemplate(template) {
  let flow;

  if (template === 'email_monitor') {
    flow = {
      name: 'Email Monitor (Inbox Folder)',
      type: 'email_monitor',
      trigger: { type: 'event', name: 'Event Trigger (Inbox folder)', icon: 'fas fa-bolt' },
      condition: { text: 'If subject/from matches', value: 'subject', operator: 'contains', compare: 'alert' },
      action: { type: 'log_data', name: 'Log Data', icon: 'fas fa-database' },
      status: 'active',
      config: {
        folder: 'inbox',
        matchFrom: '',
        matchSubject: 'alert'
      }
    };
  }

  if (template === 'data_pull') {
    flow = {
      name: 'Notification Data Pull (GitHub Repo)',
      type: 'data_pull',
      trigger: { type: 'scheduled', name: 'Scheduled (Hourly)', icon: 'fas fa-clock' },
      condition: null,
      action: { type: 'http_request', name: 'HTTP Request', icon: 'fas fa-globe' },
      status: 'active',
      config: {
        url: 'https://api.github.com/repos/nodejs/node',
        jsonPath: 'open_issues_count'
      }
    };
  }

  showToast('Creating template flow...', 'info');
  const result = await apiPost('/workflows', flow);
  if (!result.success) return showToast(result.error || 'Failed to create flow', 'error');

  await syncFromBackend();
  showToast('Template created!', 'success');
  showView('my-flows');
}

// ------------------------------
// Save custom flow
// ------------------------------
async function saveFlow() {
  const name = document.getElementById('flow-name').value.trim();
  if (!name) return showToast('Please enter a flow name', 'error');
  if (!appState.currentFlow.trigger) return showToast('Please select a trigger', 'error');
  if (!appState.currentFlow.action) return showToast('Please select an action', 'error');

  const flow = {
    name,
    type: 'custom',
    trigger: appState.currentFlow.trigger,
    condition: appState.currentFlow.condition,
    action: appState.currentFlow.action,
    status: 'active',
    config: {}
  };

  const result = await apiPost('/workflows', flow);
  if (!result.success) return showToast(result.error || 'Failed to save flow', 'error');

  await syncFromBackend();
  showToast('Flow saved successfully!', 'success');
  showView('my-flows');
}

async function runFlow(id) {
  showToast('Running flow...', 'info');
  const result = await apiPost(`/workflows/${id}/run`, {});
  if (!result.success) {
    showToast(result.error || 'Run failed', 'error');
  } else {
    showToast(result.data.message || 'Completed', result.data.status === 'failed' ? 'error' : 'success');
  }
  await syncFromBackend();
}

async function deleteFlow(id) {
  if (!confirm('Delete this flow?')) return;
  const result = await apiDelete(`/workflows/${id}`);
  if (!result.success) return showToast(result.error || 'Delete failed', 'error');
  await syncFromBackend();
  showToast('Flow deleted', 'success');
}

async function clearHistory() {
  if (!confirm('Clear all execution history?')) return;
  await apiDelete('/executions');
  await syncFromBackend();
  showToast('History cleared', 'success');
}

// ------------------------------
// Render
// ------------------------------
async function renderDashboard() {
  const statsRes = await apiGet('/analytics/stats');
  const stats = statsRes?.data || { totalFlows: 0, activeFlows: 0, successfulRuns: 0, failedRuns: 0 };

  document.getElementById('stat-total-flows').textContent = stats.totalFlows;
  document.getElementById('stat-successful').textContent = stats.successfulRuns;
  document.getElementById('stat-failed').textContent = stats.failedRuns;
  document.getElementById('stat-active').textContent = stats.activeFlows;

  const activityContainer = document.getElementById('recent-activity');

  // Integrated templates right inside dashboard
  const templateHtml = `
    <div class="p-4 bg-indigo-50 border-b border-indigo-100">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p class="text-sm font-bold text-indigo-900">Working Templates (Real Integrations)</p>
          <p class="text-xs text-indigo-700">These run via Node.js → Python engine (not a mock).</p>
        </div>
        <div class="flex gap-2">
          <button onclick="createTemplate('email_monitor')" class="px-3 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-100">Email Monitor</button>
          <button onclick="createTemplate('data_pull')" class="px-3 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-100">Data Pull</button>
        </div>
      </div>
    </div>
  `;

  const recent = appState.history.slice(0, 6);
  const historyHtml = recent.length
    ? recent.map(item => `
      <div class="p-4 flex items-center justify-between hover:bg-gray-50">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 ${item.status === 'success' ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center">
            <i class="fas ${item.status === 'success' ? 'fa-check text-green-600' : 'fa-times text-red-600'}"></i>
          </div>
          <div>
            <p class="font-medium text-gray-900">${item.flowName}</p>
            <p class="text-sm text-gray-500">${item.message || item.action}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs px-2 py-1 rounded-full ${item.status === 'success' ? 'status-success' : 'status-failed'}">${item.status}</span>
          <p class="text-xs text-gray-400 mt-1">${formatTime(item.timestamp)}</p>
        </div>
      </div>
    `).join('')
    : `<div class="p-6 text-center text-gray-500"><i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i><p>No recent activity. Create your first flow!</p></div>`;

  activityContainer.innerHTML = templateHtml + historyHtml;

  initExecutionChart();
  initStatusChart();
}

function renderFlows() {
  const container = document.getElementById('flows-grid');
  const empty = document.getElementById('empty-flows');

  if (!appState.flows.length) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = appState.flows.map(flow => `
    <div class="flow-card bg-white rounded-2xl p-6 border-2 border-gray-200 hover:shadow-lg transition">
      <div class="flex items-start justify-between mb-4">
        <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <i class="fas fa-project-diagram text-indigo-600 text-xl"></i>
        </div>
        <span class="text-xs px-2 py-1 rounded-full ${flow.status === 'active' ? 'status-success' : 'bg-gray-100 text-gray-600'}">${flow.status}</span>
      </div>
      <h4 class="font-bold text-gray-900 mb-2">${flow.name}</h4>
      <p class="text-sm text-gray-500 mb-2"><i class="${flow.trigger?.icon || 'fas fa-bolt'} mr-1"></i>${flow.trigger?.name || 'Trigger'} → ${flow.action?.name || 'Action'}</p>
      ${flow.type !== 'custom' ? `<p class="text-xs text-indigo-600 font-semibold mb-3">Template: ${flow.type}</p>` : ''}
      <div class="flex items-center justify-between pt-4 border-t border-gray-100">
        <span class="text-xs text-gray-400">${flow.runs || 0} runs</span>
        <div class="flex gap-2">
          <button onclick="runFlow('${flow.id}')" class="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-lg flex items-center justify-center text-green-600 transition"><i class="fas fa-play text-xs"></i></button>
          <button onclick="deleteFlow('${flow.id}')" class="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center text-red-600 transition"><i class="fas fa-trash text-xs"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!appState.history.length) {
    container.innerHTML = `<div class="p-8 text-center text-gray-500"><i class="fas fa-clock text-4xl mb-3 text-gray-300"></i><p>No execution history yet.</p></div>`;
    return;
  }

  container.innerHTML = appState.history.map(item => `
    <div class="p-4 flex items-center justify-between hover:bg-gray-50">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 ${item.status === 'success' ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center">
          <i class="fas ${item.status === 'success' ? 'fa-check text-green-600' : 'fa-times text-red-600'}"></i>
        </div>
        <div>
          <p class="font-medium text-gray-900">${item.flowName}</p>
          <p class="text-sm text-gray-500">${item.message || ''}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs px-3 py-1 rounded-full font-medium ${item.status === 'success' ? 'status-success' : 'status-failed'}">${item.status.toUpperCase()}</span>
        <p class="text-xs text-gray-400 mt-1">${formatTime(item.timestamp)}</p>
      </div>
    </div>
  `).join('');
}

function renderAnalytics() {
  initWeeklyChart();
  initSuccessRateChart();
  initHeatmapChart();
}

// ------------------------------
// AI (simple)
// ------------------------------
function generateWithAI() {
  const prompt = document.getElementById('ai-prompt').value.trim();
  if (!prompt) return showToast('Please describe what you want to automate', 'error');

  // Lightweight local intent (kept simple)
  const lower = prompt.toLowerCase();
  let trigger = { type: 'manual', name: 'Manual Trigger', icon: 'fas fa-hand-pointer' };
  let action = { type: 'log_data', name: 'Log Data', icon: 'fas fa-database' };
  let condition = null;

  if (lower.includes('hour') || lower.includes('daily') || lower.includes('every')) trigger = { type: 'scheduled', name: 'Scheduled (Hourly)', icon: 'fas fa-clock' };
  if (lower.includes('email')) action = { type: 'send_email', name: 'Send Email', icon: 'fas fa-envelope' };
  if (lower.includes('slack')) action = { type: 'slack_message', name: 'Send Slack Message', icon: 'fab fa-slack' };
  if (lower.includes('if') || lower.includes('only')) condition = { text: 'Condition detected', value: 'status', operator: 'equals', compare: 'active' };

  appState.aiSuggestion = { trigger, action, condition };
  displayAIResult(appState.aiSuggestion);
}

function displayAIResult(s) {
  document.getElementById('ai-flow-preview').innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
      <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center"><i class="${s.trigger.icon} text-white"></i></div>
      <div><p class="text-xs text-blue-600 font-bold uppercase">When</p><p class="font-medium text-gray-900">${s.trigger.name}</p></div>
    </div>
    ${s.condition ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
      <div class="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center"><i class="fas fa-code-branch text-white"></i></div>
      <div><p class="text-xs text-amber-600 font-bold uppercase">If</p><p class="font-medium text-gray-900">${s.condition.text}</p></div>
    </div>` : ''}
    <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center"><i class="${s.action.icon} text-white"></i></div>
      <div><p class="text-xs text-green-600 font-bold uppercase">Do</p><p class="font-medium text-gray-900">${s.action.name}</p></div>
    </div>
  `;
  document.getElementById('ai-result').classList.remove('hidden');
  showToast('AI generated a flow suggestion!', 'success');
}

function useAIFlow() {
  if (!appState.aiSuggestion) return;
  appState.currentFlow.trigger = appState.aiSuggestion.trigger;
  appState.currentFlow.action = appState.aiSuggestion.action;
  appState.currentFlow.condition = appState.aiSuggestion.condition;
  showView('create-flow');

  document.getElementById('trigger-display').textContent = appState.currentFlow.trigger.name;
  document.getElementById('condition-display').textContent = appState.currentFlow.condition?.text || 'No condition (always run)';
  document.getElementById('action-display').textContent = appState.currentFlow.action.name;
}

// ------------------------------
// Sync
// ------------------------------
async function syncFromBackend() {
  const flowsRes = await apiGet('/workflows');
  const histRes = await apiGet('/executions?limit=200');

  appState.flows = flowsRes?.data || [];
  appState.history = histRes?.data || [];

  // Re-render current view
  const visible = document.querySelector('.view-content:not(.hidden)')?.id || 'view-dashboard';
  const viewName = visible.replace('view-', '');
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'my-flows') renderFlows();
  if (viewName === 'history') renderHistory();
  if (viewName === 'analytics') renderAnalytics();
}

// ------------------------------
// Utilities
// ------------------------------
function formatTime(ts) { return new Date(ts).toLocaleString(); }

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  document.getElementById('toast-icon').className = 'fas ' + (
    type === 'success' ? 'fa-check-circle text-green-400' :
    type === 'error' ? 'fa-times-circle text-red-400' :
    'fa-info-circle text-blue-400'
  );
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ------------------------------
// Init
// ------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await syncFromBackend();
  showView('dashboard');
});
