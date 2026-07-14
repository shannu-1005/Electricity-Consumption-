/**
 * dashboard.js — Renders 6 interactive Chart.js visualizations
 * for the India Electricity Consumption Dashboard
 */

// ─── Color palette ─────────────────────────────────────────────────────────
const COLORS = {
  cyan:    '#00d4ff',
  blue:    '#3d7fff',
  purple:  '#8b5cf6',
  green:   '#10e88a',
  orange:  '#ff7c3b',
  red:     '#ff4757',
  yellow:  '#ffd32a',
  teal:    '#00b4d8',
};

const REGION_COLORS = {
  'Northern':    COLORS.cyan,
  'Southern':    COLORS.green,
  'Eastern':     COLORS.purple,
  'Western':     COLORS.orange,
  'Northeastern':COLORS.yellow,
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Chart.js global defaults ────────────────────────────────────────────────
Chart.defaults.color = '#8b9ec7';
Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;

function chartDefaults(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        labels: { color: '#8b9ec7', usePointStyle: true, pointStyleWidth: 8, padding: 14 }
      },
      tooltip: {
        backgroundColor: 'rgba(13,17,23,0.95)',
        borderColor: 'rgba(0,212,255,0.3)',
        borderWidth: 1,
        titleColor: '#f0f6ff',
        bodyColor: '#8b9ec7',
        padding: 10,
        cornerRadius: 8,
      }
    },
    ...extra,
  };
}

// ─── Active chart instances ──────────────────────────────────────────────────
const charts = {};

// Cache for raw API data
let rawTrends = [], rawRegions = [], rawLockdown = [], rawHeatmap = [];
let filtersApplied = { region: '', state: '', year: '', month: '' };

// ─── Utility: create gradient ────────────────────────────────────────────────
function makeGradient(ctx, color1, color2, h = 200) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color1);
  g.addColorStop(1, color2);
  return g;
}

// ─── CHART 1: National Trends Line Chart ────────────────────────────────────
function renderTrends(data) {
  const y2019 = data.filter(d => d.year === 2019);
  const y2020 = data.filter(d => d.year === 2020);

  const ctx = document.getElementById('chart_trends');
  if (!ctx) return;

  if (charts.trends) charts.trends.destroy();

  const gradient2019 = makeGradient(ctx.getContext('2d'), COLORS.cyan + '60', COLORS.cyan + '00', 280);
  const gradient2020 = makeGradient(ctx.getContext('2d'), COLORS.orange + '60', COLORS.orange + '00', 280);

  charts.trends = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: '2019 Consumption (MU)',
          data: y2019.map(d => d.total_mu),
          borderColor: COLORS.cyan,
          backgroundColor: gradient2019,
          fill: true, tension: 0.4,
          pointBackgroundColor: COLORS.cyan,
          pointRadius: 4, pointHoverRadius: 7,
          borderWidth: 2.5,
        },
        {
          label: '2020 Consumption (MU)',
          data: y2020.map(d => d.total_mu),
          borderColor: COLORS.orange,
          backgroundColor: gradient2020,
          fill: true, tension: 0.4,
          pointBackgroundColor: COLORS.orange,
          pointRadius: 4, pointHoverRadius: 7,
          borderWidth: 2.5,
        }
      ]
    },
    options: chartDefaults({
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
          title: { display: true, text: 'Million Units (MU)', color: '#4a5b7a' }
        }
      },
      plugins: {
        ...chartDefaults().plugins,
        annotation: {}
      }
    })
  });
}

// ─── CHART 5: COVID Area Chart ───────────────────────────────────────────────
function renderCovidArea(data) {
  const y2019 = data.filter(d => d.year === 2019);
  const y2020 = data.filter(d => d.year === 2020);

  // Deviation = 2020 - 2019
  const deviation = y2020.map((d, i) => Math.round(d.total_mu - y2019[i]?.total_mu || 0));

  const ctx = document.getElementById('chart_covid');
  if (!ctx) return;
  if (charts.covid) charts.covid.destroy();

  const ctxEl = ctx.getContext('2d');
  const gradPos = makeGradient(ctxEl, COLORS.green + '70', COLORS.green + '10', 240);
  const gradNeg = makeGradient(ctxEl, COLORS.red + '80', COLORS.red + '10', 240);

  charts.covid = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [{
        label: 'MU Deviation vs 2019',
        data: deviation,
        backgroundColor: deviation.map(v => v >= 0 ? COLORS.green + 'aa' : COLORS.red + 'aa'),
        borderColor: deviation.map(v => v >= 0 ? COLORS.green : COLORS.red),
        borderWidth: 1.5,
        borderRadius: 4,
      }]
    },
    options: chartDefaults({
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
          title: { display: true, text: 'MU Difference (2020 − 2019)', color: '#4a5b7a' }
        }
      }
    })
  });
}

// ─── CHART 2: Regional Grouped Bar ──────────────────────────────────────────
function renderRegions(data) {
  const regions = [...new Set(data.map(d => d.region))].sort();

  const by2019 = Object.fromEntries(regions.map(r => [r, data.find(d => d.region === r && d.year === 2019)?.total_mu || 0]));
  const by2020 = Object.fromEntries(regions.map(r => [r, data.find(d => d.region === r && d.year === 2020)?.total_mu || 0]));

  const ctx = document.getElementById('chart_regions');
  if (!ctx) return;
  if (charts.regions) charts.regions.destroy();

  charts.regions = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: regions,
      datasets: [
        {
          label: '2019',
          data: regions.map(r => by2019[r]),
          backgroundColor: regions.map(r => REGION_COLORS[r] + '99'),
          borderColor: regions.map(r => REGION_COLORS[r]),
          borderWidth: 1.5, borderRadius: 6,
        },
        {
          label: '2020',
          data: regions.map(r => by2020[r]),
          backgroundColor: regions.map(r => REGION_COLORS[r] + '55'),
          borderColor: regions.map(r => REGION_COLORS[r]),
          borderWidth: 1.5, borderRadius: 6, borderDash: [4,2],
        }
      ]
    },
    options: chartDefaults({
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b9ec7' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
          title: { display: true, text: 'Total MU', color: '#4a5b7a' }
        }
      }
    })
  });

  // Build legend
  const legend = document.getElementById('regionLegend');
  if (legend) {
    legend.innerHTML = regions.map(r =>
      `<div class="legend-item">
        <div class="legend-dot" style="background:${REGION_COLORS[r]}"></div>
        <span>${r}</span>
      </div>`
    ).join('');
  }
}

// ─── CHART 3: Regional Donut ─────────────────────────────────────────────────
function renderDonut(data) {
  const data2020 = data.filter(d => d.year === 2020);
  const regions = data2020.map(d => d.region);
  const values  = data2020.map(d => d.total_mu);

  const ctx = document.getElementById('chart_donut');
  if (!ctx) return;
  if (charts.donut) charts.donut.destroy();

  charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: regions,
      datasets: [{
        data: values,
        backgroundColor: regions.map(r => REGION_COLORS[r] + 'cc'),
        borderColor: regions.map(r => REGION_COLORS[r]),
        borderWidth: 2,
        hoverOffset: 10,
      }]
    },
    options: {
      ...chartDefaults(),
      cutout: '62%',
      plugins: {
        ...chartDefaults().plugins,
        legend: {
          position: 'right',
          labels: { color: '#8b9ec7', usePointStyle: true, pointStyleWidth: 10, padding: 12 }
        },
        tooltip: {
          ...chartDefaults().plugins.tooltip,
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${ctx.parsed.toLocaleString()} MU (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ─── CHART 4: Pre/During/Post Lockdown Grouped Bar ────────────────────────────
function renderLockdown(data) {
  // Top 10 by avg_2019
  const top10 = data.slice(0, 10);

  const ctx = document.getElementById('chart_lockdown');
  if (!ctx) return;
  if (charts.lockdown) charts.lockdown.destroy();

  charts.lockdown = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(d => d.state.replace('Pradesh', 'P.').replace('Bengal', 'Ben.')),
      datasets: [
        {
          label: '2019 Avg (Baseline)',
          data: top10.map(d => d.avg_2019),
          backgroundColor: COLORS.cyan + '99', borderColor: COLORS.cyan,
          borderWidth: 1.5, borderRadius: 4,
        },
        {
          label: 'Lockdown Avg (Mar–Jun 2020)',
          data: top10.map(d => d.avg_lockdown),
          backgroundColor: COLORS.red + '99', borderColor: COLORS.red,
          borderWidth: 1.5, borderRadius: 4,
        },
        {
          label: 'Recovery Avg (Jul–Dec 2020)',
          data: top10.map(d => d.avg_recovery),
          backgroundColor: COLORS.green + '99', borderColor: COLORS.green,
          borderWidth: 1.5, borderRadius: 4,
        }
      ]
    },
    options: chartDefaults({
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b9ec7', maxRotation: 30 } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
          title: { display: true, text: 'Avg Monthly MU', color: '#4a5b7a' }
        }
      }
    })
  });
}

// ─── CHART 6: Heatmap Table ──────────────────────────────────────────────────
function renderHeatmap(data) {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;

  // Filter to 2020 only, top 15 states by total
  const data2020 = data.filter(d => d.year === 2020);
  const stateTotals = {};
  data2020.forEach(d => {
    stateTotals[d.state] = (stateTotals[d.state] || 0) + d.consumption_mu;
  });
  const topStates = Object.entries(stateTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([s]) => s);

  // Build matrix: state → month → value
  const matrix = {};
  topStates.forEach(s => { matrix[s] = {}; });
  data2020.forEach(d => {
    if (matrix[d.state]) matrix[d.state][d.month] = d.consumption_mu;
  });

  // Find min/max for color scale
  const allVals = data2020.map(d => d.consumption_mu);
  const vMin = Math.min(...allVals), vMax = Math.max(...allVals);

  function heatColor(v) {
    const t = (v - vMin) / (vMax - vMin);
    // Deep blue → cyan → green → orange → red
    const stops = [
      [6, 8, 15],      // dark navy (low)
      [0, 80, 120],    // dark teal
      [0, 180, 180],   // cyan
      [16, 232, 138],  // green
      [255, 200, 50],  // yellow
      [255, 71, 87],   // red (high)
    ];
    const idx = t * (stops.length - 1);
    const lo = Math.floor(idx), hi = Math.min(lo + 1, stops.length - 1);
    const frac = idx - lo;
    const r = Math.round(stops[lo][0] + frac * (stops[hi][0] - stops[lo][0]));
    const g = Math.round(stops[lo][1] + frac * (stops[hi][1] - stops[lo][1]));
    const b = Math.round(stops[lo][2] + frac * (stops[hi][2] - stops[lo][2]));
    const textColor = t > 0.6 ? '#000' : '#f0f6ff';
    return { bg: `rgb(${r},${g},${b})`, text: textColor };
  }

  let html = `<table class="heatmap-table"><thead><tr>
    <th>State</th>
    ${MONTHS.map(m => `<th>${m}</th>`).join('')}
  </tr></thead><tbody>`;

  topStates.forEach(state => {
    html += `<tr><td class="state-name">${state}</td>`;
    for (let m = 1; m <= 12; m++) {
      const val = matrix[state][m] || 0;
      const { bg, text } = heatColor(val);
      html += `<td style="background:${bg};color:${text}" title="${state} ${MONTHS[m-1]}: ${val.toLocaleString()} MU">${Math.round(val/100)/10}k</td>`;
    }
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ─── Filter application ──────────────────────────────────────────────────────
function applyFilters() {
  filtersApplied.region = document.getElementById('filterRegion').value;
  filtersApplied.state  = document.getElementById('filterState').value;
  filtersApplied.year   = document.getElementById('filterYear').value;
  filtersApplied.month  = document.getElementById('filterMonth').value;

  // Re-fetch state data with filters
  const params = new URLSearchParams();
  if (filtersApplied.state)  params.set('state', filtersApplied.state);
  if (filtersApplied.region) params.set('region', filtersApplied.region);
  if (filtersApplied.year)   params.set('year', filtersApplied.year);

  // Re-render charts
  renderTrends(rawTrends);
  renderCovidArea(rawTrends);
  renderRegions(rawRegions);
  renderDonut(rawRegions);
}

function resetFilters() {
  document.getElementById('filterRegion').value = '';
  document.getElementById('filterState').value  = '';
  document.getElementById('filterYear').value   = '';
  document.getElementById('filterMonth').value  = '';
  filtersApplied = { region: '', state: '', year: '', month: '' };
  renderTrends(rawTrends);
  renderCovidArea(rawTrends);
  renderRegions(rawRegions);
  renderDonut(rawRegions);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ trends: rawTrends, regions: rawRegions }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'electricity_data.json'; a.click();
}

// ─── Populate state dropdown ─────────────────────────────────────────────────
function populateStateFilter(states) {
  const sel = document.getElementById('filterState');
  states.forEach(s => {
    const opt = document.createElement('option'); opt.value = s; opt.textContent = s; sel.appendChild(opt);
  });
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────
async function init() {
  try {
    const [trends, regions, lockdown, heatmap, filters] = await Promise.all([
      fetch('/api/trends').then(r => r.json()),
      fetch('/api/regions').then(r => r.json()),
      fetch('/api/lockdown').then(r => r.json()),
      fetch('/api/heatmap').then(r => r.json()),
      fetch('/api/filters').then(r => r.json()),
    ]);

    rawTrends   = trends;
    rawRegions  = regions;
    rawLockdown = lockdown;
    rawHeatmap  = heatmap;

    populateStateFilter(filters.states);

    renderTrends(trends);
    renderCovidArea(trends);
    renderRegions(regions);
    renderDonut(regions);
    renderLockdown(lockdown);
    renderHeatmap(heatmap);

  } catch (err) {
    console.error('Dashboard init error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
