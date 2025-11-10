// =========================================
// 1. CORE HELPERS (Security & Precision)
// =========================================
const Safe = {
    // XSS PROTECTION: Basic sanitization for text inputs
    sanitize(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>"'&]/g, '').trim().substring(0, 50); // Limit length too
    }
};

const Money = {
    // PRECISION: Fix floating point math errors (0.1 + 0.2 != 0.3000004)
    add(a, b) { return (Math.round((a + b) * 100) / 100); },
    subtract(a, b) { return (Math.round((a - b) * 100) / 100); }
};

const Formatter = {
    currency(amount) { return `₱${amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; },
    date(dateStr) { return new Date(dateStr).toLocaleDateString('en-PH'); },
    percent(val, total) { return total === 0 ? '0%' : `${Math.min(100, Math.round((val / total) * 100))}%`; }
};

const ModalManager = {
    activeType: null, activeIndex: null,
    open(type, index, title, desc) {
        this.activeType = type; this.activeIndex = index;
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-desc').textContent = desc;
        document.getElementById('modal-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('modal-amount').value = '';
        document.getElementById('universal-modal').style.display = 'flex';
    },
    close() { document.getElementById('universal-modal').style.display = 'none'; this.activeType = null; }
};

// =========================================
// 2. MAIN APP LOGIC
// =========================================
let data = JSON.parse(localStorage.getItem('budgetData')) || {
    transactions: [], debts: [], goals: [],
    categories: ['Food', 'Bills', 'Transport', 'Shopping', 'Other'],
    budgetLimits: [], theme: 'light', sound: true, lastUpdated: 'Never'
};
const quotes = ["Ang pag-iipon ay hindi tungkol sa laki ng kita, kundi sa husay ng paghawak.", "A peso saved is a peso earned.", "Iwasan ang gastusin na hindi kailangan.", "Small steps lead to big savings."];
let updateDebounce = null;

function init() {
    applyTheme(data.theme);
    document.getElementById('sound-toggle').checked = data.sound;
    document.querySelectorAll('input[type="date"]').forEach(el => el.value = new Date().toISOString().split('T')[0]);
    if(processRecurring()) { saveData(); } else { updateAll(); } // Initial load
    setupEventListeners();
    document.getElementById('loader').style.display = 'none';
}

function setupEventListeners() {
    document.getElementById('quick-add-button').onclick = () => showSection('transactions');
    document.addEventListener('keydown', e => { if(e.key === 'N' && e.shiftKey) showSection('transactions'); });
    
    // Unified Modal Form Listener
    document.getElementById('modal-form').addEventListener('submit', e => {
        e.preventDefault();
        const amt = parseFloat(document.getElementById('modal-amount').value);
        if (amt <= 0) return alert("Amount must be positive");
        
        if (ModalManager.activeType === 'debt') {
            data.debts[ModalManager.activeIndex].paid = Money.add(data.debts[ModalManager.activeIndex].paid, amt);
            if (data.debts[ModalManager.activeIndex].paid >= data.debts[ModalManager.activeIndex].initial) {
                playSound('success'); runConfetti();
            } else { playSound('click'); }
        } else if (ModalManager.activeType === 'goal') {
            data.goals[ModalManager.activeIndex].saved = Money.add(data.goals[ModalManager.activeIndex].saved, amt);
            if (data.goals[ModalManager.activeIndex].saved >= data.goals[ModalManager.activeIndex].target) {
                playSound('success'); runConfetti();
            } else { playSound('click'); }
        }
        saveData(); ModalManager.close();
    });
    
    // Drag & Drop (Simplified for offline)
    const dz = document.getElementById('drop-zone');
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('highlight-drop'); };
    dz.ondragleave = () => dz.classList.remove('highlight-drop');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('highlight-drop'); if(e.dataTransfer.files[0]) alert("File dropped! (Import logic would go here)"); };
}

// --- CORE UPDATES (Debounced for Performance) ---
function saveData() {
    document.getElementById('loader').style.display = 'flex';
    data.lastUpdated = new Date().toLocaleString();
    localStorage.setItem('budgetData', JSON.stringify(data));
    
    clearTimeout(updateDebounce);
    updateDebounce = setTimeout(() => {
        updateAll();
        document.getElementById('loader').style.display = 'none';
    }, 300); // Wait 300ms before heavy UI updates
}

function updateAll() {
    updateDashboard(); updateTransactions(); updateDebts(); updateGoals(); updateSettings();
    document.getElementById('last-updated').textContent = `Last updated: ${data.lastUpdated}`;
}

// --- DASHBOARD ---
function updateDashboard() {
    const curMonth = new Date().toLocaleString('default', {month:'long', year:'numeric'});
    let inc = 0, exp = 0, cats = {};
    data.transactions.forEach(t => {
        if(new Date(t.date).toLocaleString('default',{month:'long', year:'numeric'}) === curMonth) {
            if(t.type === 'income') inc = Money.add(inc, t.amount);
            else { exp = Money.add(exp, t.amount); cats[t.category] = Money.add(cats[t.category] || 0, t.amount); }
        }
    });
    document.getElementById('total-income').textContent = Formatter.currency(inc);
    document.getElementById('total-expense').textContent = Formatter.currency(exp);
    document.getElementById('total-debt').textContent = Formatter.currency(data.debts.reduce((s,d)=>Money.add(s, Money.subtract(d.initial, d.paid)),0));
    document.getElementById('total-savings').textContent = Formatter.currency(data.goals.reduce((s,g)=>Money.add(s, g.saved),0));
    
    const net = Money.subtract(inc, exp);
    const stat = document.getElementById('budget-status');
    stat.className = 'status-banner ' + (net >= 0 ? 'status-positive' : 'status-negative');
    stat.innerHTML = net >= 0 ? `🎉 Good! ₱${net.toLocaleString()} under budget.` : `⚠️ Alert! ₱${Math.abs(net).toLocaleString()} over budget.`;
    document.getElementById('quote-of-the-day').textContent = `"${quotes[new Date().getDate() % quotes.length]}"`;
    drawChart(cats, exp); checkAlerts(cats);
}

// --- TRANSACTIONS ---
document.getElementById('transaction-form').addEventListener('submit', e => {
    e.preventDefault();
    const type = document.getElementById('trans-type').value;
    data.transactions.push({
        id: Date.now(), date: document.getElementById('trans-date').value, type,
        amount: parseFloat(document.getElementById('trans-amount').value),
        category: document.getElementById('trans-category').value,
        desc: Safe.sanitize(document.getElementById('trans-desc').value), // Sanitized!
        recurring: document.getElementById('trans-recurring').value
    });
    playSound(type === 'income' ? 'success' : 'click'); saveData(); e.target.reset();
});

function updateTransactions() {
    const tbody = document.getElementById('trans-table-body'); tbody.innerHTML = '';
    const term = document.getElementById('search-input').value.toLowerCase();
    const typeF = document.getElementById('filter-type') ? document.getElementById('filter-type').value : '';
    data.transactions.filter(t => (t.desc.toLowerCase().includes(term) || t.category.toLowerCase().includes(term)) && (!typeF || t.type === typeF))
        .slice().reverse().slice(0,50).forEach(t => {
        tbody.innerHTML += `<tr><td><small>${Formatter.date(t.date)}</small></td>
            <td><strong>${Safe.sanitize(t.category)}</strong><br><small style="color:var(--text-muted)">${Safe.sanitize(t.desc).substring(0,15)} ${t.recurring!=='none'&&!t.isRecurringInstance?'🔄':''}</small></td>
            <td style="color:${t.type==='expense'?'var(--danger)':'var(--success)'};font-weight:700">${t.type==='expense'?'-':'+'}${Formatter.currency(t.amount)}</td>
            <td><button onclick="deleteItem('transactions',${t.id})" class="delete-btn">×</button></td></tr>`;
    });
}

// --- DEBTS & GOALS ---
document.getElementById('debt-form').addEventListener('submit', e => {
    e.preventDefault();
    if(confirm('Add debt?')) {
        data.debts.push({name: Safe.sanitize(document.getElementById('debt-name').value), initial: parseFloat(document.getElementById('debt-amount').value), paid:0});
        playSound('click'); saveData(); e.target.reset();
    }
});
function updateDebts() {
    document.getElementById('debt-list').innerHTML = data.debts.map((d,i) => {
        const left = Money.subtract(d.initial, d.paid);
        return `<li style="border-left-color:var(--accent)" onclick="ModalManager.open('debt',${i},'Pay: ${Safe.sanitize(d.name)}','Remaining: ${Formatter.currency(left)}')">
            <strong>${Safe.sanitize(d.name)}</strong>
            <span>${left <= 0 ? '✅ PAID' : Formatter.currency(left) + ' left'}</span></li>`;
    }).join('');
}
document.getElementById('goal-form').addEventListener('submit', e => {
    e.preventDefault();
    data.goals.push({name: Safe.sanitize(document.getElementById('goal-name').value), target: parseFloat(document.getElementById('goal-target').value), saved:0});
    playSound('click'); saveData(); e.target.reset();
});
function updateGoals() {
    document.getElementById('goal-list').innerHTML = data.goals.map((g,i) => 
        `<li style="display:block;border-left-color:var(--primary)" onclick="ModalManager.open('goal',${i},'Save for: ${Safe.sanitize(g.name)}','Target: ${Formatter.currency(g.target)}')">
        <div style="display:flex;justify-content:space-between"><strong>${Safe.sanitize(g.name)}</strong><span>${Formatter.currency(g.saved)} / ${Formatter.currency(g.target)}</span></div>
        <progress value="${g.saved}" max="${g.target}"></progress></li>`
    ).join('');
}

// --- SHARED UTILS ---
function deleteItem(type, id) { if(confirm('Delete?')) {
    if(type==='transactions') data.transactions = data.transactions.filter(t=>t.id!==id);
    else if(type==='debts') data.debts.splice(id,1); else data.goals.splice(id,1);
    saveData();
}}
function processRecurring() { /* (Keep the same logic from V6 app.js here for brevity, it was good) */ return false; }
function drawChart(expenses, total) { /* (Keep V6 logic, add requestAnimationFrame if desired, but V6 was okay) */ }
function checkAlerts(expenses) { /* (Keep V6 logic) */ }
function updateSettings() { /* (Keep V6 logic) */ }
function toggleSound() { data.sound = document.getElementById('sound-toggle').checked; saveData(); }
function playSound(t) { if(data.sound && document.getElementById('sfx-'+t)) document.getElementById('sfx-'+t).play().catch(()=>{}); }
function applyTheme(t) { document.documentElement.setAttribute('data-theme',t); document.getElementById('theme-toggle').textContent=t==='light'?'🌙':'☀️'; }
function showSection(id) { document.querySelectorAll('.section').forEach(s=>s.style.display='none'); document.getElementById(id).style.display='block'; document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active')); document.getElementById('nav-'+id).classList.add('active'); }

// (Missing functions from previous versions like exportData/importData should be copied over if needed, or kept simple)

init();