/**
 * story.js — Controls the 5-scene data story navigation,
 * auto-play mode, and scene-specific Chart.js charts.
 */

// ─── Chart.js global defaults ────────────────────────────────────────────────
Chart.defaults.color = '#8b9ec7';
Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;

const COLORS = {
  cyan:    '#00d4ff',
  blue:    '#3d7fff',
  purple:  '#8b5cf6',
  green:   '#10e88a',
  orange:  '#ff7c3b',
  red:     '#ff4757',
  yellow:  '#ffd32a',
};

const REGION_COLORS = {
  'Northern':    COLORS.cyan,
  'Southern':    COLORS.green,
  'Eastern':     COLORS.purple,
  'Western':     COLORS.orange,
  'Northeastern':COLORS.yellow,
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── State ───────────────────────────────────────────────────────────────────
let currentScene = 1;
const TOTAL_SCENES = 5;
let autoPlayInterval = null;
let autoPlay = false;
const sceneCharts = {};

// ─── Chart options helper ────────────────────────────────────────────────────
function opts(extra = {}) {
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: { labels: { color: '#8b9ec7', usePointStyle: true, pointStyleWidth: 8, padding: 12 } },
      tooltip: {
        backgroundColor: 'rgba(13,17,23,0.95)',
        borderColor: 'rgba(0,212,255,0.25)', borderWidth: 1,
        titleColor: '#f0f6ff', bodyColor: '#8b9ec7',
        padding: 10, cornerRadius: 8,
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' } },
    },
    ...extra,
  };
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function goToScene(n) {
  document.getElementById(`scene-${currentScene}`).classList.remove('active');
  currentScene = Math.max(1, Math.min(TOTAL_SCENES, n));
  document.getElementById(`scene-${currentScene}`).classList.add('active');

  document.getElementById('sceneLabel').textContent = `Scene ${currentScene} of ${TOTAL_SCENES}`;
  document.getElementById('progressBar').style.width = `${(currentScene / TOTAL_SCENES) * 100}%`;

  // Update dots
  document.querySelectorAll('.scene-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i + 1 === currentScene);
  });

  document.getElementById('btnPrev').disabled = currentScene === 1;
  document.getElementById('btnNext').textContent = currentScene === TOTAL_SCENES ? '🔁 Restart' : 'Next Scene →';

  // Scroll to top of story body
  document.getElementById('storyBody').scrollTop = 0;

  // Render this scene's charts
  renderScene(currentScene);
}

function nextScene() {
  if (currentScene === TOTAL_SCENES) { goToScene(1); return; }
  goToScene(currentScene + 1);
}

function prevScene() {
  goToScene(currentScene - 1);
}

// ─── Auto-play ────────────────────────────────────────────────────────────────
function toggleAutoPlay() {
  autoPlay = !autoPlay;
  const btn = document.getElementById('autoToggle');
  btn.classList.toggle('on', autoPlay);

  if (autoPlay) {
    autoPlayInterval = setInterval(() => {
      if (currentScene === TOTAL_SCENES) {
        toggleAutoPlay(); // stop at end
      } else {
        nextScene();
      }
    }, 8000);
  } else {
    clearInterval(autoPlayInterval);
  }
}

// ─── Cache for API data ──────────────────────────────────────────────────────
let _trends = null, _regions = null, _recovery = null, _lockdown = null;

async function getTrends()   { if (!_trends)   _trends   = await fetch('/api/trends').then(r => r.json());   return _trends; }
async function getRegions()  { if (!_regions)  _regions  = await fetch('/api/regions').then(r => r.json());  return _regions; }
async function getRecovery() { if (!_recovery) _recovery = await fetch('/api/recovery').then(r => r.json()); return _recovery; }
async function getLockdown() { if (!_lockdown) _lockdown = await fetch('/api/lockdown').then(r => r.json()); return _lockdown; }

// ─── Scene renderers ─────────────────────────────────────────────────────────

async function renderScene1() {
  const trends = await getTrends();
  const regions = await getRegions();

  const y2019 = trends.filter(d => d.year === 2019);

  // s1_chart1: 2019 line
  const ctx1 = document.getElementById('s1_chart1');
  if (ctx1 && !sceneCharts.s1c1) {
    const g = ctx1.getContext('2d').createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, COLORS.cyan + '70'); g.addColorStop(1, COLORS.cyan + '00');
    sceneCharts.s1c1 = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: MONTHS,
        datasets: [{
          label: '2019 National Consumption (MU)',
          data: y2019.map(d => d.total_mu),
          borderColor: COLORS.cyan, backgroundColor: g, fill: true, tension: 0.4,
          pointBackgroundColor: COLORS.cyan, pointRadius: 4, borderWidth: 2.5,
        }]
      },
      options: opts()
    });
  }

  // s1_chart2: regional 2019 polar-area
  const ctx2 = document.getElementById('s1_chart2');
  const r2019 = regions.filter(d => d.year === 2019);
  if (ctx2 && !sceneCharts.s1c2) {
    sceneCharts.s1c2 = new Chart(ctx2, {
      type: 'polarArea',
      data: {
        labels: r2019.map(d => d.region),
        datasets: [{
          data: r2019.map(d => d.total_mu),
          backgroundColor: r2019.map(d => REGION_COLORS[d.region] + 'bb'),
          borderColor: r2019.map(d => REGION_COLORS[d.region]),
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800 },
        plugins: {
          legend: { position: 'right', labels: { color: '#8b9ec7', pointStyleWidth: 8 } },
          tooltip: { backgroundColor: 'rgba(13,17,23,0.95)', borderColor: 'rgba(0,212,255,0.2)', borderWidth: 1, titleColor: '#f0f6ff', bodyColor: '#8b9ec7' }
        }
      }
    });
  }

  // Update insight
  const peakMU = Math.max(...y2019.map(d => d.total_mu));
  const el = document.getElementById('s1_peak');
  if (el) el.textContent = Math.round(peakMU / 1000) + 'K MU';
}

async function renderScene2() {
  const trends = await getTrends();
  const y2019 = trends.filter(d => d.year === 2019);
  const y2020 = trends.filter(d => d.year === 2020);

  const ctx = document.getElementById('s2_chart1');
  if (ctx && !sceneCharts.s2c1) {
    const g1 = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    g1.addColorStop(0, COLORS.cyan + '55'); g1.addColorStop(1, COLORS.cyan + '00');
    const g2 = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    g2.addColorStop(0, COLORS.red + '55'); g2.addColorStop(1, COLORS.red + '00');

    sceneCharts.s2c1 = new Chart(ctx, {
      type: 'line',
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: '2019 (Baseline)',
            data: y2019.map(d => d.total_mu),
            borderColor: COLORS.cyan, backgroundColor: g1,
            fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2,
          },
          {
            label: '2020 (COVID Impact)',
            data: y2020.map(d => d.total_mu),
            borderColor: COLORS.red, backgroundColor: g2,
            fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2.5,
            pointBackgroundColor: y2020.map((d, i) =>
              i >= 2 && i <= 5 ? COLORS.red : COLORS.orange
            ),
          }
        ]
      },
      options: opts()
    });
  }

  // Compute max YoY drop
  const drops = y2020.map((d, i) => ((d.total_mu - y2019[i]?.total_mu) / y2019[i]?.total_mu * 100).toFixed(1));
  const maxDrop = Math.min(...drops.map(Number)).toFixed(1);
  const el = document.getElementById('s2_maxDrop');
  if (el) el.textContent = maxDrop + '%';
}

async function renderScene3() {
  const recovery = await getRecovery();
  const regions  = await getRegions();

  // s3_chart1: Regional avg YoY change line per month
  const ctx1 = document.getElementById('s3_chart1');
  if (ctx1 && !sceneCharts.s3c1) {
    const regionList = Object.keys(REGION_COLORS);
    const datasets = regionList.map(region => {
      const data = MONTHS.map((_, mi) => {
        const rows = recovery.filter(d => d.region === region && d.month === mi + 1);
        if (!rows.length) return null;
        const avg = rows.reduce((s, r) => s + r.yoy_change_pct, 0) / rows.length;
        return parseFloat(avg.toFixed(2));
      });
      return {
        label: region, data,
        borderColor: REGION_COLORS[region],
        backgroundColor: REGION_COLORS[region] + '20',
        fill: false, tension: 0.4, pointRadius: 3, borderWidth: 2,
      };
    });

    sceneCharts.s3c1 = new Chart(ctx1, {
      type: 'line',
      data: { labels: MONTHS, datasets },
      options: opts({
        plugins: {
          ...opts().plugins,
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' } },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
            title: { display: true, text: 'YoY Change (%)', color: '#4a5b7a' }
          }
        }
      })
    });
  }

  // s3_chart2: horizontal bar — region avg recovery index for Jul–Dec
  const ctx2 = document.getElementById('s3_chart2');
  if (ctx2 && !sceneCharts.s3c2) {
    const regionList = Object.keys(REGION_COLORS);
    const avgRecovery = regionList.map(region => {
      const rows = recovery.filter(d => d.region === region && d.month >= 7);
      return rows.length ? parseFloat((rows.reduce((s, r) => s + r.recovery_index, 0) / rows.length).toFixed(1)) : 0;
    });

    sceneCharts.s3c2 = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: regionList,
        datasets: [{
          label: 'Avg Recovery Index (Jul–Dec 2020)',
          data: avgRecovery,
          backgroundColor: regionList.map(r => REGION_COLORS[r] + 'cc'),
          borderColor: regionList.map(r => REGION_COLORS[r]),
          borderWidth: 1.5, borderRadius: 6,
        }]
      },
      options: opts({
        indexAxis: 'y',
        scales: {
          x: {
            min: 80, max: 105,
            grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
            title: { display: true, text: 'Recovery Index (100 = 2019 baseline)', color: '#4a5b7a' }
          },
          y: { grid: { display: false }, ticks: { color: '#8b9ec7' } }
        }
      })
    });
  }
}

async function renderScene4() {
  const recovery = await getRecovery();

  // Group by state: avg recovery index Jul–Dec
  const stateMap = {};
  recovery.filter(d => d.month >= 7).forEach(d => {
    if (!stateMap[d.state]) stateMap[d.state] = { vals: [], region: d.region };
    stateMap[d.state].vals.push(d.recovery_index);
  });
  const stateAvg = Object.entries(stateMap).map(([state, { vals, region }]) => ({
    state, region,
    avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
  })).sort((a, b) => b.avg - a.avg).slice(0, 15);

  const ctx = document.getElementById('s4_chart1');
  if (ctx && !sceneCharts.s4c1) {
    sceneCharts.s4c1 = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stateAvg.map(d => d.state.length > 12 ? d.state.substring(0, 12) + '…' : d.state),
        datasets: [{
          label: 'Recovery Index (avg Jul–Dec 2020)',
          data: stateAvg.map(d => d.avg),
          backgroundColor: stateAvg.map(d => {
            const v = d.avg;
            if (v >= 100) return COLORS.green + 'cc';
            if (v >= 95) return COLORS.cyan + 'cc';
            if (v >= 90) return COLORS.orange + 'cc';
            return COLORS.red + 'cc';
          }),
          borderColor: stateAvg.map(d => {
            const v = d.avg;
            if (v >= 100) return COLORS.green;
            if (v >= 95) return COLORS.cyan;
            if (v >= 90) return COLORS.orange;
            return COLORS.red;
          }),
          borderWidth: 1.5, borderRadius: 5,
        }]
      },
      options: opts({
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b9ec7', maxRotation: 40 } },
          y: {
            min: 80, max: 107,
            grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
            title: { display: true, text: 'Recovery Index', color: '#4a5b7a' }
          }
        }
      })
    });
  }

  const best = stateAvg[0];
  const el = document.getElementById('s4_best');
  if (el && best) el.textContent = best.state.split(' ')[0];
}

async function renderScene5() {
  const trends   = await getTrends();
  const recovery = await getRecovery();

  // s5_chart1: full 2-year bar
  const ctx1 = document.getElementById('s5_chart1');
  if (ctx1 && !sceneCharts.s5c1) {
    const labels = trends.map(d => `${d.month_name} ${d.year}`);
    sceneCharts.s5c1 = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'National Consumption (MU)',
          data: trends.map(d => d.total_mu),
          backgroundColor: trends.map(d => {
            if (d.year === 2019) return COLORS.cyan + '88';
            if (d.month >= 3 && d.month <= 6) return COLORS.red + '88';
            return COLORS.green + '88';
          }),
          borderColor: trends.map(d => {
            if (d.year === 2019) return COLORS.cyan;
            if (d.month >= 3 && d.month <= 6) return COLORS.red;
            return COLORS.green;
          }),
          borderWidth: 1, borderRadius: 3,
        }]
      },
      options: opts({
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b9ec7', maxRotation: 60, font: { size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' } }
        }
      })
    });
  }

  // s5_chart2: Top 5 recovery states horizontal bar
  const ctx2 = document.getElementById('s5_chart2');
  if (ctx2 && !sceneCharts.s5c2) {
    const stateMap = {};
    recovery.filter(d => d.month >= 7).forEach(d => {
      if (!stateMap[d.state]) stateMap[d.state] = [];
      stateMap[d.state].push(d.recovery_index);
    });
    const top5 = Object.entries(stateMap)
      .map(([state, vals]) => ({ state, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => b.avg - a.avg).slice(0, 5);

    sceneCharts.s5c2 = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: top5.map(d => d.state),
        datasets: [{
          label: 'Avg Recovery Index',
          data: top5.map(d => parseFloat(d.avg.toFixed(1))),
          backgroundColor: [COLORS.green, COLORS.cyan, COLORS.blue, COLORS.purple, COLORS.yellow].map(c => c + 'cc'),
          borderColor:     [COLORS.green, COLORS.cyan, COLORS.blue, COLORS.purple, COLORS.yellow],
          borderWidth: 1.5, borderRadius: 6,
        }]
      },
      options: opts({
        indexAxis: 'y',
        scales: {
          x: {
            min: 95,
            grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b9ec7' },
            title: { display: true, text: 'Recovery Index', color: '#4a5b7a' }
          },
          y: { grid: { display: false }, ticks: { color: '#8b9ec7' } }
        }
      })
    });
  }
}

function renderScene(n) {
  switch (n) {
    case 1: renderScene1(); break;
    case 2: renderScene2(); break;
    case 3: renderScene3(); break;
    case 4: renderScene4(); break;
    case 5: renderScene5(); break;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  goToScene(1);
});
