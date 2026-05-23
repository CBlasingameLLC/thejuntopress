---
layout: page.html
title: Must-Hit-By Slot Evaluator
---

<style>
    /* Nuke iOS Safari Defaults & Force Electric Blue */
    .ap-input {
        -webkit-appearance: none !important;
        background-color: transparent !important;
        color: var(--accent-color) !important;
        border: 1px solid var(--border-color) !important;
        border-radius: 4px;
        font-family: monospace;
        font-size: 1.1em;
        font-weight: bold;
        text-align: right;
        padding: 4px 8px;
        width: 100px;
    }
    
    body.dark-mode .ap-input {
        background-color: rgba(255, 255, 255, 0.05) !important;
    }

    /* Striking Labels (Replaced muted grey with bold main text) */
    .control-row label {
        margin: 0;
        font-size: 0.85em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-main); 
        font-weight: bold;
    }

    /* Dashboard Layout */
    .dashboard-card {
        background: var(--bg-surface);
        border-top: 3px solid var(--accent-color);
        border-radius: 4px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        border-bottom: 1px solid rgba(128,128,128,0.1);
        padding-bottom: 10px;
    }
    .control-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    
    .results-monitor {
        text-align: center;
        background: rgba(0,0,0,0.03);
        padding: 15px;
        border-radius: 4px;
        margin-top: 20px;
        border: 1px solid var(--border-color);
    }
</style>

<nav class="calculator-nav" style="margin-bottom: 1em; padding-bottom: 0.5em; border-bottom: solid 1px var(--border-color);">
    <ul style="display: flex; list-style: none; padding: 0; gap: 1.5em; overflow-x: auto; white-space: nowrap; font-size: 0.8em;">
        <li><a href="/tools/slots/" style="color: var(--accent-color); font-weight: bold;">Slots</a></li>
        <li><a href="/tools/blackjack/" style="color: var(--text-muted);">Blackjack</a></li>
        <li><a href="/tools/risk-of-ruin/" style="color: var(--text-muted);">Risk of Ruin</a></li>
    </ul>
</nav>

<div class="dashboard-card">
    <div>
        <div class="control-row">
            <label>Jackpot Cap ($)</label>
            <input type="number" id="slot-cap" class="ap-input" value="500" step="1">
        </div>
        <div class="control-row">
            <label>Current Meter ($)</label>
            <input type="number" id="slot-meter" class="ap-input" value="480" step="1">
        </div>
        <div class="control-row">
            <label>Contribution (%)</label>
            <input type="number" id="slot-contrib" class="ap-input" value="1.5" step="0.1">
        </div>
        <div class="control-row">
            <label>Base RTP (%)</label>
            <input type="number" id="slot-rtp" class="ap-input" value="88" step="1">
        </div>
    </div>

    <div class="results-monitor">
        <h3 id="slot-signal" style="margin-bottom: 0.2em; font-size: 1.2em; text-transform: uppercase;">Awaiting Input</h3>
        <div style="display: flex; justify-content: space-around; margin-top: 10px;">
            <div>
                <p style="margin: 0; font-size: 0.7em; text-transform: uppercase; color: var(--text-muted);">Expected Value</p>
                <p style="margin: 0; font-family: monospace; font-size: 1.5em; font-weight: bold;" id="slot-ev">--</p>
            </div>
            <div>
                <p style="margin: 0; font-size: 0.7em; text-transform: uppercase; color: var(--text-muted);">Break-Even ($)</p>
                <p style="margin: 0; font-family: monospace; font-size: 1.5em; font-weight: bold;" id="slot-be">--</p>
            </div>
        </div>
    </div>
</div>

<script>
function calculateSlotEV() {
    const cap = parseFloat(document.getElementById('slot-cap').value) || 0;
    const meter = parseFloat(document.getElementById('slot-meter').value) || 0;
    const contrib = (parseFloat(document.getElementById('slot-contrib').value) || 0) / 100;
    const rtp = (parseFloat(document.getElementById('slot-rtp').value) || 0) / 100;

    const avgDistanceToHit = (cap - meter) / 2;
    const avgCost = avgDistanceToHit / contrib;
    const baseGameReturn = avgCost * rtp;
    const avgJackpotValue = meter + avgDistanceToHit;
    
    const expectedValue = (avgJackpotValue + baseGameReturn) - avgCost;
    const breakEvenMeter = cap - ((cap * contrib) / (1 - rtp + contrib));

    const signalText = document.getElementById('slot-signal');
    const evText = document.getElementById('slot-ev');
    const beText = document.getElementById('slot-be');
    
    evText.innerText = (expectedValue >= 0 ? "+$" : "-$") + Math.abs(expectedValue).toFixed(2);
    beText.innerText = "$" + breakEvenMeter.toFixed(2);

    if (expectedValue > 0) {
        signalText.innerText = "Play (Positive EV)";
        signalText.style.color = "var(--tag-econ)";
        evText.style.color = "var(--tag-econ)";
    } else {
        signalText.innerText = "Wait (Negative EV)";
        signalText.style.color = "var(--tag-policy)";
        evText.style.color = "var(--tag-policy)";
    }
}

// Auto-calculate on any input change
['slot-cap', 'slot-meter', 'slot-contrib', 'slot-rtp'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateSlotEV);
});

// Initial calculation
calculateSlotEV();
</script>