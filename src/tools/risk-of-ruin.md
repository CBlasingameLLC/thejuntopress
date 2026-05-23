---
layout: page.html
title: Risk of Ruin
---

<style>
    /* 1. Nuke iOS Safari Default White Backgrounds */
    .ror-input {
        -webkit-appearance: none !important;
        background-color: transparent !important;
        color: var(--accent-color) !important;
        border: 1px solid var(--border-color) !important;
        border-radius: 4px;
        font-family: monospace;
        font-size: 1.1em;
        font-weight: bold;
        text-align: right;
        padding: 2px 6px;
        width: 85px;
    }
    
    body.dark-mode .ror-input {
        background-color: rgba(255, 255, 255, 0.05) !important;
    }

    /* 2. Micro-Sliders */
    input[type=range].ror-slider {
        -webkit-appearance: none !important;
        width: 100%;
        background: transparent !important;
        margin: 5px 0 10px 0; /* Tight margins */
    }
    input[type=range].ror-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 3px; /* Very thin track */
        background: rgba(128, 128, 128, 0.3) !important; /* Forces dark track */
        border-radius: 2px;
    }
    input[type=range].ror-slider::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        height: 14px; /* Small thumb */
        width: 14px;
        border-radius: 50%;
        background: var(--accent-color) !important;
        margin-top: -5px;
    }

    /* 3. Hyper-Compact Layout */
    .dashboard-card {
        background: var(--bg-surface);
        border-top: 3px solid var(--accent-color);
        border-radius: 4px;
        padding: 15px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .top-monitor {
        text-align: center;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 10px;
        margin-bottom: 15px;
    }
    .canvas-wrapper {
        width: 100%;
        height: 120px; /* Extremely short graph to save space */
        position: relative;
        margin-top: 10px;
    }
    .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2px;
    }
    .control-row label {
        margin: 0;
        font-size: 0.8em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-muted);
    }
</style>

<nav class="calculator-nav" style="margin-bottom: 1em; padding-bottom: 0.5em; border-bottom: solid 1px var(--border-color);">
    <ul style="display: flex; list-style: none; padding: 0; gap: 1.5em; overflow-x: auto; white-space: nowrap; font-size: 0.8em;">
        <li><a href="/tools/slots/" style="color: var(--text-muted);">Slots</a></li>
        <li><a href="/tools/blackjack/" style="color: var(--text-muted);">Blackjack</a></li>
        <li><a href="/tools/risk-of-ruin/" style="color: var(--accent-color); font-weight: bold;">Risk of Ruin</a></li>
    </ul>
</nav>

<div class="dashboard-card">
    
    <div class="top-monitor">
        <div id="ror-percent" style="font-family: monospace; font-size: 3em; font-weight: bold; line-height: 1;">--%</div>
        <div id="ror-status" style="font-size: 0.75em; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Calculating...</div>
        <div class="canvas-wrapper">
            <canvas id="rorChart"></canvas>
        </div>
    </div>

    <div>
        <div>
            <div class="control-row">
                <label>Total Bankroll ($)</label>
                <input type="number" id="br-in" class="ror-input" value="500" step="10">
            </div>
            <input type="range" id="br-sl" class="ror-slider" min="50" max="2500" step="10" value="500">
        </div>

        <div>
            <div class="control-row">
                <label>Win Rate ($/hr)</label>
                <input type="number" id="wr-in" class="ror-input" value="15" step="1">
            </div>
            <input type="range" id="wr-sl" class="ror-slider" min="1" max="50" step="1" value="15">
        </div>

        <div>
            <div class="control-row">
                <label>Std. Dev ($/hr)</label>
                <input type="number" id="sd-in" class="ror-input" value="150" step="5">
            </div>
            <input type="range" id="sd-sl" class="ror-slider" min="20" max="500" step="5" value="150">
        </div>
    </div>
</div>

<script>
const els = {
    br: document.getElementById('br-in'), brS: document.getElementById('br-sl'),
    wr: document.getElementById('wr-in'), wrS: document.getElementById('wr-sl'),
    sd: document.getElementById('sd-in'), sdS: document.getElementById('sd-sl'),
    pct: document.getElementById('ror-percent'), stat: document.getElementById('ror-status'),
    cvs: document.getElementById('rorChart')
};
const ctx = els.cvs.getContext('2d');

// Sync inputs to sliders and recalculate instantly
function sync(source, target) { target.value = source.value; update(); }
[ ['br','brS'], ['wr','wrS'], ['sd','sdS'] ].forEach(pair => {
    els[pair[0]].oninput = () => sync(els[pair[0]], els[pair[1]]);
    els[pair[1]].oninput = () => sync(els[pair[1]], els[pair[0]]);
});

// AP Standard Exponential RoR Formula
function getRoR(br, wr, sd) {
    if (wr <= 0) return 1; // 100% ruin
    return Math.exp((-2 * wr * br) / Math.pow(sd, 2));
}

function update() {
    const br = parseFloat(els.br.value), wr = parseFloat(els.wr.value), sd = parseFloat(els.sd.value);
    const ror = getRoR(br, wr, sd);
    
    els.pct.innerText = (ror * 100).toFixed(2) + "%";
    
    // Dynamic Colors based on threshold
    if (ror < 0.01) { els.stat.innerText = "Virtually Safe"; els.pct.style.color = "var(--tag-econ)"; }
    else if (ror < 0.05) { els.stat.innerText = "Professionally Sound"; els.pct.style.color = "var(--tag-econ)"; }
    else if (ror < 0.15) { els.stat.innerText = "High Volatility"; els.pct.style.color = "var(--tag-tech)"; }
    else { els.stat.innerText = "Danger Zone"; els.pct.style.color = "var(--tag-policy)"; }

    draw(br, wr, sd, ror);
}

function draw(cBr, wr, sd, cRoR) {
    els.cvs.width = els.cvs.parentNode.clientWidth;
    els.cvs.height = els.cvs.parentNode.clientHeight;
    const w = els.cvs.width, h = els.cvs.height;
    
    ctx.clearRect(0,0,w,h);
    
    const theme = getComputedStyle(document.body);
    const accent = theme.getPropertyValue('--accent-color').trim() || '#00a8ff';
    
    ctx.beginPath();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    
    const maxBr = Math.max(cBr * 2.5, 500); // Scale the X axis dynamically
    for(let x = 0; x <= w; x++) {
        const xBr = (x/w) * maxBr;
        const xRoR = getRoR(xBr, wr, sd);
        const y = h - (xRoR * h);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Position the current bankroll dot
    const dotX = (cBr / maxBr) * w;
    const dotY = h - (cRoR * h);
    
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = (cRoR > 0.15) ? "var(--tag-policy)" : ((cRoR < 0.05) ? "var(--tag-econ)" : accent);
    ctx.fill();
}

window.onresize = update;
update();
</script>