// Data storage
let data = JSON.parse(localStorage.getItem('budgetData')) || {
    transactions: [],
    debts: [],
    goals: [],
    categories: ['Food', 'Bills', 'Wants', 'Needs', 'Other'],
    budgetLimits: [], // {category, limit}
    currencies: [{ code: 'PHP', rate: 1 }], // PHP is default
};

// Save data
function saveData() {
    showLoader();
    localStorage.setItem('budgetData', JSON.stringify(data));
    setTimeout(hideLoader, 500);
    updateAll();
}

// Loader
function showLoader() { document.getElementById('loader').style.display = 'block'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

// Update all
function updateAll() {
    updateCurrencies();
    updateCategories();
    updateTransactions();
    updateDebts();
    updateGoals();
    updateOverview();
    updateBudgetLimits();
    checkBudgetAlerts();
    drawPieChart();
}

// Handle recurring transactions
function processRecurring() {
    const today = new Date().toISOString().split('T')[0];
    data.transactions = data.transactions.filter(t => !t.isRecurring || t.originalDate === t.date); // Keep originals
    data.transactions.forEach(trans => {
        if (trans.recurring && trans.recurring !== 'none') {
            let nextDate = new Date(trans.date);
            const todayDate = new Date(today);
            while (nextDate < todayDate) {
                if (trans.recurring === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                else if (trans.recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (trans.recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                if (nextDate <= todayDate) {
                    data.transactions.push({
                        ...trans,
                        date: nextDate.toISOString().split('T')[0],
                        isRecurring: true,
                        originalDate: trans.date
                    });
                }
            }
        }
    });
    saveData();
}

// Monthly overview
function getMonthlyOverview() {
    const months = {};
    data.transactions.forEach(trans => {
        const month = new Date(trans.date).toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!months[month]) months[month] = { income: 0, expenses: {}, totalExpenses: 0 };
        const amount = trans.amount * (data.currencies.find(c => c.code === trans.currency)?.rate || 1);
        if (trans.type === 'income') months[month].income += amount;
        else {
            months[month].totalExpenses += amount;
            months[month].expenses[trans.category] = (months[month].expenses[trans.category] || 0) + amount;
        }
    });
    let totalSavings = data.goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    let totalDebt = data.debts.reduce((sum, debt) => sum + debt.currentAmount, 0);
    return { months, savings: totalSavings, debt: totalDebt };
}

// Update overview
function updateOverview() {
    const overview = getMonthlyOverview();
    let html = '<table><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Savings</th><th>Debt</th></tr>';
    Object.keys(overview.months).forEach(month => {
        const m = overview.months[month];
        html += `<tr><td>${month}</td><td>₱${m.income.toFixed(2)}</td><td>₱${m.totalExpenses.toFixed(2)}</td><td>₱${overview.savings.toFixed(2)}</td><td>₱${overview.debt.toFixed(2)}</td></tr>`;
    });
    html += '</table>';
    document.getElementById('overview').innerHTML = html;
}

// Pie chart for expenses
function drawPieChart() {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const overview = getMonthlyOverview();
    const expenses = overview.months[currentMonth]?.expenses || {};
    const total = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    if (total === 0) return;

    let html = '';
    let startAngle = 0;
    const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'];
    let i = 0;
    Object.entries(expenses).forEach(([cat, amount]) => {
        const percentage = (amount / total) * 360;
        html += `<div class="chart-segment" style="transform: rotate(${startAngle}deg); background: conic-gradient(${colors[i % colors.length]} ${percentage}deg, transparent ${percentage}deg 360deg);"></div>`;
        startAngle += percentage;
        i++;
    });
    html += `<div class="chart-label">${currentMonth}<br>Total: ₱${total.toFixed(2)}</div>`;
    document.getElementById('budget-chart').innerHTML = html;
}

// Budget alerts
function checkBudgetAlerts() {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const overview = getMonthlyOverview();
    const expenses = overview.months[currentMonth]?.expenses || {};
    let alerts = '';
    data.budgetLimits.forEach(limit => {
        const spent = expenses[limit.category] || 0;
        const percent = (spent / limit.limit) * 100;
        if (percent >= 100) {
            alerts += `<li>Over budget for ${limit.category}! Spent ₱${spent.toFixed(2)} of ₱${limit.limit.toFixed(2)}</li>`;
            notify(`Over Budget: ${limit.category}`, `You've spent ₱${spent.toFixed(2)} over your ₱${limit.limit} limit!`);
        } else if (percent >= 80) {
            alerts += `<li class="safe">Warning: ${limit.category} is at ${percent.toFixed(0)}% (₱${spent.toFixed(2)}/₱${limit.limit.toFixed(2)})</li>`;
            notify(`Budget Warning: ${limit.category}`, `You're at ${percent.toFixed(0)}% of your ₱${limit.limit} limit.`);
        } else {
            alerts += `<li class="safe">${limit.category}: ₱${spent.toFixed(2)}/₱${limit.limit.toFixed(2)} (${percent.toFixed(0)}%)</li>`;
        }
    });
    document.getElementById('alerts-list').innerHTML = alerts;
}

// Browser notifications
function notify(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') new Notification(title, { body });
        });
    }
}

// Update currencies
function updateCurrencies() {
    const select = document.getElementById('trans-currency');
    select.innerHTML = data.currencies.map(c => `<option value="${c.code}">${c.code}</option>`).join('');
    document.getElementById('currency-list').innerHTML = data.currencies.map(c => 
        `<li>${c.code}: 1 ${c.code} = ₱${c.rate} <button onclick="removeCurrency('${c.code}')">Remove</button></li>`
    ).join('');
}

// Remove currency
function removeCurrency(code) {
    if (code !== 'PHP') {
        data.currencies = data.currencies.filter(c => c.code !== code);
        saveData();
    }
}

// Add currency
document.getElementById('currency-form').addEventListener('submit', e => {
    e.preventDefault();
    const code = document.getElementById('currency-code').value.toUpperCase();
    const rate = parseFloat(document.getElementById('currency-rate').value);
    if (code && rate && !data.currencies.find(c => c.code === code)) {
        data.currencies.push({ code, rate });
        saveData();
    }
    e.target.reset();
});

// Update categories
function updateCategories() {
    const select = document.getElementById('trans-category');
    select.innerHTML = data.categories.map(cat => `<option>${cat}</option>`).join('');
    const filterSelect = document.getElementById('filter-category');
    filterSelect.innerHTML = '<option value="">All Categories</option>' + data.categories.map(cat => `<option>${cat}</option>`).join('');
    const limitSelect = document.getElementById('limit-category');
    limitSelect.innerHTML = data.categories.map(cat => `<option>${cat}</option>`).join('');
    document.getElementById('category-list').innerHTML = data.categories.map(cat => 
        `<li>${cat} <button onclick="removeCategory('${cat}')">Remove</button></li>`
    ).join('');
}

// Remove category
function removeCategory(cat) {
    data.categories = data.categories.filter(c => c !== cat);
    data.budgetLimits = data.budgetLimits.filter(l => l.category !== cat);
    saveData();
}

// Add category
document.getElementById('category-form').addEventListener('submit', e => {
    e.preventDefault();
    const newCat = document.getElementById('new-category').value;
    if (newCat && !data.categories.includes(newCat)) {
        data.categories.push(newCat);
        saveData();
    }
    e.target.reset();
});

// Update budget limits
function updateBudgetLimits() {
    document.getElementById('budget-limits-list').innerHTML = data.budgetLimits.map(limit => 
        `<li>${limit.category}: ₱${limit.limit} <button onclick="removeBudgetLimit('${limit.category}')">Remove</button></li>`
    ).join('');
}

// Remove budget limit
function removeBudgetLimit(category) {
    data.budgetLimits = data.budgetLimits.filter(l => l.category !== category);
    saveData();
}

// Add budget limit
document.getElementById('budget-limit-form').addEventListener('submit', e => {
    e.preventDefault();
    const category = document.getElementById('limit-category').value;
    const limit = parseFloat(document.getElementById('limit-amount').value);
    if (category && limit && !data.budgetLimits.find(l => l.category === category)) {
        data.budgetLimits.push({ category, limit });
        saveData();
    }
    e.target.reset();
});

// Search and filter transactions
function applySearchFilter() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const type = document.getElementById('filter-type').value;
    const category = document.getElementById('filter-category').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;

    const filtered = data.transactions.filter(trans => {
        const matchesSearch = trans.desc.toLowerCase().includes(search) || trans.category.toLowerCase().includes(search);
        const matchesType = !type || trans.type === type;
        const matchesCategory = !category || trans.category === category;
        const matchesDate = (!startDate || trans.date >= startDate) && (!endDate || trans.date <= endDate);
        return matchesSearch && matchesType && matchesCategory && matchesDate;
    });

    const list = document.getElementById('trans-list');
    list.innerHTML = filtered.map((trans, i) => 
        `<li onclick="showDetails(${i})">${trans.date} - ${trans.type}: ${trans.currency} ${trans.amount} (${trans.category}) - ${trans.desc} ${trans.recurring ? '[Recurring]' : ''}</li>`
    ).join('');
    list.classList.add('fade-in');
    setTimeout(() => list.classList.remove('fade-in'), 1000);
}

// Update transactions
function updateTransactions() {
    processRecurring();
    applySearchFilter();
}

// Show transaction details
function showDetails(i) {
    const trans = data.transactions[i];
    alert(`Details: ${trans.date}\nType: ${trans.type}\nAmount: ${trans.currency} ${trans.amount}\nPHP: ₱${(trans.amount * (data.currencies.find(c => c.code === trans.currency)?.rate || 1)).toFixed(2)}\nCategory: ${trans.category}\nDesc: ${trans.desc}\nRecurring: ${trans.recurring || 'None'}`);
}

// Add transaction
document.getElementById('transaction-form').addEventListener('submit', e => {
    e.preventDefault();
    data.transactions.push({
        date: document.getElementById('trans-date').value,
        type: document.getElementById('trans-type').value,
        amount: parseFloat(document.getElementById('trans-amount').value),
        currency: document.getElementById('trans-currency').value,
        category: document.getElementById('trans-category').value,
        desc: document.getElementById('trans-desc').value,
        recurring: document.getElementById('trans-recurring').value
    });
    saveData();
    e.target.reset();
});

// Update debts
function updateDebts() {
    document.getElementById('debt-list').innerHTML = data.debts.map((debt, i) => 
        `<li onclick="selectDebt(${i})">${debt.name}: ₱${debt.currentAmount.toFixed(2)} (Initial: ₱${debt.initialAmount.toFixed(2)})</li>`
    ).join('');
}

// Select debt
let selectedDebt = null;
function selectDebt(i) {
    selectedDebt = i;
    document.getElementById('payment-form').style.display = 'block';
}

// Add debt
document.getElementById('debt-form').addEventListener('submit', e => {
    e.preventDefault();
    data.debts.push({
        name: document.getElementById('debt-name').value,
        initialAmount: parseFloat(document.getElementById('debt-amount').value),
        currentAmount: parseFloat(document.getElementById('debt-amount').value),
        payments: []
    });
    saveData();
    e.target.reset();
});

// Add payment
document.getElementById('payment-form').addEventListener('submit', e => {
    e.preventDefault();
    if (selectedDebt !== null) {
        const amount = parseFloat(document.getElementById('payment-amount').value);
        data.debts[selectedDebt].payments.push({
            date: document.getElementById('payment-date').value,
            amount
        });
        data.debts[selectedDebt].currentAmount -= amount;
        saveData();
    }
    e.target.reset();
    document.getElementById('payment-form').style.display = 'none';
    selectedDebt = null;
});

// Update goals
function updateGoals() {
    document.getElementById('goal-list').innerHTML = data.goals.map((goal, i) => 
        `<li onclick="selectGoal(${i})">${goal.name}: ₱${goal.currentAmount.toFixed(2)} / ₱${goal.targetAmount.toFixed(2)}</li>`
    ).join('');
}

// Select goal
let selectedGoal = null;
function selectGoal(i) {
    selectedGoal = i;
    document.getElementById('contrib-form').style.display = 'block';
}

// Add goal
document.getElementById('goal-form').addEventListener('submit', e => {
    e.preventDefault();
    data.goals.push({
        name: document.getElementById('goal-name').value,
        targetAmount: parseFloat(document.getElementById('goal-target').value),
        currentAmount: 0,
        contributions: []
    });
    saveData();
    e.target.reset();
});

// Add contribution
document.getElementById('contrib-form').addEventListener('submit', e => {
    e.preventDefault();
    if (selectedGoal !== null) {
        const amount = parseFloat(document.getElementById('contrib-amount').value);
        data.goals[selectedGoal].contributions.push({
            date: document.getElementById('contrib-date').value,
            amount
        });
        data.goals[selectedGoal].currentAmount += amount;
        saveData();
    }
    e.target.reset();
    document.getElementById('contrib-form').style.display = 'none';
    selectedGoal = null;
});

// Show section
function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    const sec = document.getElementById(id);
    sec.style.display = 'block';
    sec.classList.add('slide-in', 'wave-transition');
    setTimeout(() => sec.classList.remove('slide-in', 'wave-transition'), 1000);
}

// Export to CSV
function exportData() {
    let csv = 'Type,Date,Amount,Currency,Category,Description,Recurring\n';
    data.transactions.forEach(t => csv += `${t.type},${t.date},${t.amount},${t.currency},${t.category},${t.desc},${t.recurring || 'none'}\n`);
    csv += '\nDebts:\nName,Initial,Current\n';
    data.debts.forEach(d => csv += `${d.name},${d.initialAmount},${d.currentAmount}\n`);
    csv += '\nGoals:\nName,Target,Current\n';
    data.goals.forEach(g => csv += `${g.name},${g.targetAmount},${g.currentAmount}\n`);
    csv += '\nCurrencies:\nCode,Rate\n';
    data.currencies.forEach(c => csv += `${c.code},${c.rate}\n`);
    csv += '\nBudget Limits:\nCategory,Limit\n';
    data.budgetLimits.forEach(l => csv += `${l.category},${l.limit}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget.csv';
    a.click();
}

// Import from CSV
document.getElementById('import-file').addEventListener('change', e => {
    showLoader();
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(ev) {
        const lines = ev.target.result.split('\n');
        let section = 'transactions';
        data.transactions = [];
        data.debts = [];
        data.goals = [];
        data.currencies = [{ code: 'PHP', rate: 1 }];
        data.budgetLimits = [];
        lines.forEach(line => {
            if (line.trim() === '') return;
            if (line === 'Debts:') section = 'debts';
            else if (line === 'Goals:') section = 'goals';
            else if (line === 'Currencies:') section = 'currencies';
            else if (line === 'Budget Limits:') section = 'limits';
            else if (section === 'transactions' && line !== 'Type,Date,Amount,Currency,Category,Description,Recurring') {
                const [type, date, amount, currency, category, desc, recurring] = line.split(',');
                data.transactions.push({ 
                    type, 
                    date, 
                    amount: parseFloat(amount), 
                    currency, 
                    category, 
                    desc, 
                    recurring: recurring === 'none' ? undefined : recurring 
                });
            } else if (section === 'debts' && line !== 'Name,Initial,Current') {
                const [name, initial, current] = line.split(',');
                data.debts.push({ name, initialAmount: parseFloat(initial), currentAmount: parseFloat(current), payments: [] });
            } else if (section === 'goals' && line !== 'Name,Target,Current') {
                const [name, target, current] = line.split(',');
                data.goals.push({ name, targetAmount: parseFloat(target), currentAmount: parseFloat(current), contributions: [] });
            } else if (section === 'currencies' && line !== 'Code,Rate') {
                const [code, rate] = line.split(',');
                if (code !== 'PHP') data.currencies.push({ code, rate: parseFloat(rate) });
            } else if (section === 'limits' && line !== 'Category,Limit') {
                const [category, limit] = line.split(',');
                data.budgetLimits.push({ category, limit: parseFloat(limit) });
            }
        });
        saveData();
        hideLoader();
        alert('Import successful!');
    };
    reader.readAsText(file);
});

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-btn').style.display = 'block';
});
document.getElementById('install-btn').addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') console.log('Installed!');
        deferredPrompt = null;
    });
});
window.addEventListener('appinstalled', () => alert('App added to home screen!'));

// Deep linking
const params = new URLSearchParams(window.location.search);
if (params.has('section')) showSection(params.get('section'));

// Service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => console.log('SW registered')).catch(err => console.error(err));
}

// Show guide first time
if (!localStorage.getItem('seenGuide')) {
    showSection('guide');
    localStorage.setItem('seenGuide', 'true');
}

// Initial update
updateAll();