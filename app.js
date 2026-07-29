/* ==========================================================================
   STATE & PERSISTENCE - ATTENDANCE MANAGER PRO
   ========================================================================== */

const STORAGE_KEYS = {
    ATTENDANCE_DB: 'attendanceDataPro',
    CATEGORIES: 'attendanceCategoriesPro',
    ACTIVE_SESSION: 'attendanceActiveSessionPro',
    THEME: 'attendanceThemePro'
};

const DEFAULT_CATEGORIES = ['Old members', 'New members', 'English medium'];

const DEFAULT_DATA = {
    "July 30 (Thursday)": {
        "Old members": ["Sandul Vithanage", "A. Ashan Madhuwantha", "Dewmi Fernando", "Nisal Janishka", "Chamodi Dewmini", "Nadev De Silva", "Shazra", "Seran Thenura", "Newandi Malnethmi", "Bawantha Fernando", "Oshan Semasinghe", "Yogya Sathsarani", "Hiruni Hansika", "Madusha Sathsara", "Janidu Wjesinghe"],
        "New members": ["Dulina Herath", "Senuka Ranasinghe", "Supuni Shashiprabha", "Dhanushi Indumini", "Deneth Shanuka", "Hiruni Nethsarani", "Sahansa Sathnadee", "Hansika Dewmini", "Hemsara Lakshitha", "Dinal Disanayaka", "Yasendra Dilshan", "Dinugi Jayasuriya"],
        "English medium": ["Parinda Rupasinghe"]
    },
    "July 31 (Friday)": {
        "Old members": ["Sandul Vithanage", "Ashini Kavindya", "Thisara Thedamuthu", "Sandun Lakshan", "Dinul Awantha", "Vishwa Sandaruwan", "Seran Thenura", "Shazra", "Thenu Hiruka", "Yogya Sathsarani", "Nethsara Withanage", "Navoda Suranjani", "Hiruni Hansika", "Madusha Sathsara", "Janidu Wjesinghe"],
        "New members": ["Dulina Herath", "Senuka Ranasinghe", "Thenuri Chamathka", "Deneth Shanuka", "Hiruni Nethsarani", "Chalakee Seetharani", "Hansika Dewmini", "Dihansa Imandi", "Pavindu Theekshana", "Hansana Ashinsani", "Binoda Anusari", "Ashini Weerarathne"],
        "English medium": ["Parinda Rupasinghe", "Thamasha Gunawardhana", "Senithma Samaraweera"]
    }
};

class AttendanceDB {
    constructor() {
        this.db = {};
        this.categories = [];
        this.activeSession = "";
        
        // Undo / Redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 40;

        this.init();
    }

    init() {
        // Load Categories
        try {
            const savedCats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
            this.categories = savedCats ? JSON.parse(savedCats) : [...DEFAULT_CATEGORIES];
        } catch (e) {
            this.categories = [...DEFAULT_CATEGORIES];
        }

        // Load DB
        try {
            const savedDB = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_DB);
            if (savedDB) {
                this.db = JSON.parse(savedDB);
            } else {
                this.resetToDefault();
                return;
            }
        } catch (e) {
            this.resetToDefault();
            return;
        }

        // Load Active Session
        const savedSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        if (savedSession && this.db[savedSession]) {
            this.activeSession = savedSession;
        } else {
            const sessions = Object.keys(this.db);
            this.activeSession = sessions.length > 0 ? sessions[0] : "";
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_DB, JSON.stringify(this.db));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, this.activeSession);
    }

    resetToDefault() {
        this.db = {};
        this.categories = [...DEFAULT_CATEGORIES];
        
        for (const session in DEFAULT_DATA) {
            this.db[session] = {};
            for (const category of this.categories) {
                const members = DEFAULT_DATA[session][category] || [];
                this.db[session][category] = members.map(name => ({
                    name: name,
                    present: false
                }));
            }
        }
        
        this.activeSession = "July 30 (Thursday)";
        this.save();
        this.clearHistory();
    }

    /* History Tracking */
    commitState() {
        // Push deep clone of db to undo stack
        const snapshot = JSON.stringify(this.db);
        
        // If history matches top of stack, don't duplicate
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
            return;
        }

        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        // Clear redo stack on new action
        this.redoStack = [];
        
        this.updateHistoryButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        
        const currentState = JSON.stringify(this.db);
        this.redoStack.push(currentState);
        
        const previousState = this.undoStack.pop();
        this.db = JSON.parse(previousState);
        
        this.save();
        this.updateHistoryButtons();
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        
        const currentState = JSON.stringify(this.db);
        this.undoStack.push(currentState);
        
        const nextState = this.redoStack.pop();
        this.db = JSON.parse(nextState);
        
        this.save();
        this.updateHistoryButtons();
        return true;
    }

    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    }
}

// Instantiate Database Manager
const DB = new AttendanceDB();

/* ==========================================================================
   THEME MANAGER
   ========================================================================== */

function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark-theme';
    document.body.className = savedTheme;
    
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.onclick = () => {
            if (document.body.classList.contains('light-theme')) {
                document.body.className = 'dark-theme';
                localStorage.setItem(STORAGE_KEYS.THEME, 'dark-theme');
                showToast("Theme switched to Dark mode.", "info");
            } else {
                document.body.className = 'light-theme';
                localStorage.setItem(STORAGE_KEYS.THEME, 'light-theme');
                showToast("Theme switched to Light mode.", "info");
            }
        };
    }
}

/* ==========================================================================
   TOAST SYSTEM
   ========================================================================== */

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
        <span class="toast-icon ${type}">${iconSvg}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.classList.add('toast-leave'); setTimeout(() => this.parentElement.remove(), 250);">&times;</button>
    `;

    container.appendChild(toast);

    // Auto dismiss after 3.5s
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.classList.add('toast-leave');
            setTimeout(() => {
                if (toast && toast.parentElement) toast.remove();
            }, 250);
        }
    }, 3500);
}

/* ==========================================================================
   MODAL WINDOW CONTROLLER
   ========================================================================== */

function openModal(id) {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById(id);
    
    if (backdrop && modal) {
        backdrop.classList.add('active');
        modal.classList.add('active');
        
        // Custom focus handling
        if (id === 'add-session-modal') {
            document.getElementById('new-session-name').value = '';
            document.getElementById('new-session-name').focus();
        } else if (id === 'add-member-modal') {
            document.getElementById('new-member-name-input').value = '';
            populateCategoriesDropdown('new-member-category-select');
            document.getElementById('new-member-name-input').focus();
        } else if (id === 'settings-modal') {
            document.getElementById('new-category-name').value = '';
            renderCategoriesSettingsList();
        }
    }
}

function closeModal(id) {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById(id);
    
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Deactivate backdrop only if no other active modals are open
    const activeModals = document.querySelectorAll('.modal.active');
    if (activeModals.length === 0 && backdrop) {
        backdrop.classList.remove('active');
    }
}

function closeAllModals() {
    const activeModals = document.querySelectorAll('.modal.active');
    activeModals.forEach(m => m.classList.remove('active'));
    
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.remove('active');
}

/* ==========================================================================
   SELECT OPTIONS POPULATION
   ========================================================================== */

function populateCategoriesDropdown(selectId, selectValue = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    DB.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === selectValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

/* ==========================================================================
   RENDER SESSIONS SIDEBAR
   ========================================================================== */

function renderSidebar() {
    const listContainer = document.getElementById('session-list-container');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const query = document.getElementById('session-search').value.toLowerCase().trim();
    
    const sessions = Object.keys(DB.db);
    let renderedCount = 0;
    
    sessions.forEach(session => {
        if (query && !session.toLowerCase().includes(query)) return;
        
        renderedCount++;
        const li = document.createElement('li');
        li.className = `session-item-wrapper ${session === DB.activeSession ? 'active' : ''}`;
        
        // Calculate totals for active indicator
        let total = 0;
        let present = 0;
        if (DB.db[session]) {
            Object.values(DB.db[session]).forEach(list => {
                total += list.length;
                present += list.filter(m => m.present).length;
            });
        }
        const pct = total === 0 ? 0 : Math.round((present / total) * 100);
        
        // Button trigger selection
        const btn = document.createElement('button');
        btn.className = 'session-item-btn';
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${session}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: auto;">(${pct}%)</span>
        `;
        btn.onclick = () => {
            DB.activeSession = session;
            DB.save();
            document.getElementById('search-input').value = ''; // Reset member filter
            renderSidebar();
            renderDashboard();
            // Close mobile sidebar if open
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        };
        
        // Session Actions Menu (Rename, Delete)
        const actions = document.createElement('div');
        actions.className = 'session-actions-menu';
        
        // Rename Session
        const renameBtn = document.createElement('button');
        renameBtn.className = 'session-action-icon-btn';
        renameBtn.title = "Rename Session";
        renameBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            const newName = prompt(`Rename session "${session}" to:`, session);
            if (newName && newName.trim() && newName.trim() !== session) {
                renameSessionAction(session, newName.trim());
            }
        };
        
        // Delete Session
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'session-action-icon-btn';
        deleteBtn.title = "Delete Session";
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete session "${session}"? This cannot be undone.`)) {
                deleteSessionAction(session);
            }
        };
        
        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        
        li.appendChild(btn);
        li.appendChild(actions);
        listContainer.appendChild(li);
    });
    
    if (renderedCount === 0) {
        const li = document.createElement('li');
        li.className = 'empty-list-item';
        li.style.padding = '12px';
        li.style.fontSize = '0.8rem';
        li.textContent = query ? 'No matching sessions' : 'No sessions recorded';
        listContainer.appendChild(li);
    }
}

/* ==========================================================================
   RENDER ANALYTICS CHARTS & WIDGETS
   ========================================================================== */

function renderAnalytics() {
    const active = DB.activeSession;
    const sessionData = DB.db[active];
    
    let totalCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let rate = 0;
    
    if (sessionData) {
        Object.values(sessionData).forEach(members => {
            totalCount += members.length;
            presentCount += members.filter(m => m.present).length;
        });
        absentCount = totalCount - presentCount;
        rate = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
    }
    
    // Set Numeric Stats
    document.getElementById('stat-total-count').textContent = totalCount;
    document.getElementById('stat-present-count').textContent = presentCount;
    document.getElementById('stat-absent-count').textContent = absentCount;
    
    // Set Active Title/Subtitle Info
    const activeTitle = document.getElementById('active-session-title');
    const activeMeta = document.getElementById('active-session-meta');
    if (activeTitle) activeTitle.textContent = active || "No Session Selected";
    if (activeMeta) activeMeta.textContent = active ? `${totalCount} members, ${rate}% attendance rate` : "Create a session from the sidebar to begin.";
    
    // Render Circular Progress Card
    const radialProgress = document.getElementById('radial-progress');
    const radialPercentage = document.getElementById('radial-percentage');
    if (radialProgress && radialPercentage) {
        radialPercentage.textContent = `${rate}%`;
        // Stroke dasharray calculations: total length is 2 * PI * R where R = 15.9155 -> total length is exactly 100
        radialProgress.style.strokeDasharray = `${rate}, 100`;
    }
    
}

let activeAttendanceFilter = 'all';

function setAttendanceFilter(filterType) {
    if (filterType !== 'all' && activeAttendanceFilter === filterType) {
        activeAttendanceFilter = 'all';
    } else {
        activeAttendanceFilter = filterType;
    }
    
    const totalCard = document.getElementById('card-filter-total');
    const presentCard = document.getElementById('card-filter-present');
    const absentCard = document.getElementById('card-filter-absent');
    
    if (totalCard) totalCard.classList.remove('active-filter');
    if (presentCard) presentCard.classList.remove('active-filter');
    if (absentCard) absentCard.classList.remove('active-filter');
    
    if (activeAttendanceFilter === 'all' && totalCard) {
        totalCard.classList.add('active-filter');
    } else if (activeAttendanceFilter === 'present' && presentCard) {
        presentCard.classList.add('active-filter');
    } else if (activeAttendanceFilter === 'absent' && absentCard) {
        absentCard.classList.add('active-filter');
    }
    
    renderLists();
    
    let msg = "Showing all members.";
    let type = "info";
    if (activeAttendanceFilter === 'present') {
        msg = "Filtering to show Present members.";
        type = "success";
    } else if (activeAttendanceFilter === 'absent') {
        msg = "Filtering to show Absent members.";
        type = "warning";
    }
    showToast(msg, type);
}

/* ==========================================================================
   RENDER ATTENDANCE MEMBER CARDS
   ========================================================================== */

function renderLists() {
    const container = document.getElementById('lists-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const active = DB.activeSession;
    if (!active || !DB.db[active]) {
        container.innerHTML = `
            <div class="empty-list-item" style="grid-column: 1 / -1; height: 200px; border: 1px dashed var(--border); border-radius: var(--radius-md);">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <h4 style="font-weight: 700;">No active session</h4>
                <p>Please create or select an active session in the sidebar to start marking attendance.</p>
            </div>
        `;
        return;
    }
    
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const categories = DB.categories;
    
    categories.forEach(category => {
        // Fetch and sort members alphabetically
        let members = DB.db[active][category] || [];
        members.sort((a, b) => a.name.localeCompare(b.name));
        
        const presentCount = members.filter(m => m.present).length;
        const totalCount = members.length;
        const pct = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
        
        // Card Container
        const card = document.createElement('div');
        card.className = 'category-card';
        
        // Card Header HTML
        card.innerHTML = `
            <div class="category-header">
                <div class="category-title-row">
                    <span class="category-title">${category}</span>
                    <span class="stats-badge" id="badge-${category.replace(/\s+/g, '')}">${presentCount} / ${totalCount}</span>
                </div>
                <div class="progress-bg">
                    <div class="progress-fill" id="fill-${category.replace(/\s+/g, '')}" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
        
        // Card List
        const ul = document.createElement('ul');
        ul.className = 'member-list';
        
        let visibleCount = 0;
        
        members.forEach((member) => {
            const isMatch = !searchQuery || member.name.toLowerCase().includes(searchQuery);
            
            let presenceMatch = true;
            if (activeAttendanceFilter === 'present') {
                presenceMatch = member.present === true;
            } else if (activeAttendanceFilter === 'absent') {
                presenceMatch = member.present === false;
            }
            
            const showMember = isMatch && presenceMatch;
            if (showMember) visibleCount++;
            
            const li = document.createElement('li');
            li.className = `member-item ${showMember ? '' : 'hidden'}`;
            
            // Custom checkbox element
            const label = document.createElement('label');
            label.className = 'member-item-left custom-checkbox-container';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = member.present;
            checkbox.onchange = (e) => toggleAttendanceAction(category, member.name, e.target.checked);
            
            const spanCheckmark = document.createElement('span');
            spanCheckmark.className = 'checkbox-checkmark';
            
            const spanLabel = document.createElement('span');
            spanLabel.className = 'checkbox-label';
            
            // Highlight query matches in name
            if (searchQuery && isMatch) {
                const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
                spanLabel.innerHTML = member.name.replace(regex, '<mark style="background-color: #fef08a; color: #1e293b; padding: 1px 2px; border-radius: 2px;">$1</mark>');
            } else {
                spanLabel.textContent = member.name;
            }
            
            label.appendChild(checkbox);
            label.appendChild(spanCheckmark);
            label.appendChild(spanLabel);
            
            // Edit / Actions Right
            const actions = document.createElement('div');
            actions.className = 'member-item-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'member-item-btn';
            editBtn.title = "Edit Member Details";
            editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
            editBtn.onclick = (e) => {
                e.stopPropagation();
                openEditMemberModal(member.name, category);
            };
            
            actions.appendChild(editBtn);
            
            li.appendChild(label);
            li.appendChild(actions);
            ul.appendChild(li);
        });
        
        // Show empty states if necessary
        if (members.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-list-item';
            empty.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>No members added.</span>
            `;
            ul.appendChild(empty);
        } else if (visibleCount === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-list-item';
            empty.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>No matching members.</span>
            `;
            ul.appendChild(empty);
        }
        
        card.appendChild(ul);
        container.appendChild(card);
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderDashboard() {
    renderAnalytics();
    renderLists();
}

/* ==========================================================================
   ATTENDANCE AND MEMBER ACTIONS
   ========================================================================== */

function toggleAttendanceAction(category, name, isPresent) {
    DB.commitState();
    
    const members = DB.db[DB.activeSession][category];
    const member = members.find(m => m.name === name);
    if (member) {
        member.present = isPresent;
        DB.save();
        
        // Efficient minor stats update without full render
        updateCategoryCardHeader(category);
        renderAnalytics();
    }
}

function updateCategoryCardHeader(category) {
    const members = DB.db[DB.activeSession][category] || [];
    const presentCount = members.filter(m => m.present).length;
    const totalCount = members.length;
    const pct = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
    
    const safeCat = category.replace(/\s+/g, '');
    const badge = document.getElementById(`badge-${safeCat}`);
    const fill = document.getElementById(`fill-${safeCat}`);
    
    if (badge) badge.textContent = `${presentCount} / ${totalCount}`;
    if (fill) fill.style.width = `${pct}%`;
}

function addMemberAction() {
    const nameInput = document.getElementById('new-member-name-input');
    const categorySelect = document.getElementById('new-member-category-select');
    const addGlobalOption = document.getElementById('add-global-option');
    
    const name = nameInput.value.trim();
    const category = categorySelect.value;
    
    if (!name) {
        showToast("Please enter a valid member name.", "error");
        return;
    }
    
    DB.commitState();
    
    const active = DB.activeSession;
    
    if (addGlobalOption.checked) {
        // Add to all sessions
        Object.keys(DB.db).forEach(session => {
            if (!DB.db[session][category]) {
                DB.db[session][category] = [];
            }
            
            // Check duplicate case-insensitive
            const exists = DB.db[session][category].some(m => m.name.toLowerCase() === name.toLowerCase());
            if (!exists) {
                DB.db[session][category].push({ name, present: false });
            }
        });
        showToast(`"${name}" added globally to category "${category}".`, "success");
    } else {
        // Add to active session only
        const exists = DB.db[active][category].some(m => m.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            showToast(`"${name}" is already in category "${category}" for this session.`, "error");
            return;
        }
        
        DB.db[active][category].push({ name, present: false });
        showToast(`"${name}" added to this session only.`, "success");
    }
    
    DB.save();
    closeModal('add-member-modal');
    renderDashboard();
}

function openEditMemberModal(name, category) {
    document.getElementById('edit-member-old-name').value = name;
    document.getElementById('edit-member-old-category').value = category;
    
    document.getElementById('edit-member-name-input').value = name;
    populateCategoriesDropdown('edit-member-category-select', category);
    
    document.getElementById('edit-global-option').checked = true;
    
    openModal('edit-member-modal');
}

function saveMemberEditAction() {
    const oldName = document.getElementById('edit-member-old-name').value;
    const oldCategory = document.getElementById('edit-member-old-category').value;
    
    const newName = document.getElementById('edit-member-name-input').value.trim();
    const newCategory = document.getElementById('edit-member-category-select').value;
    const applyGlobally = document.getElementById('edit-global-option').checked;
    
    if (!newName) {
        showToast("Member name cannot be empty.", "error");
        return;
    }
    
    DB.commitState();
    const active = DB.activeSession;
    
    if (applyGlobally) {
        // Edit across all sessions
        Object.keys(DB.db).forEach(session => {
            const list = DB.db[session][oldCategory] || [];
            const idx = list.findIndex(m => m.name === oldName);
            
            if (idx !== -1) {
                const memberData = list[idx];
                
                if (oldCategory === newCategory) {
                    // Just renaming
                    memberData.name = newName;
                } else {
                    // Moving categories: remove from old category, add to new category
                    list.splice(idx, 1);
                    if (!DB.db[session][newCategory]) DB.db[session][newCategory] = [];
                    DB.db[session][newCategory].push({
                        name: newName,
                        present: memberData.present
                    });
                }
            }
        });
        showToast("Member profile updated globally.", "success");
    } else {
        // Active session only
        const list = DB.db[active][oldCategory] || [];
        const idx = list.findIndex(m => m.name === oldName);
        
        if (idx !== -1) {
            const memberData = list[idx];
            if (oldCategory === newCategory) {
                memberData.name = newName;
            } else {
                list.splice(idx, 1);
                if (!DB.db[active][newCategory]) DB.db[active][newCategory] = [];
                DB.db[active][newCategory].push({
                    name: newName,
                    present: memberData.present
                });
            }
        }
        showToast("Member details updated for this session only.", "success");
    }
    
    DB.save();
    closeModal('edit-member-modal');
    renderDashboard();
}

function deleteMemberAction() {
    const name = document.getElementById('edit-member-old-name').value;
    const category = document.getElementById('edit-member-old-category').value;
    const applyGlobally = document.getElementById('edit-global-option').checked;
    
    if (!confirm(`Are you sure you want to delete member "${name}"? This action is undoable.`)) {
        return;
    }
    
    DB.commitState();
    const active = DB.activeSession;
    
    if (applyGlobally) {
        Object.keys(DB.db).forEach(session => {
            const list = DB.db[session][category] || [];
            const idx = list.findIndex(m => m.name === name);
            if (idx !== -1) {
                list.splice(idx, 1);
            }
        });
        showToast(`"${name}" deleted globally.`, "success");
    } else {
        const list = DB.db[active][category] || [];
        const idx = list.findIndex(m => m.name === name);
        if (idx !== -1) {
            list.splice(idx, 1);
        }
        showToast(`"${name}" removed from this session.`, "success");
    }
    
    DB.save();
    closeModal('edit-member-modal');
    renderDashboard();
}

function bulkMarkAttendance(isPresent) {
    const active = DB.activeSession;
    if (!active || !DB.db[active]) return;
    
    DB.commitState();
    
    let totalCount = 0;
    Object.values(DB.db[active]).forEach(list => {
        list.forEach(m => {
            m.present = isPresent;
            totalCount++;
        });
    });
    
    DB.save();
    showToast(`Marked all ${totalCount} members as ${isPresent ? 'present' : 'absent'}.`, isPresent ? "success" : "warning");
    renderDashboard();
}

/* ==========================================================================
   SESSION OPERATIONS
   ========================================================================== */

function createSessionAction() {
    const nameInput = document.getElementById('new-session-name');
    const copyOption = document.getElementById('copy-members-option');
    const newSessionName = nameInput.value.trim();
    
    if (!newSessionName) {
        showToast("Please enter a valid session name.", "error");
        return;
    }
    
    if (DB.db[newSessionName]) {
        showToast("A session with this name already exists.", "error");
        return;
    }
    
    DB.commitState();
    
    // Initialize new session map
    DB.db[newSessionName] = {};
    DB.categories.forEach(cat => {
        DB.db[newSessionName][cat] = [];
    });
    
    if (copyOption.checked && DB.activeSession && DB.db[DB.activeSession]) {
        const sourceSession = DB.db[DB.activeSession];
        DB.categories.forEach(cat => {
            const sourceMembers = sourceSession[cat] || [];
            DB.db[newSessionName][cat] = sourceMembers.map(m => ({
                name: m.name,
                present: false // Reset markers to false/absent
            }));
        });
        showToast(`Session "${newSessionName}" created. Copied members list.`, "success");
    } else {
        showToast(`New empty session "${newSessionName}" created.`, "success");
    }
    
    DB.activeSession = newSessionName;
    DB.save();
    closeModal('add-session-modal');
    renderSidebar();
    renderDashboard();
}

function renameSessionAction(oldName, newName) {
    if (DB.db[newName]) {
        showToast(`Session "${newName}" already exists.`, "error");
        return;
    }
    
    DB.commitState();
    
    // Copy reference, assign to new key, delete old key
    DB.db[newName] = DB.db[oldName];
    delete DB.db[oldName];
    
    if (DB.activeSession === oldName) {
        DB.activeSession = newName;
    }
    
    DB.save();
    showToast(`Session renamed to "${newName}".`, "success");
    renderSidebar();
    renderDashboard();
}

function deleteSessionAction(sessionName) {
    DB.commitState();
    
    delete DB.db[sessionName];
    
    if (DB.activeSession === sessionName) {
        const remain = Object.keys(DB.db);
        DB.activeSession = remain.length > 0 ? remain[0] : "";
    }
    
    DB.save();
    showToast(`Session "${sessionName}" deleted.`, "warning");
    renderSidebar();
    renderDashboard();
}

/* ==========================================================================
   CATEGORY CONFIGURATION
   ========================================================================== */

function renderCategoriesSettingsList() {
    const list = document.getElementById('categories-settings-list');
    if (!list) return;
    
    list.innerHTML = '';
    DB.categories.forEach((cat, index) => {
        const li = document.createElement('li');
        li.className = 'category-settings-item';
        
        const span = document.createElement('span');
        span.className = 'category-settings-name';
        span.textContent = cat;
        
        const delBtn = document.createElement('button');
        delBtn.className = 'session-action-icon-btn';
        delBtn.title = "Delete Category";
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        delBtn.onclick = () => removeCategoryAction(cat);
        
        li.appendChild(span);
        li.appendChild(delBtn);
        list.appendChild(li);
    });
}

function addCategoryAction() {
    const input = document.getElementById('new-category-name');
    const catName = input.value.trim();
    
    if (!catName) {
        showToast("Category name cannot be empty.", "error");
        return;
    }
    
    if (DB.categories.includes(catName)) {
        showToast("Category already exists.", "error");
        return;
    }
    
    DB.commitState();
    
    DB.categories.push(catName);
    
    // Add to all existing sessions in DB
    Object.keys(DB.db).forEach(session => {
        if (!DB.db[session][catName]) {
            DB.db[session][catName] = [];
        }
    });
    
    DB.save();
    input.value = '';
    showToast(`Category "${catName}" added.`, "success");
    renderCategoriesSettingsList();
    renderDashboard();
}

function removeCategoryAction(catName) {
    if (DB.categories.length <= 1) {
        showToast("You must keep at least one category.", "error");
        return;
    }
    
    let membersCount = 0;
    Object.keys(DB.db).forEach(s => {
        if (DB.db[s][catName]) membersCount += DB.db[s][catName].length;
    });
    
    let msg = `Are you sure you want to delete category "${catName}" globally?`;
    if (membersCount > 0) {
        msg += ` This will delete all ${membersCount} member profiles inside it across all sessions.`;
    }
    
    if (!confirm(msg)) return;
    
    DB.commitState();
    
    // Remove from array
    DB.categories = DB.categories.filter(c => c !== catName);
    
    // Remove from sessions in DB
    Object.keys(DB.db).forEach(s => {
        delete DB.db[s][catName];
    });
    
    DB.save();
    showToast(`Category "${catName}" deleted.`, "warning");
    renderCategoriesSettingsList();
    renderDashboard();
}

function confirmResetDatabase() {
    if (confirm("🚨 WARNING: This will delete ALL custom sessions, categories, and attendance records, reverting everything back to the original July 30/31 dataset. Proceed?")) {
        DB.resetToDefault();
        closeModal('settings-modal');
        showToast("Database reset to defaults successfully.", "success");
        renderSidebar();
        renderDashboard();
    }
}

/* ==========================================================================
   EXPORT AND IMPORT BACKUPS
   ========================================================================== */

function exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB.db, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `attendance_backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
    showToast("JSON backup downloaded.", "success");
}

function exportDataCSV() {
    // Generate a CSV file detailing attendance history
    // Header: Name, Category, Session 1, Session 2, Session 3...
    const sessions = Object.keys(DB.db);
    if (sessions.length === 0) {
        showToast("No session data to export.", "error");
        return;
    }
    
    // Gather all unique member keys: map by name -> category
    const memberRegistry = {}; // { name: category }
    sessions.forEach(s => {
        Object.keys(DB.db[s]).forEach(cat => {
            DB.db[s][cat].forEach(m => {
                memberRegistry[m.name] = cat;
            });
        });
    });
    
    const sortedNames = Object.keys(memberRegistry).sort((a,b) => a.localeCompare(b));
    
    // Write headers
    let csvContent = "Member Name,Category," + sessions.map(s => `"${s}"`).join(",") + "\n";
    
    // Write rows
    sortedNames.forEach(name => {
        const cat = memberRegistry[name];
        const row = [name, cat];
        
        sessions.forEach(s => {
            const list = DB.db[s][cat] || [];
            const member = list.find(m => m.name === name);
            if (member) {
                row.push(member.present ? "Present" : "Absent");
            } else {
                row.push("Not Enrolled"); // Member wasn't added in that session
            }
        });
        csvContent += row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",") + "\n";
    });
    
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `attendance_report_${new Date().toISOString().slice(0,10)}.csv`);
    dlAnchor.click();
    showToast("CSV report downloaded.", "success");
}

function importDataJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Simple validation schema check
            const keys = Object.keys(importedData);
            if (keys.length === 0) throw new Error("File is empty.");
            
            // Overwrite and load
            DB.commitState();
            DB.db = importedData;
            
            // Extract categories from imported dataset to match
            const categorySet = new Set();
            keys.forEach(s => {
                Object.keys(importedData[s]).forEach(c => categorySet.add(c));
            });
            if (categorySet.size > 0) {
                DB.categories = Array.from(categorySet);
            }
            
            DB.activeSession = keys[0];
            DB.save();
            
            showToast("Database restored successfully from backup file.", "success");
            closeModal('backup-modal');
            renderSidebar();
            renderDashboard();
        } catch (err) {
            showToast("Failed to restore backup. Invalid format: " + err.message, "error");
        }
        // Reset file input so same file can be uploaded again
        event.target.value = '';
    };
    reader.readAsText(file);
}

/* ==========================================================================
   HISTORY UNDO / REDO TRIGGERS
   ========================================================================== */

function undo() {
    if (DB.undo()) {
        showToast("Action undone.", "info");
        renderSidebar();
        renderDashboard();
    }
}

function redo() {
    if (DB.redo()) {
        showToast("Action redone.", "info");
        renderSidebar();
        renderDashboard();
    }
}

/* ==========================================================================
   KEYBOARD SHORTCUTS
   ========================================================================== */

document.addEventListener('keydown', (e) => {
    // Check if user is typing inside an input/textarea to avoid blocking default shortcuts
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
    } else if (isCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
    }
});

/* ==========================================================================
   MOBILE COLLAPSIBLE SIDEBAR TRIGGERS
   ========================================================================== */

function initMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openBtn = document.getElementById('sidebar-open-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');
    
    if (openBtn && sidebar && overlay) {
        openBtn.onclick = () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        };
    }
    
    if (closeBtn && sidebar && overlay) {
        closeBtn.onclick = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };
    }
    
    if (overlay && sidebar) {
        overlay.onclick = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };
    }
}

/* ==========================================================================
   APPLICATION INITIALIZE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileSidebar();
    
    // Register search listeners
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', renderLists);
    }
    
    const sessionSearchInput = document.getElementById('session-search');
    if (sessionSearchInput) {
        sessionSearchInput.addEventListener('input', renderSidebar);
    }
    
    // Register bulk markings buttons
    const bulkPresentBtn = document.getElementById('bulk-present-btn');
    if (bulkPresentBtn) {
        bulkPresentBtn.onclick = () => bulkMarkAttendance(true);
    }
    
    const bulkAbsentBtn = document.getElementById('bulk-absent-btn');
    if (bulkAbsentBtn) {
        bulkAbsentBtn.onclick = () => bulkMarkAttendance(false);
    }
    
    // Initial UI Draws
    DB.updateHistoryButtons();
    renderSidebar();
    renderDashboard();
});
