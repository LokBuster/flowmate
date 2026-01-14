/**
 * FlowMate Backend Server (Minimal)
 * - Stores workflows and executions in-memory (optionally persists later)
 * - Runs workflows by calling the Python Engine over HTTP
 *
 * Why minimal?
 * - 1-week deadline
 * - Avoid DB setup friction
 * - Still "real" because it executes real integrations via python/engine.py
 *
 * Start:
 *   cd backend
 *   npm install
 *   npm start
 *
 * Requires Python engine running:
 *   cd python
 *   pip install -r requirements.txt
 *   python engine.py
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// NOTE (Windows fix): using 127.0.0.1 avoids IPv6/localhost resolution issues where Node may prefer ::1
// while the Python engine is bound to IPv4 (0.0.0.0).
const PY_ENGINE_URL = process.env.PY_ENGINE_URL || 'http://127.0.0.1:5001';

app.use(cors());
app.use(express.json());

// ------------------------------
// In-memory store (minimal)
// ------------------------------
const store = {
  workflows: [],
  executions: []
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ------------------------------
// Helpers
// ------------------------------
async function callPythonEngine(flow) {
  const res = await fetch(`${PY_ENGINE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flow })
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error || data?.message || 'Python engine error';
    throw new Error(msg);
  }
  return data;
}

// ------------------------------
// API
// ------------------------------
app.get('/api/health', async (req, res) => {
  let engine = 'unknown';
  try {
    const r = await fetch(`${PY_ENGINE_URL}/health`);
    engine = r.ok ? 'connected' : 'disconnected';
  } catch {
    engine = 'disconnected';
  }

  res.json({
    status: 'OK',
    service: 'FlowMate API',
    timestamp: new Date().toISOString(),
    pythonEngine: engine
  });
});

// Workflows
app.get('/api/workflows', (req, res) => {
  res.json({ success: true, data: store.workflows.slice().reverse() });
});

app.post('/api/workflows', (req, res) => {
  const flow = req.body;
  if (!flow?.name || !flow?.trigger || !flow?.action) {
    return res.status(400).json({ success: false, error: 'Missing required fields (name, trigger, action)' });
  }

  const created = {
    ...flow,
    id: uid(),
    status: flow.status || 'active',
    runs: flow.runs || 0,
    lastRun: flow.lastRun || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.workflows.push(created);
  res.status(201).json({ success: true, data: created });
});

app.delete('/api/workflows/:id', (req, res) => {
  const before = store.workflows.length;
  store.workflows = store.workflows.filter(w => w.id !== req.params.id);
  const after = store.workflows.length;
  if (after === before) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ success: true, message: 'Workflow deleted' });
});

// Run workflow (real execution via python engine)
app.post('/api/workflows/:id/run', async (req, res) => {
  const wf = store.workflows.find(w => w.id === req.params.id);
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });

  const start = Date.now();
  try {
    const result = await callPythonEngine({
      name: wf.name,
      type: wf.type || 'custom',
      config: wf.config || {},
      trigger: wf.trigger,
      condition: wf.condition,
      action: wf.action
    });

    wf.runs = (wf.runs || 0) + 1;
    wf.lastRun = new Date().toISOString();
    wf.updatedAt = new Date().toISOString();

    const duration = Date.now() - start;

    const execution = {
      id: uid(),
      workflowId: wf.id,
      flowName: wf.name,
      trigger: wf.trigger?.name || 'Trigger',
      action: wf.action?.name || 'Action',
      status: result.status || 'success',
      message: result.message || 'Executed',
      duration,
      timestamp: new Date().toISOString(),
      engineResult: result.result || null
    };

    store.executions.push(execution);

    return res.json({ success: true, data: execution });
  } catch (e) {
    const duration = Date.now() - start;
    const execution = {
      id: uid(),
      workflowId: wf.id,
      flowName: wf.name,
      trigger: wf.trigger?.name || 'Trigger',
      action: wf.action?.name || 'Action',
      status: 'failed',
      message: e.message || 'Execution failed',
      duration,
      timestamp: new Date().toISOString(),
      engineResult: null
    };
    store.executions.push(execution);
    return res.status(500).json({ success: false, data: execution, error: execution.message });
  }
});

// Executions
app.get('/api/executions', (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  res.json({ success: true, data: store.executions.slice().reverse().slice(0, limit) });
});

app.delete('/api/executions', (req, res) => {
  store.executions = [];
  res.json({ success: true, message: 'Execution history cleared' });
});

// Analytics
app.get('/api/analytics/stats', (req, res) => {
  const totalFlows = store.workflows.length;
  const activeFlows = store.workflows.filter(w => w.status === 'active').length;
  const successfulRuns = store.executions.filter(e => e.status === 'success').length;
  const failedRuns = store.executions.filter(e => e.status === 'failed').length;
  const totalRuns = successfulRuns + failedRuns;

  res.json({
    success: true,
    data: {
      totalFlows,
      activeFlows,
      successfulRuns,
      failedRuns,
      successRate: totalRuns ? ((successfulRuns / totalRuns) * 100).toFixed(1) : '100.0'
    }
  });
});

// ------------------------------
// Start
// ------------------------------
app.listen(PORT, () => {
  console.log(`\nFlowMate API running on http://localhost:${PORT}`);
  console.log(`Python Engine expected at ${PY_ENGINE_URL}`);
  console.log(`Health check: http://localhost:${PORT}/api/health\n`);
});
