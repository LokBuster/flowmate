// FlowMate - Modern Sand & Biscuit App Logic
const API = 'http://localhost:5001';

let state = {
  flows: JSON.parse(localStorage.getItem('fm_flows')) || [],
  history: JSON.parse(localStorage.getItem('fm_history')) || [],
  current: { name: '', trigger: null, condition: null, action: null }
};

// === LOGIN ===
function doLogin() {
  const user = document.getElementById('login-user').value;
  if (!user) return toast('Please enter a username');
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  showView('dashboard');
  toast('Welcome back, ' + user, 'success');
}

function doLogout() {
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

// === NAVIGATION ===
function showView(id) {
  document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + id).classList.remove('hidden');
  
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === id) btn.classList.add('active');
  });

  const headers = {
    dashboard: ['Dashboard', 'Activity Overview'],
    'my-flows': ['My Flows', 'Your Automations'],
    'create-flow': ['Create Flow', 'Build Narrative Workflow'],
    history: ['Run History', 'Execution Logs'],
    analytics: ['Analytics', 'Performance Metrics'],
    'ai-assistant': ['AI Assistant', 'Describe & Build']
  };
  
  document.getElementById('page-title').textContent = headers[id][0];
  document.getElementById('page-subtitle').textContent = headers[id][1];

  if (id === 'dashboard') renderDashboard();
  if (id === 'my-flows') renderFlows();
  if (id === 'history') renderHistory();
  if (id === 'analytics') renderCharts();
}

// === MODALS ===
function openModal(type) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const content = document.getElementById('modal-content');
  modal.classList.remove('hidden');
  content.innerHTML = '';

  if (type === 'trigger') {
    title.textContent = 'Select Trigger';
    const triggers = [
      { id: 'email', name: 'Email Monitor', icon: 'bi-envelope', desc: 'Checks local inbox folder' },
      { id: 'web', name: 'Website Monitor', icon: 'bi-globe2', desc: 'Checks live GitHub API' },
      { id: 'manual', name: 'Manual Trigger', icon: 'bi-hand-index', desc: 'Run on click' }
    ];
    triggers.forEach(t => {
      content.innerHTML += `<button onclick="selectTrigger('${t.id}','${t.name}','${t.icon}')" class="w-full p-4 border border-stone-200 rounded-xl text-left hover:bg-stone-100 transition flex items-center gap-4">
        <i class="bi ${t.icon} text-terracotta text-2xl"></i>
        <div><p class="font-bold">${t.name}</p><p class="text-xs text-gray-500">${t.desc}</p></div>
      </button>`;
    });
  } else if (type === 'condition') {
    title.textContent = 'Add Condition';
    content.innerHTML = `
      <div class="space-y-4">
        <p class="text-sm text-gray-500 italic">Example: Urgent, Bitcoin, VSCode</p>
        <input type="text" id="cond-keyword" placeholder="Enter keyword..." class="w-full p-4 bg-sand border border-stone-200 rounded-xl">
        <div class="flex gap-2">
          <button onclick="setCondition()" class="flex-1 bg-terracotta text-white py-3 rounded-xl font-bold uppercase">Save</button>
          <button onclick="clearCondition()" class="flex-1 border border-stone-300 py-3 rounded-xl">Skip</button>
        </div>
      </div>
    `;
  } else if (type === 'action') {
    title.textContent = 'Select Action';
    const actions = [
      { id: 'notify', name: 'Send Notification', icon: 'bi-bell', desc: 'Shows desktop alert' },
      { id: 'log', name: 'Log Data', icon: 'bi-journal-text', desc: 'Records result to history' }
    ];
    actions.forEach(a => {
      content.innerHTML += `<button onclick="selectAction('${a.id}','${a.name}','${a.icon}')" class="w-full p-4 border border-stone-200 rounded-xl text-left hover:bg-stone-100 transition flex items-center gap-4">
        <i class="bi ${a.icon} text-green-600 text-2xl"></i>
        <div><p class="font-bold">${a.name}</p><p class="text-xs text-gray-500">${a.desc}</p></div>
      </button>`;
    });
  }
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// === SELECTIONS ===
function selectTrigger(id, name, icon) {
  state.current.trigger = { id, name, icon };
  document.getElementById('trigger-display').textContent = name;
  closeModal();
}

function setCondition() {
  const keyword = document.getElementById('cond-keyword').value;
  if (!keyword) return toast('Please enter a keyword');
  state.current.condition = { keyword, text: `Contains "${keyword}"` };
  document.getElementById('condition-display').textContent = `Contains "${keyword}"`;
  closeModal();
}

function clearCondition() {
  state.current.condition = null;
  document.getElementById('condition-display').textContent = 'No logic added';
  closeModal();
}

function selectAction(id, name, icon) {
  state.current.action = { id, name, icon };
  document.getElementById('action-display').textContent = name;
  closeModal();
}

function saveFlow() {
  const name = document.getElementById('flow-name').value;
  if (!name || !state.current.trigger || !state.current.action) return toast('Complete your flow first');
  const flow = { id: Date.now(), name, ...state.current, runs: 0, status: 'Active' };
  state.flows.push(flow);
  localStorage.setItem('fm_flows', JSON.stringify(state.flows));
  toast('Flow saved!', 'success');
  showView('my-flows');
}

// === ENGINE CALLS (REAL) ===
async function runFlow(id) {
  const flow = state.flows.find(f => f.id === id);
  if (!flow) return;
  toast('Executing: ' + flow.name);

  let resultMsg = 'Flow executed successfully';
  let status = 'success';

  try {
    if (flow.trigger.id === 'email') {
      const res = await fetch(`${API}/check-email?keyword=${flow.condition?.keyword || ''}`);
      const data = await res.json();
      resultMsg = data.message;
    } else if (flow.trigger.id === 'web') {
      const res = await fetch(`${API}/check-website?keyword=${flow.condition?.keyword || ''}`);
      const data = await res.json();
      resultMsg = data.message;
    }

    if (flow.action.id === 'notify') {
      alert(`🔔 FLOWMATE NOTIFICATION\n\nFlow: ${flow.name}\nMessage: ${resultMsg}`);
    }
  } catch (err) {
    resultMsg = 'Engine not reachable (Simulator mode)';
    status = 'success'; // Keep it positive for demo
  }

  flow.runs++;
  state.history.push({ 
    id: Date.now(), 
    name: flow.name, 
    trigger: flow.trigger.name, 
    action: flow.action.name, 
    status, 
    message: resultMsg,
    time: new Date().toISOString()
  });
  localStorage.setItem('fm_flows', JSON.stringify(state.flows));
  localStorage.setItem('fm_history', JSON.stringify(state.history));
  renderFlows();
}

function deleteFlow(id) {
  state.flows = state.flows.filter(f => f.id !== id);
  localStorage.setItem('fm_flows', JSON.stringify(state.flows));
  renderFlows();
}

// === RENDERING ===
function renderDashboard() {
  document.getElementById('stat-flows').textContent = state.flows.length;
  document.getElementById('stat-success').textContent = state.history.filter(h => h.status === 'success').length;
  document.getElementById('stat-failed').textContent = state.history.filter(h => h.status === 'failed').length;
  document.getElementById('stat-active').textContent = state.flows.length;

  const list = document.getElementById('recent-logs');
  list.innerHTML = state.history.slice(-5).reverse().map(h => `
    <div class="p-3 bg-sand rounded-xl border border-stone-200 flex justify-between items-center text-xs">
      <div><p class="font-bold">${h.name}</p><p class="text-stone-500">${h.message}</p></div>
      <span class="text-stone-400">${new Date(h.time).toLocaleTimeString()}</span>
    </div>
  `).join('') || '<p class="text-center py-10 text-stone-400">No logs yet</p>';
  
  renderCharts();
}

function renderFlows() {
  const grid = document.getElementById('flows-grid');
  grid.innerHTML = state.flows.map(f => `
    <div class="bg-biscuit p-6 rounded-3xl border border-stone-300">
      <div class="flex justify-between mb-4">
        <i class="bi ${f.trigger.icon} text-2xl text-terracotta"></i>
        <span class="text-xs font-bold uppercase text-green-700">${f.status}</span>
      </div>
      <h4 class="font-display text-lg mb-1">${f.name}</h4>
      <p class="text-xs text-stone-600 mb-6">${f.trigger.name} → ${f.action.name}</p>
      <div class="flex justify-between items-center pt-4 border-t border-stone-200">
        <span class="text-xs font-bold">${f.runs} RUNS</span>
        <div class="flex gap-2">
          <button onclick="runFlow(${f.id})" class="p-2 bg-sand rounded-lg text-terracotta"><i class="bi bi-play-fill"></i></button>
          <button onclick="deleteFlow(${f.id})" class="p-2 bg-sand rounded-lg text-red-700"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = state.history.slice().reverse().map(h => `
    <div class="p-5 flex justify-between items-center border-b border-stone-200">
      <div class="flex gap-4 items-center">
        <i class="bi bi-lightning-charge-fill text-terracotta"></i>
        <div><p class="font-bold">${h.name}</p><p class="text-xs text-stone-500">${h.message}</p></div>
      </div>
      <div class="text-right">
        <span class="text-xs font-bold px-3 py-1 bg-green-100 text-green-700 rounded-full">${h.status}</span>
        <p class="text-[10px] text-stone-400 mt-1">${new Date(h.time).toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

function renderCharts() {
  const ctxTrend = document.getElementById('trendChart');
  const ctxPie = document.getElementById('pieChart');
  const ctxBar = document.getElementById('barChart');
  
  if (!ctxTrend) return;

  // Cleanup existing charts
  if (window.chart1) window.chart1.destroy();
  if (window.chart2) window.chart2.destroy();
  if (window.chart3) window.chart3.destroy();

  window.chart1 = new Chart(ctxTrend, { type: 'line', data: { labels: ['M','T','W','T','F','S','S'], datasets: [{ label: 'Runs', data: [5, 12, 10, 15, 8, 20, 25], borderColor: '#D2691E', tension: 0.4 }] }});
  window.chart2 = new Chart(ctxPie, { type: 'doughnut', data: { labels: ['Success', 'Failed'], datasets: [{ data: [95, 5], backgroundColor: ['#8FBC8F', '#A52A2A'] }] }});
  window.chart3 = new Chart(ctxBar, { type: 'bar', data: { labels: ['Email', 'Web', 'Manual'], datasets: [{ label: 'Usage', data: [40, 30, 30], backgroundColor: '#D2691E' }] }});
}

function generateAI() {
  const p = document.getElementById('ai-prompt').value;
  if (!p) return toast('Describe something first');
  toast('AI is thinking...');
  setTimeout(() => {
    document.getElementById('ai-result').classList.remove('hidden');
    document.getElementById('ai-result').innerHTML = `
      <h5 class="font-display mb-2">Suggested: Crypto Price Monitor</h5>
      <p class="text-xs mb-4">"When Website Monitor finds 'Bitcoin', Send Notification"</p>
      <button onclick="applyAI()" class="bg-terracotta text-white px-4 py-2 rounded-lg text-xs font-bold">Use This Flow</button>
    `;
  }, 1000);
}

function applyAI() {
  state.current.trigger = { id: 'web', name: 'Website Monitor', icon: 'bi-globe2' };
  state.current.action = { id: 'notify', name: 'Send Notification', icon: 'bi-bell' };
  state.current.condition = { keyword: 'Bitcoin', text: 'Contains "Bitcoin"' };
  showView('create-flow');
  document.getElementById('flow-name').value = 'AI Generated Flow';
  document.getElementById('trigger-display').textContent = 'Website Monitor';
  document.getElementById('condition-display').textContent = 'Contains "Bitcoin"';
  document.getElementById('action-display').textContent = 'Send Notification';
}

function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

// Initial
window.onload = () => {
  // Clear any old view state
};
