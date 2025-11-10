// CORE DATA STRUCTURE
let data = JSON.parse(localStorage.getItem('budgetData')) || {
    transactions: [], debts: [], goals: [],
    categories: ['Food', 'Bills', 'Transport', 'Shopping', 'Other'],
    budgetLimits: [], theme: 'light', lastUpdated: 'Never'
};

// --- INIT & UTILS ---
function init() {
    applyTheme(data.theme);
    const today = new Date().toISOString().split('T')[0];
    // Set all date inputs to today by default
    document.querySelectorAll('input[type="date"]').forEach(el => el.value = today);
    updateAll();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-toggle').textContent = theme === 'light' ? '🌙' : '☀️';
}

function toggleTheme() {
    data.theme = data.theme === 'light' ? 'dark' : 'light';
    applyTheme(data.theme);
    saveData();
}

function saveData() {
    data.lastUpdated = new Date().toLocaleString();
    localStorage.setItem('budgetData', JSON.stringify(data));
    updateAll();
}

function updateAll() {
    updateDashboard();
    updateTransactions();
    updateDebts();
    updateGoals();
    updateSettings();
    document.getElementById('last-updated').textContent = `Last updated: ${data.lastUpdated}`;
}

// --- DASHBOARD & CHARTS ---
function updateDashboard() {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    let mIncome = 0, mExpense = 0, mExpensesCat = {};

    data.transactions.forEach(t => {
        const tMonth = new Date(t.date).toLocaleString('default', { month: 'long', year: 'numeric' });
        if (tMonth === currentMonth) {
            if (t.type === 'income') mIncome += t.amount;
            else {
                mExpense += t.amount;
                mExpensesCat[t.category] = (mExpensesCat[t.category] || 0) + t.amount;
            }
        }
    });

    document.getElementById('total-income').textContent = `₱${mIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('total-expense').textContent = `₱${mExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('total-debt').textContent = `₱${data.debts.reduce((sum, d) => sum + (d.initial - d.paid), 0).toLocaleString()}`;
    document.getElementById('total-savings').textContent = `₱${data.goals.reduce((sum, g) => sum + g.saved, 0).toLocaleString()}`;

    drawChart(mExpensesCat, mExpense);
    checkAlerts(mExpensesCat);
}

function drawChart(expenses, total) {
    const chart = document.getElementById('budget-chart');
    const legend = document.getElementById('chart-legend');
    if (total === 0) {
        chart.style.background = 'var(--border)';
        legend.innerHTML = '<small style="color:var(--text-muted)">No expenses yet this month</small>';
        return;
    }
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    let gradient = [], start = 0, legendHtml = '';
    Object.entries(expenses).forEach(([cat, amount], i) => {
        const color = colors[i % colors.length];
        const percent = (amount / total) * 100;
        gradient.push(`${color} ${start}% ${start + percent}%`);
        start += percent;
        legendHtml += `<div class="legend-item"><div class="color-dot" style="background:${color}"></div> ${cat} (${percent.toFixed(0)}%)</div>`;
    });
    chart.style.background = `conic-gradient(${gradient.join(', ')})`;
    legend.innerHTML = legendHtml;
}

function checkAlerts(currentExpenses) {
    const list = document.getElementById('alerts-list');
    list.innerHTML = '';
    data.budgetLimits.forEach(l => {
        if ((currentExpenses[l.category] || 0) >= l.limit) {
            list.innerHTML += `<li style="color:var(--danger); border-left-color:var(--danger)">⚠️ <strong>${l.category}</strong> exceeded budget!</li>`;
        }
    });
}

// --- TRANSACTIONS ---
document.getElementById('transaction-form').addEventListener('submit', e => {
    e.preventDefault();
    data.transactions.push({
        id: Date.now(),
        date: document.getElementById('trans-date').value,
        type: document.getElementById('trans-type').value,
        amount: parseFloat(document.getElementById('trans-amount').value),
        category: document.getElementById('trans-category').value,
        desc: document.getElementById('trans-desc').value
    });
    saveData(); e.target.reset(); document.getElementById('trans-date').valueAsDate = new Date();
});

function updateTransactions() {
    const list = document.getElementById('trans-list');
    const term = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('filter-type') ? document.getElementById('filter-type').value : ''; // Safety check if filter-type exists
    
    list.innerHTML = '';
    data.transactions.filter(t => 
        (t.desc.toLowerCase().includes(term) || t.category.toLowerCase().includes(term)) && 
        (!typeFilter || t.type === typeFilter)
    ).slice().reverse().slice(0, 50).forEach(t => { // Increased limit to 50
        const isExp = t.type === 'expense';
        list.innerHTML += `
            <li style="border-left-color: ${isExp ? 'var(--danger)' : 'var(--success)'}">
                <div><strong>${t.category}</strong> <small style="opacity:0.7; margin-left:5px">${t.date}</small><br><span style="color:var(--text-muted)">${t.desc}</span></div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-weight:700; font-size:1.1rem; color:${isExp ? 'var(--danger)' : 'var(--success)'}">
                        ${isExp ? '-' : '+'}₱${t.amount.toLocaleString()}
                    </span>
                    <button onclick="deleteItem('transactions', ${t.id})" class="delete-btn" title="Delete transaction">×</button>
                </div>
            </li>`;
    });
}

function applySearchFilter() {
    // Just toggle visibility of advanced options if desired, or just trigger update
    const filterOpts = document.getElementById('filter-options');
    if(filterOpts) filterOpts.style.display = filterOpts.style.display === 'none' ? 'block' : 'none';
    updateTransactions();
}
function clearFilters() {
    document.getElementById('search-input').value = '';
    if(document.getElementById('filter-type')) document.getElementById('filter-type').value = '';
    if(document.getElementById('filter-options')) document.getElementById('filter-options').style.display = 'none';
    updateTransactions();
}

// --- DEBTS & SAVINGS (Unified Delete Logic) ---
function deleteItem(type, idOrIndex) {
    if (confirm('Are you sure you want to delete this?')) {
        if (type === 'transactions') data.transactions = data.transactions.filter(t => t.id !== idOrIndex);
        else if (type === 'debts') data.debts.splice(idOrIndex, 1);
        else if (type === 'goals') data.goals.splice(idOrIndex, 1);
        saveData();
    }
}

document.getElementById('debt-form').addEventListener('submit', e => {
    e.preventDefault();
    if(confirm('Add this new debt record?')) {
        data.debts.push({ name: document.getElementById('debt-name').value, initial: parseFloat(document.getElementById('debt-amount').value), paid: 0 });
        saveData(); e.target.reset(); alert('Debt added successfully!');
    }
});
function updateDebts() {
    document.getElementById('debt-list').innerHTML = data.debts.map((d,i) => `
        <li style="border-left-color: var(--accent)">
            <div onclick="openPaymentModal(${i})" style="flex:1; cursor:pointer">
                <strong>${d.name}</strong><br><small style="color:var(--text-muted)">Tap to pay</small>
            </div>
            <div style="text-align:right; margin-right:10px">
                 <span style="font-weight:bold; color:${(d.initial - d.paid) > 0 ? 'var(--danger)' : 'var(--success)'}">
                    ₱${(d.initial - d.paid).toLocaleString()}
                </span><br><small>of ₱${d.initial.toLocaleString()}</small>
            </div>
            <button onclick="deleteItem('debts', ${i})" class="delete-btn" title="Delete debt">×</button>
        </li>`).join('');
}
let curDebt = null;
function openPaymentModal(i) { curDebt = i; document.getElementById('paying-debt-name').textContent = `Paying: ${data.debts[i].name}`; document.getElementById('payment-modal').style.display = 'flex'; }
function closePaymentModal() { document.getElementById('payment-modal').style.display = 'none'; }
document.getElementById('payment-form').addEventListener('submit', e => {
    e.preventDefault();
    data.debts[curDebt].paid += parseFloat(document.getElementById('payment-amount').value);
    saveData(); closePaymentModal(); e.target.reset();
});

document.getElementById('goal-form').addEventListener('submit', e => {
    e.preventDefault();
    data.goals.push({ name: document.getElementById('goal-name').value, target: parseFloat(document.getElementById('goal-target').value), saved: 0 });
    saveData(); e.target.reset();
});
function updateGoals() {
    document.getElementById('goal-list').innerHTML = data.goals.map((g,i) => `
        <li style="display:block; border-left-color: var(--primary)">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                <strong onclick="openContribModal(${i})" style="cursor:pointer">${g.name}</strong>
                <div style="display:flex; align-items:center; gap:10px">
                    <span>₱${g.saved.toLocaleString()} / ₱${g.target.toLocaleString()}</span>
                    <button onclick="deleteItem('goals', ${i})" class="delete-btn" title="Delete goal">×</button>
                </div>
            </div>
            <progress value="${g.saved}" max="${g.target}" onclick="openContribModal(${i})" style="cursor:pointer"></progress>
        </li>`).join('');
}
let curGoal = null;
function openContribModal(i) { curGoal = i; document.getElementById('contrib-modal').style.display = 'flex'; }
function closeContribModal() { document.getElementById('contrib-modal').style.display = 'none'; }
document.getElementById('contrib-form').addEventListener('submit', e => {
    e.preventDefault();
    data.goals[curGoal].saved += parseFloat(document.getElementById('contrib-amount').value);
    saveData(); closeContribModal(); e.target.reset();
});

// --- SETTINGS ---
function updateSettings() {
    const opts = data.categories.map(c => `<option>${c}</option>`).join('');
    document.getElementById('trans-category').innerHTML = opts;
    document.getElementById('limit-category').innerHTML = opts;
    document.getElementById('category-list').innerHTML = data.categories.map(c => `<span class="tag">${c}</span>`).join('');
    
    document.getElementById('budget-limits-list').innerHTML = data.budgetLimits.map((l, i) => `
        <li><span><strong>${l.category}</strong>: ₱${l.limit.toLocaleString()}</span> 
        <button onclick="data.budgetLimits.splice(${i},1);saveData()" class="delete-btn">×</button></li>`
    ).join('');
}
document.getElementById('category-form').addEventListener('submit', e => {
    e.preventDefault();
    const newCat = document.getElementById('new-category').value.trim();
    if(newCat && !data.categories.includes(newCat)) { data.categories.push(newCat); saveData(); }
    e.target.reset();
});
document.getElementById('budget-limit-form').addEventListener('submit', e => {
    e.preventDefault();
    const cat = document.getElementById('limit-category').value;
    const limit = parseFloat(document.getElementById('limit-amount').value);
    // Remove existing limit for this category if it exists before pushing new one
    data.budgetLimits = data.budgetLimits.filter(l => l.category !== cat);
    data.budgetLimits.push({ category: cat, limit: limit });
    saveData(); e.target.reset();
});

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-${id}`).classList.add('active');
    window.scrollTo(0,0);
}
function clearAllData() {
    if(confirm('⚠️ DANGER: PERMANENTLY DELETE ALL DATA?')) { localStorage.removeItem('budgetData'); location.reload(); }
}

// INIT
init();