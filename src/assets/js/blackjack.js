// ==========================================
// THE JUNTO PRESS - BLACKJACK ENGINE V1
// ==========================================

console.log("Blackjack Engine Initialized.");

// --- 1. TABLE RULES ---
let Rules = {
    decks: 6,
    penetration: 0.75, 
    h17: true,         
    das: true,         
    blackjackPayout: 1.5 
};

// --- 2.5 THE AUDIO ENGINE ---
const AudioEngine = {
    enabled: false,
    sounds: {
        card: '/assets/sounds/card.wav',
        chip: '/assets/sounds/chip.wav',
        shuffle: '/assets/sounds/shuffle.wav',
        win: '/assets/sounds/win.wav',
        loss: '/assets/sounds/loss.wav'
    },
    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        // Creating a new Audio object on every play allows for polyphony (overlapping sounds)
        const audio = new Audio(this.sounds[soundName]);
        audio.volume = 0.4; // Keeps the sounds from blowing out the user's speakers
        
        // Browsers require user interaction before playing audio, so we catch errors
        audio.play().catch(e => console.log("Audio blocked by browser policy."));
    }
};

// --- 2. THE SHOE ENGINE ---
class Shoe {
    constructor(decks) {
        this.decks = decks;
        this.cards = [];
        this.cutCardIndex = 0;
        this.needsShuffle = false;
        this.buildAndShuffle();
    }

    buildAndShuffle() {
        const suits = ['♠', '♥', '♣', '♦'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.cards = [];

        // Generate 312 cards
        for (let i = 0; i < this.decks; i++) {
            for (let suit of suits) {
                for (let rank of ranks) {
                    // Face cards = 10, Aces = 11 (by default)
                    let value = parseInt(rank) || (rank === 'A' ? 11 : 10);
                    let color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
                    this.cards.push({ suit, rank, value, color });
                }
            }
        }

        // The Fisher-Yates Algorithm: Mathematically perfect shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }

        // Set the plastic cut card 25% from the bottom of the deck
        this.cutCardIndex = Math.floor(this.cards.length * (1 - Rules.penetration));
        this.needsShuffle = false;
        console.log(`Shoe active. ${this.cards.length} cards shuffled.`);
    }

    draw() {
        // If we reach the cut card, signal that a shuffle is needed after this round
        if (this.cards.length <= this.cutCardIndex) {
            this.needsShuffle = true; 
        }
        return this.cards.pop();
    }
}

// --- 3. THE HAND EVALUATOR ---
class Hand {
    constructor(betAmount = 0) {
        this.cards = [];
        this.bet = betAmount; // Tracks individual bets for splits/doubles
        this.resolved = false; // Tracks if the hand is done playing
        this.hasDoubled = false; // NEW: Tracks if this specific hand doubled
    }

    add(card) {
        this.cards.push(card);
    }

    get score() {
        let total = 0;
        let aces = 0;
        for (let card of this.cards) {
            total += card.value;
            if (card.rank === 'A') aces++;
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return {
            total: total,
            isSoft: aces > 0,
            isBlackjack: total === 21 && this.cards.length === 2,
            isBust: total > 21
        };
    }
}

// --- 3.5 THE BASIC STRATEGY MATRIX (6-Deck, H17, DAS) ---
// H = Hit, S = Stand, D = Double, P = Split
// Arrays correspond to Dealer Upcard: [2, 3, 4, 5, 6, 7, 8, 9, 10, A]
const Strategy = {
    hard: {
        5: ['H','H','H','H','H','H','H','H','H','H'],
        6: ['H','H','H','H','H','H','H','H','H','H'],
        7: ['H','H','H','H','H','H','H','H','H','H'],
        8: ['H','H','H','H','H','H','H','H','H','H'],
        9: ['H','D','D','D','D','H','H','H','H','H'],
        10:['D','D','D','D','D','D','D','D','H','H'],
        11:['D','D','D','D','D','D','D','D','D','D'],
        12:['H','H','S','S','S','H','H','H','H','H'],
        13:['S','S','S','S','S','H','H','H','H','H'],
        14:['S','S','S','S','S','H','H','H','H','H'],
        15:['S','S','S','S','S','H','H','H','H','H'],
        16:['S','S','S','S','S','H','H','H','H','H'],
        17:['S','S','S','S','S','S','S','S','S','S'],
        18:['S','S','S','S','S','S','S','S','S','S'],
        19:['S','S','S','S','S','S','S','S','S','S'],
        20:['S','S','S','S','S','S','S','S','S','S'],
        21:['S','S','S','S','S','S','S','S','S','S']
    },
    soft: {
        2: ['H','H','H','D','D','H','H','H','H','H'], // A,2
        3: ['H','H','H','D','D','H','H','H','H','H'], // A,3
        4: ['H','H','D','D','D','H','H','H','H','H'], // A,4
        5: ['H','H','D','D','D','H','H','H','H','H'], // A,5
        6: ['H','D','D','D','D','H','H','H','H','H'], // A,6
        7: ['S','D','D','D','D','S','S','H','H','H'], // A,7
        8: ['S','S','S','S','D','S','S','S','S','S'], // A,8 (Double vs 6 in H17)
        9: ['S','S','S','S','S','S','S','S','S','S'], // A,9
        10:['S','S','S','S','S','S','S','S','S','S']
    },
    pair: {
        2: ['P','P','P','P','P','P','H','H','H','H'],
        3: ['P','P','P','P','P','P','H','H','H','H'],
        4: ['H','H','H','P','P','H','H','H','H','H'],
        5: ['D','D','D','D','D','D','D','D','H','H'],
        6: ['P','P','P','P','P','H','H','H','H','H'],
        7: ['P','P','P','P','P','P','H','H','H','H'],
        8: ['P','P','P','P','P','P','P','P','P','P'], // Always split 8s
        9: ['P','P','P','P','P','S','P','P','S','S'],
        10:['S','S','S','S','S','S','S','S','S','S'],
        11:['P','P','P','P','P','P','P','P','P','P']  // Always split Aces
    },

    // --- THE ILLUSTRIOUS 18 (Subset) ---
    // [TC_Threshold, 'DeviationPlay', 'BasicStrategyPlay']
    deviations: {
        "16_10": [0, 'S', 'H'], // Stand vs 10 at TC 0+
        "15_10": [4, 'S', 'H'], // Stand vs 10 at TC +4
        "14_10": [3, 'S', 'H'], // Stand vs 10 at TC +3
        "12_3":  [2, 'S', 'H'], // Stand vs 3 at TC +2
        "12_2":  [3, 'S', 'H'], // Stand vs 2 at TC +3
        "10_10": [4, 'D', 'H'], // Double vs 10 at TC +4
        "10_11": [4, 'D', 'H'], // Double vs Ace at TC +4
        "9_2":   [1, 'D', 'H'], // Double vs 2 at TC +1
        "9_7":   [3, 'D', 'H']  // Double vs 7 at TC +3
    }
};

// --- 4. DOM ELEMENTS ---
const UI = {
    toggleSound: document.getElementById('toggle-sound'),
    mainMenu: document.getElementById('main-menu'),
    toggleCasual: document.getElementById('toggle-casual'), // NEW
    tableBetArea: document.getElementById('table-bet-area'), // NEW
    chipStack: document.getElementById('chip-stack'), // NEW
    btnFullscreen: document.getElementById('btn-fullscreen'), // Fix for fullscreen
    btnModePairs: document.getElementById('btn-mode-pairs'),
    btnModeSoft: document.getElementById('btn-mode-soft'),
    btnModeDeviations: document.getElementById('btn-mode-deviations'),
    blackjackContainer: document.getElementById('blackjack-container'),
    referenceModal: document.getElementById('reference-modal'),
    btnModeTestout: document.getElementById('btn-mode-testout'),
    btnReturnMenu: document.getElementById('btn-return-menu'),
    btnOpenReference: document.getElementById('btn-open-reference'),
    btnCloseReference: document.getElementById('btn-close-reference'),
    insuranceControls: document.getElementById('insurance-controls'),
    btnBuyInsurance: document.getElementById('btn-buy-insurance'),
    btnPassInsurance: document.getElementById('btn-pass-insurance'),
    dealerCards: document.getElementById('dealer-cards'),
    playerCards: document.getElementById('player-cards'),
    dealerScore: document.getElementById('dealer-score'),
    playerScore: document.getElementById('player-score'),
    btnDeal: document.getElementById('btn-deal'),
    btnHit: document.getElementById('btn-hit'),
    btnStand: document.getElementById('btn-stand'),
    btnDouble: document.getElementById('btn-double'),
    btnSplit: document.getElementById('btn-split'),
    betControls: document.getElementById('bet-controls'),
    gameControls: document.getElementById('game-controls'),
    gameMessage: document.getElementById('game-message'),
    chipBtns: document.querySelectorAll('.chip'), // UPDATED
    uiBankroll: document.getElementById('ui-bankroll'),
    uiBet: document.getElementById('ui-bet'),
    uiTrueCount: document.getElementById('ui-truecount'),
    apFeedback: document.getElementById('ap-feedback'),
    tableBetBubble: document.getElementById('table-bet-bubble'), // NEW
    btnSettings: document.getElementById('btn-settings'),
    settingsMenu: document.getElementById('settings-menu'),
    toggleBankroll: document.getElementById('toggle-bankroll'),
    toggleTotals: document.getElementById('toggle-totals'),
    sessionStats: document.getElementById('session-stats'),
    configDecks: document.getElementById('config-decks'),
    configPenetration: document.getElementById('config-penetration'),
    penValueDisplay: document.getElementById('pen-value'),
    insuranceArea: document.getElementById('insurance-bet-area'),
    insuranceStack: document.getElementById('insurance-chip-stack'),
    toggleBanner: document.getElementById('toggle-banner'),
    configSpeed: document.getElementById('config-speed'),

};

// --- 5. THE GAME STATE CONTROLLER ---
class GameManager {
    constructor() {
        this.shoe = new Shoe(Rules.decks);
        this.playerHands = [];
        this.activeHandIndex = 0;
        this.dealerHand = new Hand();
        
        // --- PERSISTENCE ENGINE ---
        // Load bankroll from local storage, or default to 10000
        const savedBankroll = localStorage.getItem('junto_blackjack_bankroll');
        this.bankroll = savedBankroll ? parseInt(savedBankroll) : 10000;

        this.gameMode = 'testout'; // 'testout', 'pairs', or 'soft'
        this.decisionsTotal = 0;
        this.decisionsCorrect = 0;
        
        this.currentBet = 0;
        this.insuranceBet = 0;
        this.runningCount = 0;
        
        this.bindEvents();
        this.updateFinanceUI();
        this.updateCountUI();
    }

    bindEvents() {

        // Audio Toggle
        UI.toggleSound.addEventListener('change', (e) => {
            AudioEngine.enabled = e.target.checked;
        });

        // --- ROUTING ACTIONS ---
        const setGameMode = (mode) => {
            this.gameMode = mode;
            UI.mainMenu.style.display = 'none';
            UI.blackjackContainer.style.display = 'flex';
            UI.uiTrueCount.parentElement.style.display = UI.toggleCasual.checked ? 'none' : 'block';
            
            // Reset Session Analytics
            this.decisionsTotal = 0;
            this.decisionsCorrect = 0;
            UI.sessionStats.innerText = "Accuracy: --";
            
            if (mode !== 'testout') {
                UI.uiBankroll.parentElement.style.opacity = '0.2';
                UI.uiTrueCount.parentElement.style.opacity = '0.2';
                UI.sessionStats.style.display = 'block'; // Show stats in drills
            } else {
                UI.uiBankroll.parentElement.style.opacity = '1';
                UI.uiTrueCount.parentElement.style.opacity = '1';
                UI.sessionStats.style.display = 'none'; // Hide stats in standard play
            }
            
            this.updateScores();
        };

        UI.btnModeTestout.addEventListener('click', () => setGameMode('testout'));
        UI.btnModePairs.addEventListener('click', () => setGameMode('pairs'));
        UI.btnModeSoft.addEventListener('click', () => setGameMode('soft'));
        UI.btnModeDeviations.addEventListener('click', () => setGameMode('deviations')); // NEW

        // Update Penetration Slider Display
        UI.configPenetration.addEventListener('input', (e) => {
            UI.penValueDisplay.innerText = `${e.target.value}%`;
        });

        UI.btnReturnMenu.addEventListener('click', () => {
            UI.blackjackContainer.style.display = 'none';
            UI.mainMenu.style.display = 'flex';
        });

        // Apply Deck/Penetration Changes
        const applyTableRules = () => {
            const newDecks = parseInt(UI.configDecks.value);
            const newPen = parseInt(UI.configPenetration.value) / 100;
            
            Rules.decks = newDecks;
            Rules.penetration = newPen;
            
            // Rebuild the entire shoe with the new mathematical constraints
            this.shoe = new Shoe(Rules.decks);
            this.runningCount = 0;
            this.updateCountUI();
            
            this.showFeedback(`Rules Updated: ${newDecks} Decks, ${UI.configPenetration.value}% Pen`, 2500);
        };

        UI.configDecks.addEventListener('change', applyTableRules);
        UI.configPenetration.addEventListener('change', applyTableRules);

        // Robust Cross-Browser Fullscreen
        UI.btnFullscreen.addEventListener('click', () => {
            const doc = window.document;
            const docEl = doc.documentElement;
            const requestFullScreen = docEl.requestFullscreen || docEl.webkitRequestFullScreen;
            const cancelFullScreen = doc.exitFullscreen || doc.webkitExitFullscreen;

            if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
                requestFullScreen.call(docEl).catch(err => console.log("Fullscreen denied by browser."));
                UI.btnFullscreen.innerHTML = '<i class="icon solid fa-compress"></i>';
            } else {
                cancelFullScreen.call(doc);
                UI.btnFullscreen.innerHTML = '<i class="icon solid fa-expand"></i>';
            }
        });

        // Settings Menu Bug Fix
        UI.btnSettings.addEventListener('click', (e) => {
            e.stopPropagation(); // Stops the click from triggering the document closer
            const isHidden = window.getComputedStyle(UI.settingsMenu).display === 'none';
            UI.settingsMenu.style.display = isHidden ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (!UI.settingsMenu.contains(e.target) && e.target !== UI.btnSettings) {
                UI.settingsMenu.style.display = 'none';
            }
        });

        // Apply Toggles
        UI.toggleBankroll.addEventListener('change', () => this.updateFinanceUI());
        UI.toggleTotals.addEventListener('change', () => this.updateScores(UI.dealerCards.children[0] && !UI.dealerCards.children[0].classList.contains('card-hidden')));

        // (Keep your existing btnOpenReference and btnCloseReference listeners here)

        UI.btnOpenReference.addEventListener('click', () => {
            UI.referenceModal.style.display = 'block';
        });

        UI.btnCloseReference.addEventListener('click', () => {
            UI.referenceModal.style.display = 'none';
        });

        UI.btnDeal.addEventListener('click', () => this.startRound());
        UI.btnHit.addEventListener('click', () => { this.evaluatePlay('H'); this.playerHit(); });
        UI.btnStand.addEventListener('click', () => { this.evaluatePlay('S'); this.playerStand(); });
        UI.btnDouble.addEventListener('click', () => { this.evaluatePlay('D'); this.playerDouble(); });
        UI.btnSplit.addEventListener('click', () => { this.evaluatePlay('P'); this.playerSplit(); });
        UI.btnBuyInsurance.addEventListener('click', () => this.handleInsurance(true));
        UI.btnPassInsurance.addEventListener('click', () => this.handleInsurance(false));

        // Betting Logic (Chip Throwing)
        UI.chipBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseInt(e.target.innerText.replace('$', ''));
                
                // If Freeplay is on, or we have enough bankroll, allow the bet
                if (UI.toggleBankroll.checked || this.bankroll >= amount) {
                    if (!UI.toggleBankroll.checked) {
                        this.bankroll -= amount;
                    }
                    this.currentBet += amount;
                    
                    const chipClass = e.target.classList[1]; 
                    const miniChip = document.createElement('div');
                    miniChip.className = `chip ${chipClass} thrown-chip`;
                    miniChip.innerText = e.target.innerText;
                    
                    const xOffset = Math.floor(Math.random() * 30) - 15;
                    const yOffset = Math.floor(Math.random() * 30) - 15;
                    const rot = Math.floor(Math.random() * 360);
                    
                    miniChip.style.setProperty('--x', `${xOffset}px`);
                    miniChip.style.setProperty('--y', `${yOffset}px`);
                    miniChip.style.setProperty('--rot', `${rot}deg`);
                    
                    UI.chipStack.appendChild(miniChip);
                    AudioEngine.play('chip');
                    this.updateFinanceUI();
                } else {
                    this.showFeedback("Not enough Bankroll!", 1500);
                }
            });
        });

        // Secret "Clear Bet" feature (Tap the stack to pull chips back)
        UI.tableBetArea.addEventListener('click', () => {
            if (this.currentBet > 0 && UI.betControls.style.display !== 'none') {
                this.bankroll += this.currentBet;
                this.currentBet = 0;
                UI.chipStack.innerHTML = ''; // Clear the physical chips
                this.updateFinanceUI();
                UI.insuranceArea.style.display = 'none';
            }
        });

        UI.uiBet.parentElement.addEventListener('click', () => {
            if (this.currentBet > 0 && UI.betControls.style.display !== 'none') {
                this.bankroll += this.currentBet;
                this.currentBet = 0;
                this.updateFinanceUI();
            }
        });
        UI.uiBet.parentElement.style.cursor = 'pointer';
    }

    updateFinanceUI() {
        if (UI.toggleBankroll.checked) {
            UI.uiBankroll.innerText = 'FREEPLAY';
            UI.uiBet.innerText = 'FREEPLAY';
        } else {
            UI.uiBankroll.innerText = '$' + this.bankroll.toLocaleString();
            UI.uiBet.innerText = '$' + this.currentBet.toLocaleString();
        }
        
        if (this.currentBet > 0) {
            UI.tableBetBubble.innerText = '$' + this.currentBet.toLocaleString();
            UI.tableBetArea.style.display = 'flex';
        } else {
            UI.tableBetArea.style.display = 'none';
        }

        localStorage.setItem('junto_blackjack_bankroll', this.bankroll.toString());
    }

    updateCount(card) {
        if (card.value >= 2 && card.value <= 6) this.runningCount += 1;
        else if (card.value >= 10) this.runningCount -= 1;
        this.updateCountUI();
    }

    updateCountUI() {
        const unplayed = this.shoe.cards.length;
        let decksRem = Math.max(1, Math.round((unplayed / 52) * 2) / 2);
        const trueCount = Math.floor(this.runningCount / decksRem);
        UI.uiTrueCount.innerText = trueCount > 0 ? `+${trueCount}` : trueCount;
        if (trueCount >= 2) UI.uiTrueCount.style.color = '#2ecc71';
        else if (trueCount <= -1) UI.uiTrueCount.style.color = '#e74c3c';
        else UI.uiTrueCount.style.color = '#f1c40f';
    }

    renderCard(card, isHidden = false) {
        const div = document.createElement('div');
        div.className = `playing-card ${card.color} ${isHidden ? 'card-hidden' : ''}`;
        div.innerHTML = `<div class="card-top">${card.rank}<br>${card.suit}</div><div class="card-middle">${card.suit}</div><div class="card-bottom">${card.rank}<br>${card.suit}</div>`;
        if (!isHidden) this.updateCount(card);
        return div;
    }

    flipHoleCard() {
        const hc = UI.dealerCards.children[0];
        if (hc && hc.classList.contains('card-hidden')) {
            hc.classList.remove('card-hidden');
            this.updateCount(this.dealerHand.cards[0]); 
        }
    }

    // --- GAME LOOP ---
    startRound() {
        // Bankruptcy Reload Safety Net
        if (this.bankroll <= 0 && this.currentBet === 0) {
            this.bankroll = 10000;
            this.updateFinanceUI();
            this.showFeedback("Bankroll Reloaded to $10,000", 3000);
            return;
        }

        if (this.currentBet === 0) {
            this.showFeedback("PLACE A BET", 1500);
            return;
        }

        UI.dealerCards.innerHTML = '';
        UI.playerCards.innerHTML = '';
        UI.gameMessage.style.display = 'none';
        
        this.dealerHand = new Hand();
        this.playerHands = [new Hand(this.currentBet)];
        this.activeHandIndex = 0;
        this.insuranceBet = 0;

        // --- THE STACKED DECK INTERCEPTOR ---
        let p1, p2, dUp;
        dUp = this.shoe.draw(); // Default random upcard

        if (this.gameMode === 'testout') {
            p1 = this.shoe.draw();
            p2 = this.shoe.draw();
        } else {
            if (this.gameMode === 'pairs') {
                const ranks = ['2','3','4','5','6','7','8','9','10','A'];
                const fRank = ranks[Math.floor(Math.random() * ranks.length)];
                const val = fRank === 'A' ? 11 : (parseInt(fRank) || 10);
                p1 = { suit: '♠', rank: fRank, value: val, color: 'black' };
                p2 = { suit: '♥', rank: fRank, value: val, color: 'red' };
            } 
            else if (this.gameMode === 'soft') {
                const ranks = ['2','3','4','5','6','7','8','9'];
                const fRank = ranks[Math.floor(Math.random() * ranks.length)];
                p1 = { suit: '♠', rank: 'A', value: 11, color: 'black' };
                p2 = { suit: '♥', rank: fRank, value: parseInt(fRank), color: 'red' };
            }
            else if (this.gameMode === 'deviations') {
                // 1. Pick a random Illustrious 18 scenario
                const devKeys = Object.keys(Strategy.deviations);
                const randomDev = devKeys[Math.floor(Math.random() * devKeys.length)];
                const [pTotal, dVal] = randomDev.split('_').map(Number);
                
                // 2. Fabricate the player's cards
                let val1 = 10; let val2 = pTotal - 10;
                if (pTotal === 10) { val1 = 8; val2 = 2; }
                if (pTotal === 9) { val1 = 7; val2 = 2; }
                
                p1 = { suit: '♠', rank: val1.toString(), value: val1, color: 'black' };
                p2 = { suit: '♥', rank: val2.toString(), value: val2, color: 'red' };
                
                // 3. Fabricate the dealer's upcard
                dUp = { suit: '♣', rank: dVal === 11 ? 'A' : dVal.toString(), value: dVal, color: 'black' };

                // 4. Force the True Count (Randomly offset around the threshold so the user has to guess)
                const threshold = Strategy.deviations[randomDev][0];
                const forcedTC = threshold + (Math.floor(Math.random() * 4) - 1); // Varies between -1 and +2 of threshold
                
                const decksRem = Math.max(1, Math.round((this.shoe.cards.length / 52) * 2) / 2);
                this.runningCount = Math.floor(forcedTC * decksRem);
                this.updateCountUI();
            }
        }

        // Deal the intercepted cards to the table
        this.playerHands[0].add(p1);
        this.dealerHand.add(this.shoe.draw()); // Hidden hole card
        this.playerHands[0].add(p2);
        this.dealerHand.add(dUp);

        // Simulate dealing 4 cards rapidly
        setTimeout(() => AudioEngine.play('card'), 0);
        setTimeout(() => AudioEngine.play('card'), 150);
        setTimeout(() => AudioEngine.play('card'), 300);
        setTimeout(() => AudioEngine.play('card'), 450);

        this.renderTable();
        UI.betControls.style.display = 'none';

        if (this.dealerHand.cards[1].rank === 'A') {
            UI.insuranceControls.style.display = 'flex';
            UI.gameControls.style.display = 'none';
        } else {
            UI.insuranceControls.style.display = 'none';
            UI.gameControls.style.display = 'flex';
            
            if (this.playerHands[0].score.isBlackjack) {
                this.endRound("Blackjack!", "blackjack");
            }
        }

        UI.insuranceStack.innerHTML = '';
        UI.insuranceArea.style.display = 'none';
    }

    handleInsurance(bought) {
        // 1. AP Deviation Grader
        const unplayed = this.shoe.cards.length;
        let decksRem = Math.max(1, Math.round((unplayed / 52) * 2) / 2);
        const tc = Math.floor(this.runningCount / decksRem);
        
        const optimal = tc >= 3;
        if (bought !== optimal) {
            const msg = optimal ? "Deviation Error: Take Insurance at TC +3 or higher" : "Deviation Error: Never take Insurance below TC +3";
            this.showFeedback(msg, 3500);
        }

        // 2. Process Financials
        if (bought) {
            const insCost = this.currentBet / 2;
            if (this.bankroll >= insCost) {
                this.bankroll -= insCost;
                this.insuranceBet = insCost;
                
                // Physically throw the chip to the Insurance Line
                const insChip = document.createElement('div');
                insChip.className = `chip purple thrown-chip`;
                insChip.innerText = '$' + insCost;
                insChip.style.setProperty('--x', `0px`);
                insChip.style.setProperty('--y', `0px`);
                insChip.style.setProperty('--rot', `${Math.floor(Math.random() * 360)}deg`);
                
                UI.insuranceStack.innerHTML = '';
                UI.insuranceStack.appendChild(insChip);
                AudioEngine.play('chip');
                UI.insuranceArea.style.display = 'block';
                
                this.updateFinanceUI();
            } else {
                this.showFeedback("Not enough bankroll for Insurance", 2000);
                bought = false; // Forced to pass
            }
        }

        UI.insuranceControls.style.display = 'none';

        // 3. Dealer Peeks for Blackjack
        if (this.dealerHand.score.isBlackjack) {
            UI.gameControls.style.display = 'none';
            this.resolveWinner(); // Ends the round immediately
        } else {
            if (bought) {
                this.showFeedback("Nobody home. Insurance lost.", 2000);
                this.insuranceBet = 0; // The dealer sweeps the insurance bet
            }
            
            // Resume normal play
            UI.gameControls.style.display = 'flex';
            this.updateButtons();

            if (this.playerHands[0].score.isBlackjack) {
                this.endRound("Blackjack!", "blackjack");
            }
        }
    }

    // Completely rebuilds the visual table to support multiple hands
    renderTable() {
        // Dealer
        UI.dealerCards.innerHTML = '';
        UI.dealerCards.appendChild(this.renderCard(this.dealerHand.cards[0], !this.playerHands.every(h => h.resolved)));
        for (let i = 1; i < this.dealerHand.cards.length; i++) {
            UI.dealerCards.appendChild(this.renderCard(this.dealerHand.cards[i], false));
        }

        // Player
        UI.playerCards.innerHTML = '';
        
        if (this.playerHands.length === 1) {
            // NEW: Render single hand with overlapping CSS container
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'hand-cards';
            
            this.playerHands[0].cards.forEach((c, i) => {
                const cardEl = this.renderCard(c);
                // NEW: Make the 3rd card sideways if doubled
                if (this.playerHands[0].hasDoubled && i === 2) cardEl.classList.add('sideways');
                cardsDiv.appendChild(cardEl);
            });
            UI.playerCards.appendChild(cardsDiv);
            
        } else {
            // Render Split Layout
            const splitContainer = document.createElement('div');
            splitContainer.className = 'split-container';
            
            this.playerHands.forEach((hand, index) => {
                const col = document.createElement('div');
                col.className = `hand-column ${index !== this.activeHandIndex && !hand.resolved ? 'inactive' : ''}`;
                
                const scoreDiv = document.createElement('div');
                scoreDiv.style.cssText = "background:var(--accent-color); padding:2px 8px; border-radius:10px; font-size:0.7em; font-weight:bold; margin-bottom:5px;";
                scoreDiv.innerText = hand.score.isSoft ? `Soft ${hand.score.total}` : hand.score.total;
                if (hand.score.isBust) { scoreDiv.innerText = "BUST"; scoreDiv.style.background = "#e74c3c"; }
                col.appendChild(scoreDiv);

                const cardsDiv = document.createElement('div');
                cardsDiv.className = 'hand-cards';
                
                hand.cards.forEach((c, i) => {
                    const cardEl = this.renderCard(c);
                    // NEW: Make the 3rd card sideways if doubled on a split
                    if (hand.hasDoubled && i === 2) cardEl.classList.add('sideways');
                    cardsDiv.appendChild(cardEl);
                });
                
                col.appendChild(cardsDiv);
                splitContainer.appendChild(col);
            });
            UI.playerCards.appendChild(splitContainer);
        }

        this.updateScores();
        this.updateButtons();
    }

    updateButtons() {
        const activeHand = this.playerHands[this.activeHandIndex];
        if (!activeHand) return;

        // Double Down Guard
        UI.btnDouble.style.opacity = (activeHand.cards.length === 2 && this.bankroll >= activeHand.bet) ? '1' : '0.5';
        UI.btnDouble.style.pointerEvents = (activeHand.cards.length === 2 && this.bankroll >= activeHand.bet) ? 'auto' : 'none';

        // Split Guard
        const canSplit = activeHand.cards.length === 2 && activeHand.cards[0].value === activeHand.cards[1].value && this.bankroll >= activeHand.bet && this.playerHands.length < 4;
        UI.btnSplit.style.opacity = canSplit ? '1' : '0.5';
        UI.btnSplit.style.pointerEvents = canSplit ? 'auto' : 'none';
    }

    // --- ACTIONS ---
    playerHit() {
        const hand = this.playerHands[this.activeHandIndex];
        hand.add(this.shoe.draw());
        AudioEngine.play('card');
        
        if (hand.score.isBust) {
            hand.resolved = true;
            this.advanceHand();
        } else {
            this.renderTable();
        }
    }

    playerDouble() {
        const hand = this.playerHands[this.activeHandIndex];
        if (hand.cards.length === 2 && this.bankroll >= hand.bet) {
            this.bankroll -= hand.bet;
            hand.bet *= 2;
            hand.hasDoubled = true; // NEW: Flag the hand for sideways rendering
            
            // Visually update the table bet if it's not a split hand
            if (this.playerHands.length === 1) {
                this.currentBet = hand.bet;
            }
            this.updateFinanceUI();

            hand.add(this.shoe.draw());
            AudioEngine.play('card');
            hand.resolved = true;
            this.advanceHand();
        }
    }

    playerSplit() {
        const hand = this.playerHands[this.activeHandIndex];
        if (hand.cards.length === 2 && hand.cards[0].value === hand.cards[1].value && this.bankroll >= hand.bet) {
            this.bankroll -= hand.bet;
            this.updateFinanceUI();

            // Create new hand with the second card
            const newHand = new Hand(hand.bet);
            newHand.add(hand.cards.pop());
            
            // Deal one new card to the original hand
            hand.add(this.shoe.draw());
            AudioEngine.play('card');
            
            // Insert the new hand into the array and deal it one card
            newHand.add(this.shoe.draw());
            this.playerHands.splice(this.activeHandIndex + 1, 0, newHand);

            // Special Rule: Splitting Aces usually only gets one card each
            if (hand.cards[0].rank === 'A') {
                hand.resolved = true;
                newHand.resolved = true;
                this.advanceHand(); // Forces the loop to resolve immediately
            } else {
                this.renderTable();
            }
        }
    }

    playerStand() {
        this.playerHands[this.activeHandIndex].resolved = true;
        this.advanceHand();
    }

    advanceHand() {
        this.activeHandIndex++;
        if (this.activeHandIndex >= this.playerHands.length) {
            // All hands finished
            UI.gameControls.style.display = 'none';
            // If all hands busted, dealer doesn't need to draw
            const allBust = this.playerHands.every(h => h.score.isBust);
            if (allBust) {
                this.resolveWinner();
            } else {
                this.flipHoleCard();
                this.renderTable();
                this.dealerTurn();
            }
        } else {
            // Move to next split hand
            this.renderTable();
        }
    }

    dealerTurn() {
        let dScore = this.dealerHand.score;
        let mustHit = dScore.total < 17 || (dScore.total === 17 && dScore.isSoft && Rules.h17);
        const speed = parseInt(UI.configSpeed.value);

        if (mustHit) {
            setTimeout(() => {
                this.dealerHand.add(this.shoe.draw());
                AudioEngine.play('card');
                this.renderTable();
                this.dealerTurn();
            }, speed);
        } else {
            this.resolveWinner();
        }
    }

    resolveWinner() {
        const dScore = this.dealerHand.score.total;
        const dBust = this.dealerHand.score.isBust;
        const dBlackjack = this.dealerHand.score.isBlackjack;
        
        let totalWinnings = 0;
        let netProfit = 0;

        // 1. Process Insurance Payout (Pays 2:1)
        if (dBlackjack && this.insuranceBet > 0) {
            totalWinnings += (this.insuranceBet * 3); // Returns original bet + 2x profit
            netProfit += (this.insuranceBet * 2);
        }

        // 2. Process Standard Hands
        this.playerHands.forEach(hand => {
            const pScore = hand.score.total;
            const pBlackjack = hand.score.isBlackjack;

            if (hand.score.isBust) {
                netProfit -= hand.bet;
            } else if (dBlackjack) {
                if (pBlackjack) totalWinnings += hand.bet; // Push
                else netProfit -= hand.bet; // Loss
            } else if (dBust || pScore > dScore) {
                totalWinnings += (hand.bet * 2); 
                netProfit += hand.bet;
            } else if (dScore > pScore) {
                netProfit -= hand.bet;
            } else {
                totalWinnings += hand.bet; // Push
            }
        });

        // 3. Announce Result
        let message = "Push";
        if (dBlackjack && this.insuranceBet > 0 && netProfit >= 0) message = "Dealer Blackjack. Insurance Pays!";
        else if (dBlackjack) message = "Dealer Blackjack.";
        else if (netProfit > 0) message = "You Win!";
        else if (netProfit < 0) message = "Dealer Wins.";

        this.endRound(message, totalWinnings);
    }

    updateScores(revealDealer = false) {
        if (UI.toggleTotals.checked) {
            UI.playerScore.style.opacity = 0;
            UI.dealerScore.style.opacity = 0;
            return; // Skip calculating the UI scores
        }

        if (this.playerHands.length === 1 && this.playerHands[0].cards.length > 0) {
            const pScore = this.playerHands[0].score;
            UI.playerScore.innerText = pScore.isSoft ? `Soft ${pScore.total}` : pScore.total;
            UI.playerScore.style.opacity = 1;
        } else {
            UI.playerScore.style.opacity = 0;
        }

        const hcHidden = UI.dealerCards.children[0] && UI.dealerCards.children[0].classList.contains('card-hidden');
        if (!hcHidden && this.dealerHand.cards.length > 0) {
            const dScore = this.dealerHand.score;
            UI.dealerScore.innerText = dScore.isSoft ? `Soft ${dScore.total}` : dScore.total;
            UI.dealerScore.style.opacity = 1;
        } else if (this.dealerHand.cards.length > 1) {
            const dUpCardValue = this.dealerHand.cards[1].value;
            UI.dealerScore.innerText = dUpCardValue === 11 ? '11 (A)' : dUpCardValue;
            UI.dealerScore.style.opacity = 1;
        }
    }

    endRound(message, payoutAmount) {
        this.flipHoleCard();
        this.renderTable();

        const speed = parseInt(UI.configSpeed.value);
        const skipBanner = UI.toggleBanner.checked;

        // Display Banner (unless skipped)
        if (!skipBanner) {
            UI.gameMessage.innerText = message;
            UI.gameMessage.style.display = 'block';
        } else {
            // Drop a small, non-intrusive toast instead
            this.showFeedback(message, 1500); 
        }
        
        UI.gameControls.style.display = 'none';
        
        // Calculate reset delay based on speed setting
        let resetDelay = skipBanner ? speed + 800 : 2500; 
        if (speed === 0) resetDelay = skipBanner ? 500 : 1500; // Buffer for instant mode

        setTimeout(() => {
            // FIXED: Corrected the audio trigger to compare against this.currentBet
            if (payoutAmount === "blackjack" || (typeof payoutAmount === 'number' && payoutAmount > this.currentBet)) {
                AudioEngine.play('win');
            } else if (payoutAmount === 0 && !message.includes("Push")) {
                AudioEngine.play('loss');
            }
            
            // RESTORED: The actual payout math that adds winnings to your bankroll!
            if (payoutAmount === "blackjack" && !UI.toggleBankroll.checked) {
                this.bankroll += this.currentBet + (this.currentBet * Rules.blackjackPayout);
            } else if (typeof payoutAmount === 'number' && !UI.toggleBankroll.checked) {
                this.bankroll += payoutAmount;
            }
            
            this.currentBet = 0;
            this.updateFinanceUI();
            UI.betControls.style.display = 'flex';
            UI.gameMessage.style.display = 'none';
            UI.insuranceStack.innerHTML = '';
            UI.insuranceArea.style.display = 'none';
            UI.chipStack.innerHTML = '';
            
            if (this.shoe.needsShuffle) {
                this.shoe.buildAndShuffle();
                this.runningCount = 0;
                this.updateCountUI();

                AudioEngine.play('shuffle'); 
                
                if (!skipBanner) {
                    UI.gameMessage.innerText = "SHUFFLING SHOE...";
                    UI.gameMessage.style.display = 'block';
                    setTimeout(() => { UI.gameMessage.style.display = 'none'; }, 1500);
                } else {
                    this.showFeedback("Shuffling Shoe...", 1500);
                }
            }
        }, resetDelay); 
    }

    // --- BASIC STRATEGY EVALUATOR ---
    evaluatePlay(playerAction) {

        // NEW: Abort grader if Casual Mode is enabled
        if (UI.toggleCasual.checked) return;

        const activeHand = this.playerHands[this.activeHandIndex];
        if (activeHand.score.isBust || UI.gameControls.style.display === 'none') return;

        const dCard = this.dealerHand.cards[1].value;
        const dIndex = dCard === 11 ? 9 : dCard - 2; 
        
        let optimalPlay = 'S';
        const pTotal = activeHand.score.total;
        const isPair = activeHand.cards.length === 2 && activeHand.cards[0].value === activeHand.cards[1].value;
        const isSoft = activeHand.score.isSoft;
        
        // Calculate exact True Count dynamically
        const decksRem = Math.max(1, Math.round((this.shoe.cards.length / 52) * 2) / 2);
        const currentTC = Math.floor(this.runningCount / decksRem);
        const devKey = `${pTotal}_${dCard}`;

        // 1. Check for Illustrious 18 Deviations FIRST
        if (Strategy.deviations[devKey] && activeHand.cards.length === 2) {
            const [threshold, devPlay, bsPlay] = Strategy.deviations[devKey];
            optimalPlay = (currentTC >= threshold) ? devPlay : bsPlay;
        } 
        // 2. Check Pair Strategy
        else if (isPair) {
            const pairVal = activeHand.cards[0].rank === 'A' ? 11 : activeHand.cards[0].value;
            optimalPlay = Strategy.pair[pairVal][dIndex];
        } 
        // 3. Check Soft Strategy
        else if (isSoft && pTotal <= 21) {
            const nonAceVal = pTotal - 11;
            optimalPlay = Strategy.soft[nonAceVal][dIndex];
        } 
        // 4. Check Hard Strategy
        else if (pTotal <= 21) {
            let lookupTotal = Math.max(5, pTotal); 
            optimalPlay = Strategy.hard[lookupTotal][dIndex];
        }

        if (optimalPlay === 'D' && activeHand.cards.length > 2) {
            optimalPlay = (isSoft && pTotal >= 18) ? 'S' : 'H';
        }

        // Update Analytics Tracker
        this.decisionsTotal++;
        
        if (playerAction === optimalPlay) {
            this.decisionsCorrect++;
        } else {
            const actionNames = { 'H': 'Hit', 'S': 'Stand', 'D': 'Double', 'P': 'Split' };
            this.showFeedback(`Error: Optimal play is ${actionNames[optimalPlay]}`, 2500);
        }

        // Update the UI Tracker
        const accuracy = Math.round((this.decisionsCorrect / this.decisionsTotal) * 100);
        UI.sessionStats.innerText = `Accuracy: ${accuracy}%`;
        
        // Color code the accuracy badge
        if (accuracy === 100) UI.sessionStats.style.color = '#2ecc71'; // Green
        else if (accuracy > 85) UI.sessionStats.style.color = '#f1c40f'; // Yellow
        else UI.sessionStats.style.color = '#e74c3c'; // Red
    }

    showFeedback(message, duration = 2500) {
        if (!UI.apFeedback) return;
        UI.apFeedback.innerText = message;
        UI.apFeedback.classList.add('show');
        setTimeout(() => { UI.apFeedback.classList.remove('show'); }, duration);
    }
}

// Initialize the Game!
const Game = new GameManager();