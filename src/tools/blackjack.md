---
layout: page.html
title: Blackjack AP Suite
---

<style>
    /* Force Strikeing UI for iOS */
    .ap-card {
        background: var(--bg-surface);
        border-top: 3px solid var(--accent-color);
        padding: 15px;
        border-radius: 4px;
    }
    .ap-input, .ap-select {
        -webkit-appearance: none !important;
        background-color: rgba(128, 128, 128, 0.08) !important;
        color: var(--accent-color) !important;
        border: 1px solid var(--border-color) !important;
        font-weight: bold !important;
        font-family: monospace;
        text-align: right;
        padding: 4px 8px;
        border-radius: 4px;
    }
    .ap-select { text-align: center; width: 140px; }
    label { color: var(--text-main) !important; font-weight: bold !important; font-size: 0.8em; text-transform: uppercase; }

    .stat-box {
        text-align: center;
        background: rgba(0,0,0,0.03);
        padding: 10px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
    }
    .monitor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
    .control-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
    .row-item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(128,128,128,0.1); padding-bottom: 5px; }
</style>

<nav class="calculator-nav" style="margin-bottom: 1em; padding-bottom: 0.5em; border-bottom: solid 1px var(--border-color);">
    <ul style="display: flex; list-style: none; padding: 0; gap: 1.5em; overflow-x: auto; font-size: 0.8em;">
        <li><a href="/tools/slots/" style="color: var(--text-muted);">Slots</a></li>
        <li><a href="/tools/blackjack/" style="color: var(--accent-color); font-weight: bold;">Blackjack</a></li>
        <li><a href="/tools/risk-of-ruin/" style="color: var(--text-muted);">Risk of Ruin</a></li>
    </ul>
</nav>

<div class="ap-card">
    <div class="monitor-grid">
        <div class="stat-box">
            <label>True Count</label>
            <div id="out-tc" style="font-size: 2em; font-family: monospace; font-weight: bold;">0</div>
        </div>
        <div class="stat-box">
            <label>Advantage</label>
            <div id="out-edge" style="font-size: 2em; font-family: monospace; font-weight: bold;">--%</div>
        </div>
        <div class="stat-box" style="grid-column: span 2;">
            <label>Optimal Bet</label>
            <div id="out-bet" style="font-size: 2.5em; font-family: monospace; font-weight: bold; color: var(--accent-color);">$0</div>
        </div>
    </div>

    <div class="control-grid">
        <div class="row-item">
            <label>Running Count</label>
            <input type="number" id="in-rc" class="ap-input" value="0" style="width: 70px;">
        </div>
        <div class="row-item">
            <label>Decks in Shoe</label>
            <select id="in-decks" class="ap-select">
                <option value="1">1 Deck</option>
                <option value="2">2 Decks</option>
                <option value="6" selected>6 Decks</option>
                <option value="8">8 Decks</option>
            </select>
        </div>
        <div class="row-item">
            <label>Decks Remaining</label>
            <input type="number" id="in-rem" class="ap-input" value="4.5" step="0.5" style="width: 70px;">
        </div>
        <div class="row-item">
            <label>Payout</label>
            <select id="in-payout" class="ap-select">
                <option value="0">3 to 2</option>
                <option value="-1.39">6 to 5</option>
            </select>
        </div>
        <div class="row-item">
            <label>Dealer Soft 17</label>
            <select id="in-s17" class="ap-select">
                <option value="0.22">S17 (Stands)</option>
                <option value="0">H17 (Hits)</option>
            </select>
        </div>
        <div class="row-item">
            <label>Bankroll ($)</label>
            <input type="number" id="in-br" class="ap-input" value="5000" style="width: 100px;">
        </div>
    </div>
</div>

<script>
function updateBJ() {
    const rc = parseFloat(document.getElementById('in-rc').value) || 0;
    const rem = parseFloat(document.getElementById('in-rem').value) || 1;
    const br = parseFloat(document.getElementById('in-br').value) || 0;
    const payoutMod = parseFloat(document.getElementById('in-payout').value);
    const s17Mod = parseFloat(document.getElementById('in-s17').value);
    const deckCount = parseInt(document.getElementById('in-decks').value);

    // 1. Calculate True Count
    const tc = Math.floor(rc / rem);
    document.getElementById('out-tc').innerText = tc;

    // 2. Base Edge Calculation (Simplified Professional Model)
    let baseEdge = -0.5; // Standard multi-deck baseline
    if (deckCount === 1) baseEdge = 0.01;
    if (deckCount === 2) baseEdge = -0.12;
    
    const currentEdge = baseEdge + payoutMod + s17Mod + (tc * 0.5);
    const edgeDisplay = document.getElementById('out-edge');
    edgeDisplay.innerText = currentEdge.toFixed(2) + "%";
    edgeDisplay.style.color = currentEdge > 0 ? "var(--tag-econ)" : "var(--tag-policy)";

    // 3. Optimal Bet (Half-Kelly)
    const betDisplay = document.getElementById('out-bet');
    if (currentEdge <= 0) {
        betDisplay.innerText = "$0";
        betDisplay.style.color = "var(--text-muted)";
    } else {
        const kelly = (currentEdge / 100) / 1.26; // 1.26 is standard BJ variance
        const optimal = br * kelly * 0.5; // Half-Kelly
        betDisplay.innerText = "$" + Math.max(0, Math.floor(optimal));
        betDisplay.style.color = "var(--accent-color)";
    }
}

// Attach listeners
document.querySelectorAll('.ap-input, .ap-select').forEach(el => {
    el.oninput = updateBJ;
});
updateBJ();
</script>