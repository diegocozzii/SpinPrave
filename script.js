const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const chipColors = { 1: '#ff9800', 5: '#f44336', 10: '#4caf50', 25: '#2196f3', 50: '#9c27b0', 100: '#333' };

let balance = 1000;
let bets = {};
let isSpinning = false;
let selectedValue = 1;
let ballVisible = false;
let ballAngle = 0;
let ballRadius = 135;

// Timer e Cronologia
let bettingTimeLeft = 15;
let timerInterval = null;
const history = [];

const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const msgEl = document.getElementById('msg');
const timerValEl = document.getElementById('timer-val');
const timerBoxEl = document.querySelector('.timer-box');
const refillBtn = document.getElementById('refill-btn');
const historyListEl = document.getElementById('history-list');

document.querySelectorAll('.chip-item').forEach(c => {
    c.addEventListener('click', () => {
        if (isSpinning) return;
        document.querySelectorAll('.chip-item').forEach(i => i.classList.remove('active'));
        c.classList.add('active');
        selectedValue = parseInt(c.dataset.val);
    });
});

function init() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let c = 0; c < 12; c++) {
        for (let r = 2; r >= 0; r--) {
            const num = (c * 3) + (r + 1);
            const div = document.createElement('div');
            div.className = `num-cell bet-spot ${reds.includes(num) ? 'red' : 'black'}`;
            div.innerText = num;
            div.dataset.type = 'plein';
            div.dataset.val = num;
            div.id = `cell-${num}`;
            grid.appendChild(div);
        }
    }

    document.querySelectorAll('.bet-spot').forEach(spot => {
        spot.addEventListener('click', () => {
            if (isSpinning || balance < selectedValue) return;
            balance -= selectedValue;
            const id = spot.id || `out-${spot.dataset.type}-${spot.dataset.val}`;
            if (!bets[id]) bets[id] = { type: spot.dataset.type, val: spot.dataset.val, amount: 0, el: spot, color: chipColors[selectedValue] };
            bets[id].amount += selectedValue;
            bets[id].color = chipColors[selectedValue];
            updateChips();
            updateUI();
        });
    });

    render(0);
    startBettingTimer();
}

function startBettingTimer() {
    clearInterval(timerInterval);
    bettingTimeLeft = 15;
    timerValEl.innerText = bettingTimeLeft;
    timerBoxEl.classList.remove('timer-pulse');

    timerInterval = setInterval(() => {
        if (isSpinning) return;
        bettingTimeLeft--;
        timerValEl.innerText = bettingTimeLeft;

        if (bettingTimeLeft <= 5) {
            timerBoxEl.classList.add('timer-pulse');
        }

        if (bettingTimeLeft <= 0) {
            clearInterval(timerInterval);
            timerBoxEl.classList.remove('timer-pulse');
            spinBall(); // Gira sempre, a prescindere dalle puntate
        }
    }, 1000);
}

function triggerManualSpin() {
    if (isSpinning) return;
    clearInterval(timerInterval);
    timerBoxEl.classList.remove('timer-pulse');
    spinBall();
}

function updateChips() {
    document.querySelectorAll('.chip').forEach(c => c.remove());
    for (let id in bets) {
        const b = bets[id];
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerText = b.amount;
        chip.style.backgroundColor = b.color;
        b.el.appendChild(chip);
    }
}

function drawWheel() {
    const center = 175, slice = (Math.PI * 2) / 37;
    ctx.clearRect(0, 0, 350, 350);
    for (let i = 0; i < 37; i++) {
        const theta = (i * slice) - (Math.PI / 2);
        ctx.beginPath();
        ctx.fillStyle = wheelOrder[i] === 0 ? '#0a632e' : (reds.includes(wheelOrder[i]) ? '#b71c1c' : '#1a1a1a');
        ctx.moveTo(center, center);
        ctx.arc(center, center, center - 10, theta, theta + slice);
        ctx.fill();
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(theta + slice / 2);
        ctx.fillStyle = "white";
        ctx.font = "bold 15px Arial";
        ctx.fillText(wheelOrder[i], center - 42, 5);
        ctx.restore();
    }
    ctx.beginPath();
    ctx.fillStyle = "#222";
    ctx.arc(center, center, center - 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ffcc00";
    ctx.moveTo(center - 15, 0); ctx.lineTo(center + 15, 0); ctx.lineTo(center, 25);
    ctx.fill();
}

function render(angleBall) {
    drawWheel();
    if (ballVisible) {
        const center = 175;
        const bx = center + ballRadius * Math.cos(angleBall - (Math.PI / 2));
        const by = center + ballRadius * Math.sin(angleBall - (Math.PI / 2));
        ctx.beginPath();
        ctx.fillStyle = "#0d00ff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#0d00ff";
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function spinBall() {
    isSpinning = true;
    ballVisible = true;
    document.getElementById('spin-btn').disabled = true;
    msgEl.innerText = "GIOCHI CHIUSI...";
    msgEl.className = "";

    const winIdx = Math.floor(Math.random() * 37);
    const winNum = wheelOrder[winIdx];
    const slice = (Math.PI * 2) / 37;
    const totalRotation = (Math.PI * 2 * 10) + (winIdx * slice) + (slice / 2);
    const duration = 4500;
    const start = performance.now();

    function animate(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 4);
        ballAngle = totalRotation * ease;
        ballRadius = 145 - (t * 15);
        render(ballAngle);
        if (t < 1) requestAnimationFrame(animate);
        else {
            isSpinning = false;
            document.getElementById('spin-btn').disabled = false;
            resolve(winNum);
        }
    }
    requestAnimationFrame(animate);
}

function updateHistory(winNum) {
    history.unshift(winNum);
    if (history.length > 5) history.pop();
    historyListEl.innerHTML = '';
    history.forEach(num => {
        const badge = document.createElement('div');
        const colorClass = num === 0 ? 'green' : (reds.includes(num) ? 'red' : 'black');
        badge.className = `history-badge ${colorClass}`;
        badge.innerText = num;
        historyListEl.appendChild(badge);
    });
}

function resolve(winNum) {
    let winTotal = 0;
    let totalBetOnTable = 0;
    const hadBets = Object.keys(bets).length > 0;

    for (let id in bets) {
        const b = bets[id];
        totalBetOnTable += b.amount;
        let win = false, mult = 0;
        switch(b.type) {
            case 'plein': win = winNum == b.val; mult = 35; break;
            case 'color': win = (winNum !== 0 && (reds.includes(winNum) ? 'red' : 'black') === b.val); mult = 1; break;
            case 'dozen': 
                if(b.val === '1st') win = winNum >= 1 && winNum <= 12;
                else if(b.val === '2nd') win = winNum >= 13 && winNum <= 24;
                else win = winNum >= 25 && winNum <= 36;
                mult = 2; break;
            case 'even-odd': win = (winNum !== 0 && (winNum % 2 === 0 ? 'even' : 'odd') === b.val); mult = 1; break;
            case 'range': win = (b.val === '1-18' ? winNum >= 1 && winNum <= 18 : winNum >= 19 && winNum <= 36); mult = 1; break;
            case 'col': win = (winNum !== 0 && winNum % 3 === (parseInt(b.val) % 3 === 0 ? 0 : parseInt(b.val) % 3)); mult = 2; break;
        }
        if (win) winTotal += (b.amount * mult) + b.amount;
    }

    balance += winTotal;
    updateHistory(winNum);

    if (hadBets) {
        if (winTotal > 0) {
            msgEl.innerText = `USCITO IL ${winNum} - HAI VINTO ${winTotal} PC!`;
            msgEl.className = "msg-win";
        } else {
            msgEl.innerText = `USCITO IL ${winNum} - HAI PERSO ${totalBetOnTable} PC`;
            msgEl.className = "msg-loss";
        }
    } else {
        // Giro a vuoto senza puntate
        msgEl.innerText = `USCITO IL ${winNum} - NESSUNA PUNTATA`;
        msgEl.className = "";
    }

    bets = {};
    setTimeout(() => {
        updateChips();
        updateUI();
        ballVisible = false;
        render(0);
        msgEl.innerText = "FAI IL TUO GIOCO";
        msgEl.className = "";
        startBettingTimer();
    }, 3000);
}

function updateUI() {
    document.getElementById('balance').innerText = Math.floor(balance);
    let total = 0;
    for (let id in bets) total += bets[id].amount;
    document.getElementById('current-total-bet').innerText = total;
    refillBtn.style.display = (balance <= 0 && total <= 0) ? "block" : "none";
}

function refillBalance() { 
    balance = 1000; 
    updateUI(); 
    msgEl.innerText = "RICARICATO!"; 
    msgEl.className = ""; 
}

function manualReset() {
    if (isSpinning) return;
    for (let id in bets) balance += bets[id].amount;
    bets = {}; 
    updateChips(); 
    updateUI();
}

init();