// shared.js - Gestione Saldo Condiviso PraveCoin
const PRAVE_STORAGE_KEY = 'prave_casino_balance';
const DEFAULT_BALANCE = 1000;

function getPraveBalance() {
    const stored = localStorage.getItem(PRAVE_STORAGE_KEY);
    if (stored === null || isNaN(parseInt(stored))) {
        localStorage.setItem(PRAVE_STORAGE_KEY, DEFAULT_BALANCE);
        return DEFAULT_BALANCE;
    }
    return parseInt(stored);
}

function setPraveBalance(newBalance) {
    const val = Math.max(0, Math.floor(newBalance));
    localStorage.setItem(PRAVE_STORAGE_KEY, val);
    return val;
}

function addPraveBalance(amount) {
    const cur = getPraveBalance();
    return setPraveBalance(cur + amount);
}

function deductPraveBalance(amount) {
    const cur = getPraveBalance();
    if (cur >= amount) {
        setPraveBalance(cur - amount);
        return true;
    }
    return false;
}