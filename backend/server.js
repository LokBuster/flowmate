/**
 * FlowMate Backend Server
 * Node.js + Express API for workflow automation
 * 
 * Technologies: Node.js, Express, MongoDB
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Serve frontend

// ==========================================
// MONGODB CONNECTION
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/flowmate';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ==========================================
// SCHEMAS & MODELS
// ==========================================

// Workflow Schema
const workflowSchema = new mongoose.Schema({
    name: { type: String, required: true },
    trigger: {
        type: { type: String, required: true },
        name: String,
        icon: String,
        config: Object
    },
    condition: {
        value: String,
        operator: String,
        compare: String,
        text: String
    },
    action: {
        type: { type: String, required: true },
        name: String,
        icon: String,
        config: Object
    },
    status: { type: String, default: 'active' },
    runs: { type: Number, default: 0 },
    lastRun: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Workflow = mongoose.model('Workflow', workflowSchema);

// Execution History Schema
const executionSchema = new mongoose.Schema({
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
    flowName: String,
    trigger: String,
    action: String,
    status: { type: String, enum: ['success', 'failed', 'running'] },
    message: String,
    duration: Number,
    timestamp: { type: Date, default: Date.now }
});

const Execution = mongoose.model('Execution', executionSchema);

// ==========================================
// API ROUTES - WORKFLOWS
// ==========================================

// GET all workflows
app.get('/api/workflows', async (req, res) => {
    try {
        const workflows = await Workflow.find().sort({ createdAt: -1 });
        res.json({ success: true, data: workflows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single workflow
app.get('/api/workflows/:id', async (req, res) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }
        res.json({ success: true, data: workflow });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CREATE workflow
app.post('/api/workflows', async (req, res) => {
    try {
        const workflow = new Workflow(req.body);
        await workflow.save();
        res.status(201).json({ success: true, data: workflow });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// UPDATE workflow
app.put('/api/workflows/:id', async (req, res) => {
    try {
        const workflow = await Workflow.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }
        res.json({ success: true, data: workflow });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE workflow
app.delete('/api/workflows/:id', async (req, res) => {
    try {
        const workflow = await Workflow.findByIdAndDelete(req.params.id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }
        res.json({ success: true, message: 'Workflow deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// RUN workflow
app.post('/api/workflows/:id/run', async (req, res) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }

        // Simulate workflow execution
        const startTime = Date.now();
        const success = Math.random() > 0.15; // 85% success rate simulation
        const duration = Math.floor(500 + Math.random() * 2000);

        // Update workflow stats
        workflow.runs += 1;
        workflow.lastRun = new Date();
        await workflow.save();

        // Log execution
        const execution = new Execution({
            workflowId: workflow._id,
            flowName: workflow.name,
            trigger: workflow.trigger.name,
            action: workflow.action.name,
            status: success ? 'success' : 'failed',
            message: success ? 'Workflow executed successfully' : 'Workflow execution failed',
            duration: duration
        });
        await execution.save();

        // Simulate delay
        setTimeout(() => {
            res.json({
                success: true,
                data: {
                    workflowId: workflow._id,
                    status: success ? 'success' : 'failed',
                    duration: duration,
                    message: success ? 'Workflow executed successfully' : 'Workflow execution failed'
                }
            });
        }, duration);

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// API ROUTES - EXECUTIONS (HISTORY)
// ==========================================

// GET all executions
app.get('/api/executions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const executions = await Execution.find()
            .sort({ timestamp: -1 })
            .limit(limit);
        res.json({ success: true, data: executions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET executions for specific workflow
app.get('/api/workflows/:id/executions', async (req, res) => {
    try {
        const executions = await Execution.find({ workflowId: req.params.id })
            .sort({ timestamp: -1 });
        res.json({ success: true, data: executions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE all executions (clear history)
app.delete('/api/executions', async (req, res) => {
    try {
        await Execution.deleteMany({});
        res.json({ success: true, message: 'Execution history cleared' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// API ROUTES - ANALYTICS
// ==========================================

// GET dashboard stats
app.get('/api/analytics/stats', async (req, res) => {
    try {
        const totalFlows = await Workflow.countDocuments();
        const activeFlows = await Workflow.countDocuments({ status: 'active' });
        const successfulRuns = await Execution.countDocuments({ status: 'success' });
        const failedRuns = await Execution.countDocuments({ status: 'failed' });

        res.json({
            success: true,
            data: {
                totalFlows,
                activeFlows,
                successfulRuns,
                failedRuns,
                successRate: successfulRuns + failedRuns > 0 
                    ? ((successfulRuns / (successfulRuns + failedRuns)) * 100).toFixed(1)
                    : 100
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET weekly execution data
app.get('/api/analytics/weekly', async (req, res) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const executions = await Execution.find({
            timestamp: { $gte: oneWeekAgo }
        });

        // Group by day
        const dailyData = {};
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        executions.forEach(exec => {
            const day = days[new Date(exec.timestamp).getDay()];
            if (!dailyData[day]) {
                dailyData[day] = { success: 0, failed: 0 };
            }
            if (exec.status === 'success') {
                dailyData[day].success++;
            } else {
                dailyData[day].failed++;
            }
        });

        res.json({ success: true, data: dailyData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'FlowMate API',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║         FlowMate Backend Server           ║
    ╠═══════════════════════════════════════════╣
    ║  🚀 Server running on port ${PORT}            ║
    ║  📦 MongoDB: ${MONGODB_URI}                   
    ║  🔗 API: http://localhost:${PORT}/api         ║
    ╚═══════════════════════════════════════════╝
    `);
});

module.exports = app;
