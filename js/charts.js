// Chart.js visualizations

function initExecutionChart() {
  const ctx = document.getElementById('executionChart');
  if (!ctx) return;
  if (ctx.chartInstance) ctx.chartInstance.destroy();

  ctx.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Successful',
          data: [12, 19, 15, 25, 22, 10, 8],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Failed',
          data: [2, 1, 3, 2, 1, 0, 1],
          borderColor: '#ef4444',
          borderDash: [5, 5],
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function initStatusChart() {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  if (ctx.chartInstance) ctx.chartInstance.destroy();

  const success = (appState.history || []).filter(h => h.status === 'success').length || 1;
  const failed = (appState.history || []).filter(h => h.status === 'failed').length || 0;

  ctx.chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Successful', 'Failed'],
      datasets: [{ data: [success, failed], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      cutout: '70%'
    }
  });
}

function initWeeklyChart() {
  const ctx = document.getElementById('weeklyChart');
  if (!ctx) return;
  if (ctx.chartInstance) ctx.chartInstance.destroy();

  ctx.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{ label: 'Executions', data: [65, 89, 120, 95], backgroundColor: '#6366f1', borderRadius: 8 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
    }
  });
}

function initSuccessRateChart() {
  const ctx = document.getElementById('successRateChart');
  if (!ctx) return;
  if (ctx.chartInstance) ctx.chartInstance.destroy();

  const flows = (appState.flows || []).slice(0, 5);
  const labels = flows.length ? flows.map(f => f.name) : ['No flows yet'];
  const rates = flows.length ? flows.map(() => Math.floor(85 + Math.random() * 15)) : [0];

  ctx.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Success Rate %', data: rates, backgroundColor: '#22c55e', borderRadius: 8 }] },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function initHeatmapChart() {
  const ctx = document.getElementById('heatmapChart');
  if (!ctx) return;
  if (ctx.chartInstance) ctx.chartInstance.destroy();

  ctx.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'],
      datasets: [{ label: 'Executions', data: [5, 2, 8, 45, 38, 52, 28, 15], backgroundColor: '#8b5cf6', borderRadius: 4 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
    }
  });
}
