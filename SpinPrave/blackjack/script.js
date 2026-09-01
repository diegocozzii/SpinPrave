// blackjack/script.js - Motore Blackjack Live con Distribuzione Standard
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CHIP_COLORS = { 1: '#ff9800', 5: '#f44336', 10: '#4caf50', 25: '#2196f3', 50: '#9c27b0', 100: '#333' };

let deck = [];
let hands = [[]];
let activeHandIdx = 0;
let handBets = [0];
let isSplit = false;
let dealerHand = [];
let currentBet = 0;
let insuranceBet = 0;
let selectedChipVal = 1;
let gameState = 'BETTING';

// Elementi UI
const balanceEl = document.getElementById('balance');
const currentBetEl = document.getElementById('current-bet');
const bjMsgEl = document.getElementById('bj-msg');
const refillBtn = document.getElementById('refill-btn');
const cardsLeftEl = document.getElementById('cards-left');
const dealerScoreEl = document.getElementById('dealer-score');
const dealerCardsEl = document.getElementById('dealer-cards');
const tableChipStack = document.getElementById('table-chip-stack');
const betCircleEl = document.getElementById('bj-bet-circle');
const chipsContainer = document.getElementById('chips-container');

// Tasti
const btnClear = document.getElementById('btn-clear');
const btnDeal = document.getElementById('btn-deal');
const btnHit = document.getElementById('btn-hit');
const btnStand = document.getElementById('btn-stand');
const btnDouble = document.getElementById('btn-double');
const btnSplit = document.getElementById('btn-split');
const btnInsYes = document.getElementById('btn-ins-yes');
const btnInsNo = document.getElementById('btn-ins-no');

// Selezione Fiche
document.querySelectorAll('.chip-item').forEach(c => {
    c.addEventListener('click', () => {
        if (gameState !== 'BETTING') return;
        document.querySelectorAll('.chip-item').forEach(i => i.classList.remove('active'));
        c.classList.add('active');
        selectedChipVal = parseInt(c.dataset.val);
    });
});

function initDeck() {
    deck = [];
    const numDecks = 6;
    for (let d = 0; d < numDecks; d++) {
        for (let s of SUITS) {
            for (let v of VALUES) {
                deck.push({
                    suit: s,
                    val: v,
                    rawVal: (['K', 'Q', 'J'].includes(v) ? 10 : (v === 'A' ? 11 : parseInt(v))),
                    color: (s === '♥' || s === '♦') ? 'red' : 'black'
                });
            }
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    cardsLeftEl.innerText = deck.length;
}

function drawCard() {
    if (deck.length < 20) initDeck();
    const card = deck.pop();
    cardsLeftEl.innerText = deck.length;
    return card;
}

function calculateHand(hand) {
    let score = 0;
    let aces = 0;
    for (let c of hand) {
        if (c.val === 'A') {
            aces++;
            score += 11;
        } else if (['K', 'Q', 'J'].includes(c.val)) {
            score += 10;
        } else {
            score += parseInt(c.val);
        }
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function placeChipOnTable() {
    if (gameState !== 'BETTING') return;
    const balance = getPraveBalance();
    if (balance < selectedChipVal) return;

    deductPraveBalance(selectedChipVal);
    currentBet += selectedChipVal;
    updateUI();
    renderTableChip();
}

function renderTableChip() {
    if (currentBet > 0) {
        tableChipStack.innerHTML = `<div class="chip" style="background-color:${CHIP_COLORS[selectedChipVal]}">${currentBet}</div>`;
    } else {
        tableChipStack.innerHTML = '';
    }
}

function clearBet() {
    if (gameState !== 'BETTING' || currentBet === 0) return;
    addPraveBalance(currentBet);
    currentBet = 0;
    renderTableChip();
    updateUI();
}

function renderCard(card, isHidden = false) {
    const div = document.createElement('div');
    if (isHidden) {
        div.className = 'bj-card hidden-card';
        div.id = 'hidden-dealer-card';
    } else {
        div.className = `bj-card ${card.color}`;
        div.innerHTML = `
            <div class="card-top">${card.val}</div>
            <div class="card-suit">${card.suit}</div>
            <div class="card-bot">${card.val}</div>
        `;
    }
    return div;
}

function updateUI() {
    const bal = getPraveBalance();
    balanceEl.innerText = bal;
    currentBetEl.innerText = currentBet;
    refillBtn.style.display = (bal <= 0 && currentBet <= 0) ? 'block' : 'none';
}

function refillBJBalance() {
    setPraveBalance(1000);
    updateUI();
    bjMsgEl.innerText = 'RICARICATO!';
}

function setActionButtons(phase) {
    btnClear.style.display = 'none';
    btnDeal.style.display = 'none';
    btnHit.style.display = 'none';
    btnStand.style.display = 'none';
    btnDouble.style.display = 'none';
    btnSplit.style.display = 'none';
    btnInsYes.style.display = 'none';
    btnInsNo.style.display = 'none';

    if (phase === 'BETTING') {
        btnClear.style.display = 'inline-block';
        btnDeal.style.display = 'inline-block';
        chipsContainer.style.opacity = '1';
        chipsContainer.style.pointerEvents = 'auto';
        betCircleEl.classList.remove('in-game');
    } else if (phase === 'INSURANCE') {
        btnInsYes.style.display = 'inline-block';
        btnInsNo.style.display = 'inline-block';
        chipsContainer.style.opacity = '0.3';
        chipsContainer.style.pointerEvents = 'none';
    } else if (phase === 'PLAYING') {
        chipsContainer.style.opacity = '0.3';
        chipsContainer.style.pointerEvents = 'none';
        betCircleEl.classList.add('in-game');

        btnHit.style.display = 'inline-block';
        btnStand.style.display = 'inline-block';

        const curHand = hands[activeHandIdx];
        const curScore = calculateHand(curHand);
        const bal = getPraveBalance();

        if (curHand.length === 2 && [9, 10, 11].includes(curScore) && bal >= handBets[activeHandIdx]) {
            btnDouble.style.display = 'inline-block';
        }

        if (!isSplit && curHand.length === 2 && curHand[0].rawVal === curHand[1].rawVal && bal >= currentBet) {
            btnSplit.style.display = 'inline-block';
        }
    }
}

// DISTRIBUZIONE SEQUENZIALE REGOLAMENTARE
function startDeal() {
    if (gameState !== 'BETTING' || currentBet === 0) {
        bjMsgEl.innerText = 'PIAZZA UNA PUNTATA PRIMA!';
        return;
    }

    gameState = 'DEALING';
    setActionButtons('DEALING');
    bjMsgEl.innerText = 'DISTRIBUZIONE...';
    bjMsgEl.className = '';

    hands = [[]];
    handBets = [currentBet];
    activeHandIdx = 0;
    isSplit = false;
    insuranceBet = 0;
    dealerHand = [];

    // Reset schermata
    dealerCardsEl.innerHTML = '';
    document.getElementById('player-cards-0').innerHTML = '';
    document.getElementById('player-cards-1').innerHTML = '';
    document.getElementById('hand-1-area').style.display = 'none';
    document.getElementById('hand-0-area').classList.add('active-hand');
    document.getElementById('hand-1-area').classList.remove('active-hand');
    dealerScoreEl.innerText = '-';
    document.getElementById('player-score-0').innerText = '-';
    document.getElementById('player-score-1').innerText = '-';

    // 1. Prima carta Giocatore (SCOPERTA)
    setTimeout(() => {
        const c1 = drawCard();
        hands[0].push(c1);
        document.getElementById('player-cards-0').appendChild(renderCard(c1));
        document.getElementById('player-score-0').innerText = calculateHand(hands[0]);

        // 2. Prima carta Banco (SCOPERTA)
        setTimeout(() => {
            const d1 = drawCard();
            dealerHand.push(d1);
            dealerCardsEl.appendChild(renderCard(d1));
            dealerScoreEl.innerText = calculateHand(dealerHand);

            // 3. Seconda carta Giocatore (SCOPERTA)
            setTimeout(() => {
                const c2 = drawCard();
                hands[0].push(c2);
                document.getElementById('player-cards-0').appendChild(renderCard(c2));
                const pScore = calculateHand(hands[0]);
                document.getElementById('player-score-0').innerText = pScore;

                // 4. Seconda carta Banco (COPERTA)
                setTimeout(() => {
                    const d2 = drawCard();
                    dealerHand.push(d2);
                    dealerCardsEl.appendChild(renderCard(d2, true)); // Mostra retro carta coperta

                    // Verifica Assicurazione se banco mostra Asso
                    if (d1.val === 'A' && getPraveBalance() >= Math.floor(currentBet / 2)) {
                        gameState = 'INSURANCE';
                        setActionButtons('INSURANCE');
                        bjMsgEl.innerText = `IL BANCO HA UN ASSO! ASSICURI PER ${Math.floor(currentBet / 2)} PC?`;
                    } else {
                        checkInitialBlackjack();
                    }
                }, 400);

            }, 400);

        }, 400);

    }, 200);
}

function takeInsurance(accepted) {
    if (accepted) {
        insuranceBet = Math.floor(currentBet / 2);
        deductPraveBalance(insuranceBet);
        updateUI();
        bjMsgEl.innerText = `ASSICURAZIONE ACCETTATA (${insuranceBet} PC)`;
    } else {
        bjMsgEl.innerText = `ASSICURAZIONE RIFIUTATA`;
    }

    setTimeout(() => {
        checkInitialBlackjack();
    }, 700);
}

function checkInitialBlackjack() {
    const pScore = calculateHand(hands[0]);
    if (pScore === 21) {
        gameState = 'PLAYING';
        bjMsgEl.innerText = 'BLACKJACK!';
        setTimeout(playerStand, 600);
    } else {
        gameState = 'PLAYING';
        setActionButtons('PLAYING');
        bjMsgEl.innerText = 'TUA SCELTA...';
    }
}

function playerHit() {
    if (gameState !== 'PLAYING') return;
    const card = drawCard();
    hands[activeHandIdx].push(card);
    document.getElementById(`player-cards-${activeHandIdx}`).appendChild(renderCard(card));

    const pScore = calculateHand(hands[activeHandIdx]);
    document.getElementById(`player-score-${activeHandIdx}`).innerText = pScore;

    btnDouble.style.display = 'none';
    btnSplit.style.display = 'none';

    if (pScore > 21) {
        handleHandEnd();
    } else if (pScore === 21) {
        playerStand();
    }
}

function playerDouble() {
    if (gameState !== 'PLAYING') return;
    const betToMatch = handBets[activeHandIdx];
    if (getPraveBalance() < betToMatch) return;

    deductPraveBalance(betToMatch);
    handBets[activeHandIdx] += betToMatch;
    currentBet += betToMatch;
    renderTableChip();
    updateUI();

    const card = drawCard();
    hands[activeHandIdx].push(card);
    document.getElementById(`player-cards-${activeHandIdx}`).appendChild(renderCard(card));
    document.getElementById(`player-score-${activeHandIdx}`).innerText = calculateHand(hands[activeHandIdx]);

    setTimeout(playerStand, 500);
}

function playerSplit() {
    if (gameState !== 'PLAYING' || isSplit || getPraveBalance() < currentBet) return;
    isSplit = true;
    deductPraveBalance(currentBet);
    handBets.push(currentBet);
    currentBet *= 2;
    renderTableChip();
    updateUI();

    const card1 = hands[0][0];
    const card2 = hands[0][1];

    hands = [[card1], [card2]];

    document.getElementById('hand-1-area').style.display = 'flex';
    document.getElementById('player-cards-0').innerHTML = '';
    document.getElementById('player-cards-1').innerHTML = '';

    document.getElementById('player-cards-0').appendChild(renderCard(card1));
    document.getElementById('player-cards-1').appendChild(renderCard(card2));

    const newCard0 = drawCard();
    const newCard1 = drawCard();
    hands[0].push(newCard0);
    hands[1].push(newCard1);

    document.getElementById('player-cards-0').appendChild(renderCard(newCard0));
    document.getElementById('player-cards-1').appendChild(renderCard(newCard1));

    document.getElementById('player-score-0').innerText = calculateHand(hands[0]);
    document.getElementById('player-score-1').innerText = calculateHand(hands[1]);

    if (card1.val === 'A') {
        bjMsgEl.innerText = 'SPLIT SU ASSI: 1 CARTA CIASCUNO';
        setTimeout(() => {
            activeHandIdx = 0;
            gameState = 'DEALER_TURN';
            dealerTurn();
        }, 1200);
        return;
    }

    activeHandIdx = 0;
    setActionButtons('PLAYING');
    bjMsgEl.innerText = 'GIOCA PRIMA MANO...';
}

function playerStand() {
    if (gameState !== 'PLAYING') return;
    handleHandEnd();
}

function handleHandEnd() {
    if (isSplit && activeHandIdx === 0) {
        activeHandIdx = 1;
        document.getElementById('hand-0-area').classList.remove('active-hand');
        document.getElementById('hand-1-area').classList.add('active-hand');
        setActionButtons('PLAYING');
        bjMsgEl.innerText = 'GIOCA SECONDA MANO...';
    } else {
        gameState = 'DEALER_TURN';
        setActionButtons('NONE');
        dealerTurn();
    }
}

function dealerTurn() {
    // Scopre la seconda carta del banco
    const hiddenCardEl = document.getElementById('hidden-dealer-card');
    if (hiddenCardEl) {
        dealerCardsEl.replaceChild(renderCard(dealerHand[1]), hiddenCardEl);
    }

    let dScore = calculateHand(dealerHand);
    dealerScoreEl.innerText = dScore;

    const allBusted = hands.every(h => calculateHand(h) > 21);
    if (allBusted) {
        evalResults();
        return;
    }

    function dealerLoop() {
        if (dScore < 17) {
            setTimeout(() => {
                const card = drawCard();
                dealerHand.push(card);
                dealerCardsEl.appendChild(renderCard(card));
                dScore = calculateHand(dealerHand);
                dealerScoreEl.innerText = dScore;
                dealerLoop();
            }, 600);
        } else {
            evalResults();
        }
    }
    dealerLoop();
}

function evalResults() {
    gameState = 'RESOLVED';
    const dScore = calculateHand(dealerHand);
    const isDealerBJ = (dealerHand.length === 2 && dScore === 21);
    let totalWin = 0;
    let messages = [];

    // Assicurazione
    if (insuranceBet > 0) {
        if (isDealerBJ) {
            const insPayout = insuranceBet * 3;
            addPraveBalance(insPayout);
            messages.push(`ASSICURAZIONE VINCENTE (+${insuranceBet * 2} PC)`);
        } else {
            messages.push(`ASSICURAZIONE PERSA`);
        }
    }

    // Risultati mani
    hands.forEach((hand, idx) => {
        const pScore = calculateHand(hand);
        const bet = handBets[idx];
        const isPlayerBJ = (!isSplit && hand.length === 2 && pScore === 21);

        if (pScore > 21) {
            messages.push(`Mano ${idx + 1}: SBALLATO (-${bet} PC)`);
        } else if (isPlayerBJ && !isDealerBJ) {
            const win = bet + Math.floor(bet * 1.5);
            addPraveBalance(win);
            totalWin += win;
            messages.push(`Mano ${idx + 1}: BLACKJACK (+${Math.floor(bet * 1.5)} PC)`);
        } else if (isDealerBJ && !isPlayerBJ) {
            messages.push(`Mano ${idx + 1}: BANCO BJ (-${bet} PC)`);
        } else if (dScore > 21) {
            const win = bet * 2;
            addPraveBalance(win);
            totalWin += win;
            messages.push(`Mano ${idx + 1}: BANCO SBALLA (+${bet} PC)`);
        } else if (pScore > dScore) {
            const win = bet * 2;
            addPraveBalance(win);
            totalWin += win;
            messages.push(`Mano ${idx + 1}: VINTO (+${bet} PC)`);
        } else if (pScore === dScore) {
            addPraveBalance(bet);
            totalWin += bet;
            messages.push(`Mano ${idx + 1}: PARI`);
        } else {
            messages.push(`Mano ${idx + 1}: PERSO (-${bet} PC)`);
        }
    });

    bjMsgEl.innerText = messages.join(' • ');
    bjMsgEl.className = totalWin > 0 ? 'msg-win' : 'msg-loss';

    setTimeout(() => {
        currentBet = 0;
        insuranceBet = 0;
        hands = [[]];
        dealerHand = [];
        renderTableChip();
        updateUI();
        setActionButtons('BETTING');
        bjMsgEl.innerText = 'PIAZZA LA TUA PUNTATA';
        bjMsgEl.className = '';
        dealerScoreEl.innerText = '-';
        document.getElementById('player-score-0').innerText = '-';
        document.getElementById('player-score-1').innerText = '-';
        dealerCardsEl.innerHTML = '';
        document.getElementById('player-cards-0').innerHTML = '';
        document.getElementById('player-cards-1').innerHTML = '';
        document.getElementById('hand-1-area').style.display = 'none';
        gameState = 'BETTING';
    }, 4500);
}

// Inizializzazione
initDeck();
updateUI();
setActionButtons('BETTING');