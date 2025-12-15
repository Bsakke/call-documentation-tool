// ===== FLOATING PERSONAL NOTES =====
let floatingNotes = [];

function loadFloatingNotes() {
    const saved = localStorage.getItem('floatingNotes');
    if (saved) {
        try {
            floatingNotes = JSON.parse(saved);
        } catch (e) {
            floatingNotes = [];
        }
    } else {
        floatingNotes = [];
    }
    renderFloatingNotes();
}

function saveFloatingNotes() {
    localStorage.setItem('floatingNotes', JSON.stringify(floatingNotes));
}

function addFloatingNote() {
    const id = Date.now();
    const note = {
        id,
        content: '',
        left: 120 + Math.floor(Math.random()*100),
        top: 120 + Math.floor(Math.random()*100),
        width: 320,
        height: 180
    };
    floatingNotes.push(note);
    saveFloatingNotes();
    renderFloatingNotes();
}

function deleteFloatingNote(id) {
    if (confirm('Delete this note?')) {
        floatingNotes = floatingNotes.filter(n => n.id !== id);
        saveFloatingNotes();
        renderFloatingNotes();
    }
}

function updateFloatingNoteContent(id, content) {
    const note = floatingNotes.find(n => n.id === id);
    if (note) {
        note.content = content;
        saveFloatingNotes();
    }
}

function renderFloatingNotes() {
    const container = document.getElementById('floatingNotesContainer');
    if (!container) return;
    container.innerHTML = '';
    floatingNotes.forEach(note => {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'floating-note';
        noteDiv.style.left = note.left + 'px';
        noteDiv.style.top = note.top + 'px';
        noteDiv.style.width = note.width + 'px';
        noteDiv.style.height = note.height + 'px';
        noteDiv.setAttribute('data-id', note.id);
        noteDiv.innerHTML = `
            <div class="floating-note-header" onmousedown="startDragFloatingNote(event, ${note.id})">
                Personal Note
                <button class="floating-note-delete" onclick="deleteFloatingNote(${note.id}); event.stopPropagation();">Delete</button>
            </div>
            <textarea class="floating-note-content" placeholder="Write your note here..." oninput="updateFloatingNoteContent(${note.id}, this.value)">${note.content || ''}</textarea>
            <div class="floating-note-resize" onmousedown="startResizeFloatingNote(event, ${note.id})"></div>
        `;
        container.appendChild(noteDiv);
    });
}

// Dragging logic

// Dragging logic (floating notes)
let floatingDragNoteId = null, floatingDragOffsetX = 0, floatingDragOffsetY = 0;
function startDragFloatingNote(e, id) {
    floatingDragNoteId = id;
    const note = floatingNotes.find(n => n.id === id);
    if (!note) return;
    const noteDiv = document.querySelector(`.floating-note[data-id='${id}']`);
    if (noteDiv) noteDiv.classList.add('dragging');
    floatingDragOffsetX = e.clientX - note.left;
    floatingDragOffsetY = e.clientY - note.top;
    document.addEventListener('mousemove', dragFloatingNote);
    document.addEventListener('mouseup', stopDragFloatingNote);
    e.preventDefault();
}
function dragFloatingNote(e) {
    if (floatingDragNoteId === null) return;
    const note = floatingNotes.find(n => n.id === floatingDragNoteId);
    if (!note) return;
    note.left = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - floatingDragOffsetX));
    note.top = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - floatingDragOffsetY));
    saveFloatingNotes();
    renderFloatingNotes();
}
function stopDragFloatingNote() {
    const noteDiv = document.querySelector(`.floating-note[data-id='${floatingDragNoteId}']`);
    if (noteDiv) noteDiv.classList.remove('dragging');
    floatingDragNoteId = null;
    document.removeEventListener('mousemove', dragFloatingNote);
    document.removeEventListener('mouseup', stopDragFloatingNote);
}

// Resizing logic (floating notes)
let floatingResizeNoteId = null, floatingResizeStartX = 0, floatingResizeStartY = 0, floatingStartW = 0, floatingStartH = 0;
function startResizeFloatingNote(e, id) {
    floatingResizeNoteId = id;
    const note = floatingNotes.find(n => n.id === id);
    if (!note) return;
    floatingResizeStartX = e.clientX;
    floatingResizeStartY = e.clientY;
    floatingStartW = note.width;
    floatingStartH = note.height;
    document.addEventListener('mousemove', resizeFloatingNote);
    document.addEventListener('mouseup', stopResizeFloatingNote);
    e.preventDefault();
    e.stopPropagation();
}
function resizeFloatingNote(e) {
    if (floatingResizeNoteId === null) return;
    const note = floatingNotes.find(n => n.id === floatingResizeNoteId);
    if (!note) return;
    note.width = Math.max(220, Math.min(600, floatingStartW + (e.clientX - floatingResizeStartX)));
    note.height = Math.max(100, Math.min(600, floatingStartH + (e.clientY - floatingResizeStartY)));
    saveFloatingNotes();
    renderFloatingNotes();
}
function stopResizeFloatingNote() {
    floatingResizeNoteId = null;
    document.removeEventListener('mousemove', resizeFloatingNote);
    document.removeEventListener('mouseup', stopResizeFloatingNote);
}

// Load floating notes on page load
window.addEventListener('DOMContentLoaded', loadFloatingNotes);
// Deck 2.0 - Main Application Logic

// ===== STATE MANAGEMENT =====
let categories = {};
let callStats = {};
let customFields = [];
let lastLoggedMainCategory = '';
let lastLoggedSubCategory = '';
let lastLoggedCall = null;
let undoTimeout = null;
let undoCountdownInterval = null;
let inboundCount = 0;
let outboundCount = 0;

// Stopwatch state
let stopwatchInterval = null;
let stopwatchElapsed = 0; // in seconds
let stopwatchRunning = false;
let stopwatchHistory = [];

// ===== UTILITY FUNCTIONS =====

/**
 * Copy text to clipboard with fallback
 */
function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification(successMessage);
    }).catch(err => {
        // Fallback for older browsers
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showNotification(successMessage);
    });
}

/**
 * Show notification message
 */
function showNotification(message) {
    const notification = document.getElementById('copyNotification');
    notification.textContent = `✓ ${message}`;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
}

/**
 * Format time display
 */
function formatTime(minutes, showHours = false) {
    if (!showHours || minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${mins}min`;
}

/**
 * Get call stats for a category
 */
function getStatsForCategory(categoryKey, isToday) {
    const source = isToday ? 'today' : 'allTime';
    return {
        calls: (callStats[source]?.[categoryKey]) || 0,
        inbound: (callStats[`${source}Inbound`]?.[categoryKey]) || 0,
        outbound: (callStats[`${source}Outbound`]?.[categoryKey]) || 0
    };
}

/**
 * Generate a sanitized key from a name
 */
function generateKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Calculate category statistics
 */
function calculateCategoryStats(isToday) {
    let totalCalls = 0;
    const mainCategoryCalls = {};
    const categoryDetails = {};
    
    Object.keys(categories).forEach(mainKey => {
        const subcategories = categories[mainKey].subcategories;
        mainCategoryCalls[mainKey] = 0;
        categoryDetails[mainKey] = {
            name: categories[mainKey].name,
            subcategories: {},
            totals: { calls: 0, inbound: 0, outbound: 0 }
        };
        
        Object.keys(subcategories).forEach(subKey => {
            const categoryKey = `${mainKey}_${subKey}`;
            const stats = getStatsForCategory(categoryKey, isToday);
            totalCalls += stats.calls;
            mainCategoryCalls[mainKey] += stats.calls;
            
            categoryDetails[mainKey].totals.calls += stats.calls;
            categoryDetails[mainKey].totals.inbound += stats.inbound;
            categoryDetails[mainKey].totals.outbound += stats.outbound;
            categoryDetails[mainKey].subcategories[subKey] = {
                name: subcategories[subKey].name,
                stats: stats
            };
        });
    });
    
    return { totalCalls, mainCategoryCalls, categoryDetails };
}

/**
 * Create empty state message element
 */
function createEmptyState(message, colspan = null) {
    if (colspan) {
        return `<tr><td colspan="${colspan}" style="text-align: center; color: var(--text-secondary);">${message}</td></tr>`;
    }
    const div = document.createElement('div');
    div.style.padding = '20px';
    div.style.textAlign = 'center';
    div.style.color = 'var(--text-secondary)';
    div.textContent = message;
    return div;
}

let currentFocusedIndex = -1;

// ===== CATEGORY MANAGEMENT =====

function getDefaultCategories() {
    return {
        'helppi': {
            name: 'Helppi',
            subcategories: {}
        },
        'kayttotuki': {
            name: 'Käyttötuki',
            subcategories: {}
        },
        'aspa': {
            name: 'Aspa',
            subcategories: {}
        }
    };
}

function initCategories() {
    const savedCategories = localStorage.getItem('callCategories');
    if (savedCategories) {
        try {
            const parsed = JSON.parse(savedCategories);
            // Ensure parsed is a plain object with expected shape (not an array)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const keys = Object.keys(parsed);
                // Detect empty or invalid structure (no readable names)
                const hasValid = keys.some(k => parsed[k] && typeof parsed[k].name === 'string' && parsed[k].name.trim());
                if (keys.length === 0 || !hasValid) {
                    console.warn('Saved categories empty or invalid, restoring defaults.');
                    categories = getDefaultCategories();
                    saveCategories();
                    showNotification('Saved categories were invalid. Restored default categories.');
                } else {
                    // Merge defaults so the three baseline categories always exist
                    const defaults = getDefaultCategories();
                    Object.keys(defaults).forEach(dk => {
                        if (!parsed[dk]) parsed[dk] = defaults[dk];
                    });
                    categories = parsed;
                    // Persist merged defaults back to storage
                    saveCategories();
                }
            } else {
                throw new Error('Invalid categories format');
            }
        } catch (e) {
            console.warn('Failed to parse saved categories, resetting to defaults.', e);
            categories = getDefaultCategories();
            saveCategories();
            showNotification('Saved categories were corrupted. Restored default categories.');
        }
    } else {
        categories = getDefaultCategories();
        saveCategories();
    }
    populateMainCategoryDropdown();
    loadCallStats();
}

function saveCategories() {
    localStorage.setItem('callCategories', JSON.stringify(categories));
    populateMainCategoryDropdown();
    updateStatsDisplay();
}

function populateMainCategoryDropdown() {
    const select = document.getElementById('mainCategory');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Select Main Category --</option>';

    const keys = Object.keys(categories || {});
    // Sort category keys by their display name for a predictable order
    keys.sort((a, b) => (categories[a].name || a).localeCompare(categories[b].name || b));
    // Debugging: log available categories so we can troubleshoot empty dropdown issues
    console.debug('populateMainCategoryDropdown — keys:', keys, 'categories:', categories);
    if (keys.length === 0) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- No Categories Available --';
        emptyOption.disabled = true;
        select.appendChild(emptyOption);
        console.warn('No categories available to populate mainCategory dropdown.');
        showNotification('No categories available. Please add categories via Manage Categories.');
        return;
    }
    if (keys.length === 0) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- No Categories Available --';
        emptyOption.disabled = true;
        select.appendChild(emptyOption);
        return;
    }
    keys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = categories[key].name || key;
        select.appendChild(option);
    });

    // If previous selection still valid, re-select it, otherwise leave placeholder
    if (currentValue && categories[currentValue]) {
        select.value = currentValue;
        updateSubcategoryDropdown();
    }
}

function updateSubcategoryDropdown() {
    const mainCategoryKey = document.getElementById('mainCategory').value;
    const subInput = document.getElementById('subCategoryInput');
    
    if (subInput) {
        // Clear input when main category changes
        subInput.value = '';
    }
    
    updateCustomerFields();
    generateTemplate();
    hideSubcategoryDropdown();
}

function handleSubcategoryInput() {
    currentFocusedIndex = -1; // Reset focus when typing
    showSubcategoryDropdown();
    generateTemplate();
}

function handleSubcategoryKeydown(event) {
    const dropdown = document.getElementById('subCategoryDropdown');
    
    if (!dropdown || dropdown.style.display === 'none') {
        return;
    }
    
    const items = dropdown.querySelectorAll('.custom-dropdown-item');
    
    if (items.length === 0) {
        return;
    }
    
    // Handle Tab key
    if (event.key === 'Tab') {
        event.preventDefault();
        
        if (event.shiftKey) {
            // Shift+Tab: cycle backwards
            currentFocusedIndex--;
            if (currentFocusedIndex < 0) {
                currentFocusedIndex = items.length - 1;
            }
        } else {
            // Tab: cycle forwards
            currentFocusedIndex++;
            if (currentFocusedIndex >= items.length) {
                currentFocusedIndex = 0;
            }
        }
        
        // Remove previous focus
        items.forEach(item => item.classList.remove('focused'));
        
        // Add focus to current item
        if (currentFocusedIndex >= 0 && currentFocusedIndex < items.length) {
            const focusedItem = items[currentFocusedIndex];
            focusedItem.classList.add('focused');
            
            // Scroll into view if needed
            focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
    // Handle Enter key
    else if (event.key === 'Enter') {
        event.preventDefault();
        
        if (currentFocusedIndex >= 0 && currentFocusedIndex < items.length) {
            // Select the focused item
            items[currentFocusedIndex].click();
        }
    }
    // Handle Escape key
    else if (event.key === 'Escape') {
        hideSubcategoryDropdown();
        currentFocusedIndex = -1;
    }
    // Handle Arrow Down
    else if (event.key === 'ArrowDown') {
        event.preventDefault();
        currentFocusedIndex++;
        if (currentFocusedIndex >= items.length) {
            currentFocusedIndex = 0;
        }
        
        items.forEach(item => item.classList.remove('focused'));
        if (currentFocusedIndex >= 0 && currentFocusedIndex < items.length) {
            const focusedItem = items[currentFocusedIndex];
            focusedItem.classList.add('focused');
            focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
    // Handle Arrow Up
    else if (event.key === 'ArrowUp') {
        event.preventDefault();
        currentFocusedIndex--;
        if (currentFocusedIndex < 0) {
            currentFocusedIndex = items.length - 1;
        }
        
        items.forEach(item => item.classList.remove('focused'));
        if (currentFocusedIndex >= 0 && currentFocusedIndex < items.length) {
            const focusedItem = items[currentFocusedIndex];
            focusedItem.classList.add('focused');
            focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
}

function showSubcategoryDropdown() {
    const mainCategoryKey = document.getElementById('mainCategory').value;
    const subInput = document.getElementById('subCategoryInput');
    const dropdown = document.getElementById('subCategoryDropdown');
    
    if (!dropdown || !mainCategoryKey) {
        if (dropdown) dropdown.style.display = 'none';
        return;
    }
    
    const inputValue = subInput.value.toLowerCase().trim();
    const subcategories = categories[mainCategoryKey]?.subcategories || {};
    
    dropdown.innerHTML = '';
    
    // Filter subcategories based on input
    const filtered = Object.keys(subcategories).filter(key => {
        const name = subcategories[key].name.toLowerCase();
        return inputValue === '' || name.includes(inputValue);
    });
    
    if (filtered.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'custom-dropdown-empty';
        emptyDiv.textContent = inputValue ? 'No matching subcategories. Type to create new.' : 'No subcategories yet. Type to create new.';
        dropdown.appendChild(emptyDiv);
    } else {
        filtered.forEach(key => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';
            item.textContent = subcategories[key].name;
            item.setAttribute('data-key', key);
            
            // Highlight if matches current input
            if (subcategories[key].name.toLowerCase() === inputValue) {
                item.classList.add('selected');
            }
            
            item.onclick = function() {
                selectSubcategory(subcategories[key].name, key);
            };
            
            dropdown.appendChild(item);
        });
    }
    
    dropdown.style.display = 'block';
}

function toggleSubcategoryDropdown() {
    const dropdown = document.getElementById('subCategoryDropdown');
    if (dropdown.style.display === 'none') {
        showSubcategoryDropdown();
    } else {
        hideSubcategoryDropdown();
    }
}

function hideSubcategoryDropdown() {
    const dropdown = document.getElementById('subCategoryDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
        currentFocusedIndex = -1; // Reset focus when closing
    }
}

function selectSubcategory(name, key) {
    const subInput = document.getElementById('subCategoryInput');
    if (subInput) {
        subInput.value = name;
    }
    hideSubcategoryDropdown();
    generateTemplate();
}

function getSubcategoryValue() {
    const subInput = document.getElementById('subCategoryInput');
    return subInput ? subInput.value.trim() : '';
}

function getSubcategoryKeyFromName(mainCategoryKey, subcategoryName) {
    if (!mainCategoryKey || !categories[mainCategoryKey]) return null;
    
    const subcategories = categories[mainCategoryKey].subcategories;
    const normalizedInput = subcategoryName.toLowerCase();
    
    // Check for exact name match first
    for (const key in subcategories) {
        if (subcategories[key].name.toLowerCase() === normalizedInput) {
            return key;
        }
    }
    
    // Check for key match
    if (subcategories[subcategoryName]) {
        return subcategoryName;
    }
    
    return null;
}

function updateCustomerFields() {
    const mainCategoryKey = document.getElementById('mainCategory').value;
    const kayttotukiFields = document.getElementById('kayttotukiFields');
    
    if (mainCategoryKey === 'kayttotuki') {
        kayttotukiFields.style.display = 'block';
    } else {
        kayttotukiFields.style.display = 'none';
    }
}

// ===== CALL STATISTICS =====

function loadCallStats() {
    const savedStats = localStorage.getItem('callStats');
    if (savedStats) {
        callStats = JSON.parse(savedStats);
        const today = new Date().toDateString();
        if (callStats.lastDate !== today) {
            callStats.today = {};
            callStats.todayInbound = {};
            callStats.todayOutbound = {};
            callStats.todayTimestamps = [];
            callStats.lastDate = today;
            saveCallStats();
        }
        if (!callStats.todayTimestamps) callStats.todayTimestamps = [];
        if (!callStats.allTimeTimestamps) callStats.allTimeTimestamps = [];
    } else {
        callStats = {
            today: {},
            todayInbound: {},
            todayOutbound: {},
            allTime: {},
            allTimeInbound: {},
            allTimeOutbound: {},
            todayTimestamps: [],
            allTimeTimestamps: [],
            lastDate: new Date().toDateString()
        };
    }
    updateStatsDisplay();
}

function saveCallStats() {
    localStorage.setItem('callStats', JSON.stringify(callStats));
}

function updateStatsDisplay() {
    updateStatsTable('statsTableBodyToday', true);
    updateStatsTable('statsTableBodyAllTime', false);
}

function updateStatsTable(tableBodyId, isToday) {
    const tableBody = document.getElementById(tableBodyId);
    tableBody.innerHTML = '';
    
    const { totalCalls, mainCategoryCalls, categoryDetails } = calculateCategoryStats(isToday);
    
    let hasCategories = false;
    let grandTotalInbound = 0;
    let grandTotalOutbound = 0;
    let grandTotalCalls = 0;
    
    // Render categories using pre-calculated stats
    Object.keys(categoryDetails).forEach(mainKey => {
        const mainCat = categoryDetails[mainKey];
        
        if (Object.keys(mainCat.subcategories).length > 0) {
            hasCategories = true;
            
            const mainCategoryTotal = mainCat.totals.inbound + mainCat.totals.outbound;
            const mainCategoryAvg = mainCat.totals.calls > 0 ? Math.round(mainCategoryTotal / mainCat.totals.calls) : 0;
            const mainCategoryPercentage = totalCalls > 0 ? ((mainCategoryCalls[mainKey] / totalCalls) * 100).toFixed(1) : 0;
            
            if (mainCat.totals.calls > 0) {
                // Accumulate grand totals
                grandTotalInbound += mainCat.totals.inbound;
                grandTotalOutbound += mainCat.totals.outbound;
                grandTotalCalls += mainCat.totals.calls;
                
                const headerRow = document.createElement('tr');
                headerRow.className = 'stats-header-row';
                
                if (isToday) {
                    headerRow.innerHTML = `
                        <td class="stats-header-cell">${mainCat.name}</td>
                        <td class="stats-header-cell">${mainCat.totals.calls}</td>
                        <td class="stats-header-cell">${mainCat.totals.inbound} min</td>
                        <td class="stats-header-cell">${mainCat.totals.outbound} min</td>
                        <td class="stats-header-cell">${mainCategoryTotal} min</td>
                        <td class="stats-header-cell stats-percentage">${mainCategoryPercentage}%</td>
                    `;
                } else {
                    headerRow.innerHTML = `
                        <td class="stats-header-cell">${mainCat.name}</td>
                        <td class="stats-header-cell">${mainCat.totals.calls}</td>
                        <td class="stats-header-cell">${formatTime(mainCat.totals.inbound, true)}</td>
                        <td class="stats-header-cell">${formatTime(mainCat.totals.outbound, true)}</td>
                        <td class="stats-header-cell">${formatTime(mainCategoryTotal, true)}</td>
                        <td class="stats-header-cell">${formatTime(mainCategoryAvg, false)}</td>
                        <td class="stats-header-cell stats-percentage">${mainCategoryPercentage}%</td>
                    `;
                }
                tableBody.appendChild(headerRow);
                
                // Add subcategory rows
                Object.keys(mainCat.subcategories).forEach(subKey => {
                    const subcat = mainCat.subcategories[subKey];
                    
                    if (subcat.stats.calls > 0) {
                        const totalTime = subcat.stats.inbound + subcat.stats.outbound;
                        const avgTime = subcat.stats.calls > 0 ? Math.round(totalTime / subcat.stats.calls) : 0;
                        const row = document.createElement('tr');
                        
                        if (isToday) {
                            row.innerHTML = `
                                <td style="padding-left: 30px;">${subcat.name}</td>
                                <td><span class="stats-number">${subcat.stats.calls}</span></td>
                                <td><span class="stats-number">${subcat.stats.inbound} min</span></td>
                                <td><span class="stats-number">${subcat.stats.outbound} min</span></td>
                                <td><span class="stats-number">${totalTime} min</span></td>
                                <td></td>
                            `;
                        } else {
                            row.innerHTML = `
                                <td style="padding-left: 30px;">${subcat.name}</td>
                                <td><span class="stats-number">${subcat.stats.calls}</span></td>
                                <td><span class="stats-number">${formatTime(subcat.stats.inbound, true)}</span></td>
                                <td><span class="stats-number">${formatTime(subcat.stats.outbound, true)}</span></td>
                                <td><span class="stats-number">${formatTime(totalTime, true)}</span></td>
                                <td><span class="stats-number">${formatTime(avgTime, false)}</span></td>
                                <td></td>
                            `;
                        }
                        tableBody.appendChild(row);
                    }
                });
            }
        }
    });
    
    // Add grand total row if there are categories
    if (hasCategories && grandTotalCalls > 0) {
        const grandTotal = grandTotalInbound + grandTotalOutbound;
        const grandAvg = Math.round(grandTotal / grandTotalCalls);
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.background = 'var(--button-bg)';
        totalRow.style.color = 'white';
        
        if (isToday) {
            totalRow.innerHTML = `
                <td>Total</td>
                <td>${grandTotalCalls}</td>
                <td>${grandTotalInbound} min</td>
                <td>${grandTotalOutbound} min</td>
                <td>${grandTotal} min</td>
                <td>100.0%</td>
            `;
        } else {
            totalRow.innerHTML = `
                <td>Total</td>
                <td>${grandTotalCalls}</td>
                <td>${formatTime(grandTotalInbound, true)}</td>
                <td>${formatTime(grandTotalOutbound, true)}</td>
                <td>${formatTime(grandTotal, true)}</td>
                <td>${formatTime(grandAvg, false)}</td>
                <td>100.0%</td>
            `;
        }
        tableBody.appendChild(totalRow);
    }
    
    if (!hasCategories) {
        const colspan = isToday ? '6' : '7';
        tableBody.innerHTML = createEmptyState('No subcategories yet. Add subcategories to start tracking.', colspan);
    }
}

function exportStats(type) {
    const isToday = type === 'today';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `call-stats-${type}-${timestamp}.csv`;
    
    const timestamps = isToday ? callStats.todayTimestamps : callStats.allTimeTimestamps;
    let timeWindow = 'No calls logged yet';
    
    if (timestamps && timestamps.length > 0) {
        const sortedTimestamps = [...timestamps].sort();
        const firstCall = new Date(sortedTimestamps[0]);
        const lastCall = new Date(sortedTimestamps[sortedTimestamps.length - 1]);
        const formatDateTime = (date) => date.toLocaleString('fi-FI', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit' 
        });
        timeWindow = `${formatDateTime(firstCall)} - ${formatDateTime(lastCall)}`;
    }
    
    const { totalCalls, mainCategoryCalls, categoryDetails } = calculateCategoryStats(isToday);
    const normalizeText = (text) => text.replace(/ä/g, 'a').replace(/Ä/g, 'A').replace(/ö/g, 'o').replace(/Ö/g, 'O');
    
    let csv = `"Call Statistics Report - ${isToday ? 'Today' : 'All-Time'}"\n`;
    csv += `"Time Window: ${timeWindow}"\n`;
    csv += `"Total Calls: ${totalCalls}"\n\n`;
    
    csv += isToday 
        ? 'Main Category,Subcategory,Calls,Percentage,Inbound (min),Outbound (min),Total (min)\n'
        : 'Main Category,Subcategory,Calls,Percentage,Inbound,Outbound,Total,Avg per Call\n';
    
    Object.keys(categoryDetails).forEach(mainKey => {
        const mainCat = categoryDetails[mainKey];
        const mainCategoryPercentage = totalCalls > 0 ? ((mainCategoryCalls[mainKey] / totalCalls) * 100).toFixed(1) : 0;
        const normalizedMainCat = normalizeText(mainCat.name);
        
        csv += `"${normalizedMainCat}","",,"${mainCategoryPercentage}%",,,\n`;
        
        Object.keys(mainCat.subcategories).forEach(subKey => {
            const subcat = mainCat.subcategories[subKey];
            const totalTime = subcat.stats.inbound + subcat.stats.outbound;
            const avgTime = subcat.stats.calls > 0 ? Math.round(totalTime / subcat.stats.calls) : 0;
            const normalizedSubCat = normalizeText(subcat.name);
            
            if (isToday) {
                csv += `"","${normalizedSubCat}",${subcat.stats.calls},,${subcat.stats.inbound},${subcat.stats.outbound},${totalTime}\n`;
            } else {
                csv += `"","${normalizedSubCat}",${subcat.stats.calls},,"${formatTime(subcat.stats.inbound, true)}","${formatTime(subcat.stats.outbound, true)}","${formatTime(totalTime, true)}","${formatTime(avgTime, false)}"\n`;
            }
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Stats exported to ${filename}`);
}

// ===== DARK MODE =====

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const btn = document.querySelector('.dark-mode-toggle');
    btn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
}

function loadDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    // Always default to dark mode
    const isDark = darkMode !== 'false';
    
    if (isDark) {
        document.body.classList.add('dark-mode');
        const btn = document.querySelector('.dark-mode-toggle');
        if (btn) btn.textContent = '☀️ Light';
        // Save the preference
        localStorage.setItem('darkMode', 'true');
    }
}

// ===== CUSTOMER SECTION =====

function toggleCustomerSection() {
    const section = document.getElementById('customerFieldsSection');
    const toggle = document.getElementById('customerSectionToggle');
    const isCollapsed = section.style.display === 'none';
    
    if (isCollapsed) {
        section.style.display = 'block';
        toggle.textContent = '▼';
        localStorage.setItem('customerSectionCollapsed', 'false');
    } else {
        section.style.display = 'none';
        toggle.textContent = '▶';
        localStorage.setItem('customerSectionCollapsed', 'true');
    }
}

function loadCustomerSectionState() {
    const isCollapsed = localStorage.getItem('customerSectionCollapsed') === 'true';
    if (isCollapsed) {
        document.getElementById('customerFieldsSection').style.display = 'none';
        document.getElementById('customerSectionToggle').textContent = '▶';
    }
}

// ===== STOPWATCH FUNCTIONS =====

function toggleStopwatchSection() {
    const section = document.getElementById('stopwatchSection');
    const toggle = document.getElementById('stopwatchSectionToggle');
    const isCollapsed = section.style.display === 'none';
    
    if (isCollapsed) {
        section.style.display = 'block';
        toggle.textContent = '▼';
        localStorage.setItem('stopwatchSectionCollapsed', 'false');
    } else {
        section.style.display = 'none';
        toggle.textContent = '▶';
        localStorage.setItem('stopwatchSectionCollapsed', 'true');
    }
}

function loadStopwatchSectionState() {
    const isCollapsed = localStorage.getItem('stopwatchSectionCollapsed');
    // Default to collapsed if not set
    if (isCollapsed === null || isCollapsed === 'true') {
        document.getElementById('stopwatchSection').style.display = 'none';
        document.getElementById('stopwatchSectionToggle').textContent = '▶';
    } else {
        document.getElementById('stopwatchSection').style.display = 'block';
        document.getElementById('stopwatchSectionToggle').textContent = '▼';
    }
    
    // Load history from localStorage
    const savedHistory = localStorage.getItem('stopwatchHistory');
    if (savedHistory) {
        stopwatchHistory = JSON.parse(savedHistory);
        updateStopwatchHistoryDisplay();
    }
}

function formatStopwatchTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateStopwatchDisplay() {
    document.getElementById('stopwatchDisplay').textContent = formatStopwatchTime(stopwatchElapsed);
}

function startStopwatch() {
    if (!stopwatchRunning) {
        stopwatchRunning = true;
        document.getElementById('stopwatchStartBtn').disabled = true;
        document.getElementById('stopwatchPauseBtn').disabled = false;
        
        stopwatchInterval = setInterval(() => {
            stopwatchElapsed++;
            updateStopwatchDisplay();
        }, 1000);
    }
}

function pauseStopwatch() {
    if (stopwatchRunning) {
        stopwatchRunning = false;
        clearInterval(stopwatchInterval);
        document.getElementById('stopwatchStartBtn').disabled = false;
        document.getElementById('stopwatchPauseBtn').disabled = true;
    }
}

function resetStopwatch() {
    // Save to history if there's elapsed time and a name
    if (stopwatchElapsed > 0) {
        const taskName = document.getElementById('stopwatchName').value.trim() || 'Unnamed Task';
        const timestamp = new Date().toLocaleString();
        
        stopwatchHistory.unshift({
            name: taskName,
            duration: stopwatchElapsed,
            timestamp: timestamp
        });
        
        // Keep only last 20 entries
        if (stopwatchHistory.length > 20) {
            stopwatchHistory = stopwatchHistory.slice(0, 20);
        }
        
        localStorage.setItem('stopwatchHistory', JSON.stringify(stopwatchHistory));
        updateStopwatchHistoryDisplay();
    }
    
    // Reset stopwatch
    pauseStopwatch();
    stopwatchElapsed = 0;
    updateStopwatchDisplay();
    document.getElementById('stopwatchStartBtn').disabled = false;
    document.getElementById('stopwatchPauseBtn').disabled = true;
}

function updateStopwatchHistoryDisplay() {
    const historyList = document.getElementById('stopwatchHistoryList');
    
    if (stopwatchHistory.length === 0) {
        historyList.innerHTML = '<div style="color: var(--text-secondary); font-style: italic;">No recorded sessions yet</div>';
        return;
    }
    
    historyList.innerHTML = stopwatchHistory.map((entry, index) => `
        <div style="padding: 8px; margin-bottom: 5px; background: var(--card-bg); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <div style="font-weight: 600;">${entry.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${entry.timestamp}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: bold; color: var(--button-bg);">${formatStopwatchTime(entry.duration)}</div>
                <button onclick="deleteStopwatchEntry(${index})" style="background: #f56565; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Delete</button>
            </div>
        </div>
    `).join('');
}

function deleteStopwatchEntry(index) {
    if (confirm('Delete this timer entry?')) {
        stopwatchHistory.splice(index, 1);
        localStorage.setItem('stopwatchHistory', JSON.stringify(stopwatchHistory));
        updateStopwatchHistoryDisplay();
    }
}

// ===== WEEKLY SCHEDULE =====

let weeklySchedule = {
    monday: { start: '', end: '' },
    tuesday: { start: '', end: '' },
    wednesday: { start: '', end: '' },
    thursday: { start: '', end: '' },
    friday: { start: '', end: '' },
    saturday: { start: '', end: '' },
    sunday: { start: '', end: '' }
};

function loadSchedule() {
    const saved = localStorage.getItem('weeklySchedule');
    if (saved) {
        weeklySchedule = JSON.parse(saved);
    }
    updateScheduleDisplay();
}

function updateScheduleDisplay() {
    const display = document.getElementById('weeklyScheduleDisplay');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const todayIndex = today === 0 ? 6 : today - 1; // Convert to 0 = Monday
    
    display.innerHTML = days.map((day, index) => {
        const schedule = weeklySchedule[day];
        const hasSchedule = schedule.start && schedule.end;
        const isToday = index === todayIndex;
        
        // Determine color: green for day off, red for 12:00/12:15 start, default otherwise
        let textColor;
        if (!hasSchedule) {
            textColor = '#68d391'; // Lighter green for day off
        } else if (schedule.start === '12:00' || schedule.start === '12:15') {
            textColor = '#f56565'; // Red for late shifts
        } else {
            textColor = 'var(--text-primary)'; // Default color
        }
        
        // Use the same color for day name if not today, otherwise use button color
        const dayColor = isToday ? 'var(--button-bg)' : textColor;
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 4px; background: var(--section-bg); border-radius: 4px; border-left: 3px solid ${isToday ? 'var(--button-bg)' : 'transparent'};">
                <span style="font-weight: ${isToday ? '600' : '400'}; color: ${dayColor};">${dayNames[index]}</span>
                <span style="color: ${textColor}; font-size: 14px;">
                    ${hasSchedule ? `${schedule.start} - ${schedule.end}` : 'Day off'}
                </span>
            </div>
        `;
    }).join('');
}

function openScheduleManager() {
    const modal = document.getElementById('scheduleModal');
    const editList = document.getElementById('scheduleEditList');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Specific start time options
    const startTimeOptions = ['07:45', '08:00', '08:15', '08:30', '08:45', '09:00', '10:00', '11:00', '12:00', '12:15'];
    
    // Generate end time options (all day with 15-minute increments)
    const endTimeOptions = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hour = String(h).padStart(2, '0');
            const minute = String(m).padStart(2, '0');
            endTimeOptions.push(`${hour}:${minute}`);
        }
    }
    
    editList.innerHTML = days.map((day, index) => {
        const startOptions = startTimeOptions.map(time => 
            `<option value="${time}" ${weeklySchedule[day].start === time ? 'selected' : ''}>${time}</option>`
        ).join('');
        
        const endOptions = endTimeOptions.map(time => 
            `<option value="${time}" ${weeklySchedule[day].end === time ? 'selected' : ''}>${time}</option>`
        ).join('');
        
        return `
            <div style="margin-bottom: 15px; padding: 15px; background: var(--section-bg); border-radius: 6px;">
                <label style="font-weight: 600; display: block; margin-bottom: 10px; color: var(--text-primary);">${dayNames[index]}</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="flex: 1;">
                        <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Start Time</label>
                        <select id="schedule_${day}_start" onchange="autoCalculateEndTime('${day}')" 
                                style="width: 100%; padding: 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-primary);">
                            <option value="">-- Off --</option>
                            ${startOptions}
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                            End Time 
                            <span style="font-size: 10px; font-style: italic;">(auto +8h)</span>
                        </label>
                        <select id="schedule_${day}_end" 
                                style="width: 100%; padding: 8px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-primary);">
                            <option value="">-- Off --</option>
                            ${endOptions}
                        </select>
                    </div>
                    <button onclick="clearDaySchedule('${day}')" style="background: #f56565; color: white; padding: 8px 12px; margin-top: 20px;">Clear</button>
                </div>
            </div>
        `;
    }).join('');
    
    modal.style.display = 'block';
}

function autoCalculateEndTime(day) {
    const startInput = document.getElementById(`schedule_${day}_start`);
    const endInput = document.getElementById(`schedule_${day}_end`);
    
    if (startInput.value) {
        // Calculate end time (start + 8 hours)
        const [hours, minutes] = startInput.value.split(':').map(Number);
        const endHours = (hours + 8) % 24;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        endInput.value = endTime;
    } else {
        endInput.value = '';
    }
}

function clearDaySchedule(day) {
    document.getElementById(`schedule_${day}_start`).value = '';
    document.getElementById(`schedule_${day}_end`).value = '';
}

function saveSchedule() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        const start = document.getElementById(`schedule_${day}_start`).value;
        const end = document.getElementById(`schedule_${day}_end`).value;
        weeklySchedule[day] = { start, end };
    });
    
    localStorage.setItem('weeklySchedule', JSON.stringify(weeklySchedule));
    updateScheduleDisplay();
    closeScheduleManager();
    showNotification('Schedule saved successfully!');
}

function closeScheduleManager() {
    document.getElementById('scheduleModal').style.display = 'none';
}

function toggleScheduleSidebar() {
    // Don't toggle if we just finished dragging
    if (scheduleHasMoved) {
        scheduleHasMoved = false;
        return;
    }
    
    const sidebar = document.getElementById('scheduleSidebar');
    const handle = document.getElementById('scheduleToggleIcon');
    if (!sidebar || !handle) return;
    
    const isHidden = sidebar.classList.contains('hidden');
    
    if (isHidden) {
        sidebar.classList.remove('hidden');
        handle.textContent = '▲';
        localStorage.setItem('scheduleSidebarHidden', 'false');
    } else {
        sidebar.classList.add('hidden');
        handle.textContent = '▼';
        localStorage.setItem('scheduleSidebarHidden', 'true');
    }
}

function loadScheduleSidebarState() {
    const isHidden = localStorage.getItem('scheduleSidebarHidden') === 'true';
    const handle = document.getElementById('scheduleToggleIcon');
    const sidebar = document.getElementById('scheduleSidebar');
    
    if (!handle || !sidebar) return;
    
    if (isHidden) {
        sidebar.classList.add('hidden');
        handle.textContent = '▼';
    } else {
        sidebar.classList.remove('hidden');
        handle.textContent = '▲';
    }
    
    // Load saved position or set default
    const savedPosition = localStorage.getItem('schedulePosition');
    if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        updateSchedulePosition(left, top);
    } else {
        // Set default position
        // Use setTimeout to ensure window dimensions are available
        setTimeout(() => {
            updateSchedulePosition(20, 60);
        }, 0);
    }
}

// ===== SCHEDULE DRAGGING =====

let isDraggingSchedule = false;
let scheduleHasMoved = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function initScheduleDragging() {
    const toggleBtn = document.getElementById('scheduleToggleBtn');
    const sidebar = document.getElementById('scheduleSidebar');
    
    toggleBtn.addEventListener('mousedown', function(e) {
        const isHidden = sidebar.classList.contains('hidden');
        if (!isHidden) {
            isDraggingSchedule = true;
            scheduleHasMoved = false;
            sidebar.classList.add('dragging');
            
            // Get current position from style or default
            const currentLeft = parseInt(sidebar.style.left) || 20;
            const currentTop = parseInt(sidebar.style.top) || 20;
            
            // Calculate offset from current position
            dragOffsetX = e.clientX - currentLeft;
            dragOffsetY = e.clientY - currentTop;
            
            toggleBtn.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDraggingSchedule) {
            scheduleHasMoved = true;
            const newLeft = e.clientX - dragOffsetX;
            const newTop = e.clientY - dragOffsetY;
            updateSchedulePosition(newLeft, newTop);
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDraggingSchedule) {
            isDraggingSchedule = false;
            const sidebar = document.getElementById('scheduleSidebar');
            sidebar.classList.remove('dragging');
            const toggleBtn = document.getElementById('scheduleToggleBtn');
            toggleBtn.style.cursor = 'pointer';
            
            // Save position
            localStorage.setItem('schedulePosition', JSON.stringify({ 
                left: parseInt(sidebar.style.left) || 20, 
                top: parseInt(sidebar.style.top) || 20
            }));
        }
    });
}

function updateSchedulePosition(left, top) {
    const sidebar = document.getElementById('scheduleSidebar');
    
    // Constrain to viewport
    const maxLeft = window.innerWidth - 280;
    const maxTop = window.innerHeight - 100;
    
    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));
    
    // Update position
    sidebar.style.left = left + 'px';
    sidebar.style.top = top + 'px';
}

// ===== PERSONAL NOTES =====

function toggleNotesSidebar() {
    // Don't toggle if we just finished dragging
    if (notesHasMoved) {
        notesHasMoved = false;
        return;
    }
    
    const sidebar = document.getElementById('notesSidebar');
    const handle = document.getElementById('notesToggleIcon');
    if (!sidebar || !handle) return;
    
    const isHidden = sidebar.classList.contains('hidden');
    
    if (isHidden) {
        sidebar.classList.remove('hidden');
        handle.textContent = '▲';
        localStorage.setItem('notesSidebarHidden', 'false');
    } else {
        sidebar.classList.add('hidden');
        handle.textContent = '▼';
        localStorage.setItem('notesSidebarHidden', 'true');
    }
}

function loadNotesSidebarState() {
    const isHidden = localStorage.getItem('notesSidebarHidden') === 'true';
    const handle = document.getElementById('notesToggleIcon');
    const sidebar = document.getElementById('notesSidebar');
    
    if (!handle || !sidebar) return;
    
    if (isHidden) {
        sidebar.classList.add('hidden');
        handle.textContent = '▼';
    } else {
        sidebar.classList.remove('hidden');
        handle.textContent = '▲';
    }
    
    // Load saved position or set default
    const savedPosition = localStorage.getItem('notesPosition');
    if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        updateNotesPosition(left, top);
    } else {
        // Set default position (right side of screen)
        // Use setTimeout to ensure window dimensions are available
        setTimeout(() => {
            const defaultLeft = Math.max(20, (window.innerWidth || 1200) - 320);
            updateNotesPosition(defaultLeft, 60);
        }, 0);
    }
    
    // Load saved notes
    const savedNotes = localStorage.getItem('personalNotes');
    if (savedNotes) {
        document.getElementById('personalNotesArea').value = savedNotes;
    }
    
    // Load saved size
    loadNotesSavedSize();
    loadPersonalNotes(); // Load existing notes on init
}

// Personal Notes Management
let personalNotesData = [];

function loadPersonalNotes() {
    const saved = localStorage.getItem('personalNotes');
    if (saved) {
        try {
            personalNotesData = JSON.parse(saved);
        } catch (e) {
            // If old format (single string), convert to new format
            personalNotesData = saved ? [{ id: Date.now(), content: saved }] : [];
        }
    } else {
        personalNotesData = [];
    }
    renderNotes();
}

function savePersonalNotes() {
    localStorage.setItem('personalNotes', JSON.stringify(personalNotesData));
}

function renderNotes() {
    const container = document.getElementById('notesListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (personalNotesData.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-style: italic;">No notes yet. Click "+ Add Note" to create one.</div>';
        return;
    }
    
    personalNotesData.forEach(note => {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-item';
        noteDiv.innerHTML = `
            <button class="note-delete-btn" onclick="deleteNote(${note.id})" title="Delete this note">Delete</button>
            <textarea 
                placeholder="Write your note here..."
                oninput="updateNoteContent(${note.id}, this.value)"
            >${note.content || ''}</textarea>
        `;
        container.appendChild(noteDiv);
    });
}

function addNewNote() {
    const newNote = {
        id: Date.now(),
        content: ''
    };
    personalNotesData.push(newNote);
    savePersonalNotes();
    renderNotes();
    
    // Focus the new note's textarea
    setTimeout(() => {
        const textareas = document.querySelectorAll('.note-item textarea');
        if (textareas.length > 0) {
            textareas[textareas.length - 1].focus();
        }
    }, 50);
}

function updateNoteContent(id, content) {
    const note = personalNotesData.find(n => n.id === id);
    if (note) {
        note.content = content;
        savePersonalNotes();
    }
}

function deleteNote(id) {
    if (confirm('Are you sure you want to delete this note?')) {
        personalNotesData = personalNotesData.filter(n => n.id !== id);
        savePersonalNotes();
        renderNotes();
    }
}

let isDraggingNotes = false;
let notesHasMoved = false;
let notesDragOffsetX = 0;
let notesDragOffsetY = 0;

function initNotesDragging() {
    const toggleBtn = document.getElementById('notesToggleBtn');
    const sidebar = document.getElementById('notesSidebar');
    // If the old notes sidebar has been removed, skip attaching listeners
    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('mousedown', function(e) {
        const isHidden = sidebar.classList.contains('hidden');
        if (!isHidden) {
            isDraggingNotes = true;
            notesHasMoved = false;
            sidebar.classList.add('dragging');
            
            // Get current position from style or default
            const currentLeft = parseInt(sidebar.style.left) || 20;
            const currentTop = parseInt(sidebar.style.top) || 20;
            
            // Calculate offset from current position
            notesDragOffsetX = e.clientX - currentLeft;
            notesDragOffsetY = e.clientY - currentTop;
            
            toggleBtn.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDraggingNotes) {
            notesHasMoved = true;
            const newLeft = e.clientX - notesDragOffsetX;
            const newTop = e.clientY - notesDragOffsetY;
            updateNotesPosition(newLeft, newTop);
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDraggingNotes) {
            isDraggingNotes = false;
            const sidebar = document.getElementById('notesSidebar');
            sidebar.classList.remove('dragging');
            const toggleBtn = document.getElementById('notesToggleBtn');
            toggleBtn.style.cursor = 'pointer';
            
            // Save position
            localStorage.setItem('notesPosition', JSON.stringify({ 
                left: parseInt(sidebar.style.left) || 20, 
                top: parseInt(sidebar.style.top) || 20
            }));
        }
    });
}

function updateNotesPosition(left, top) {
    const sidebar = document.getElementById('notesSidebar');
    
    // Constrain to viewport
    const maxLeft = window.innerWidth - 280;
    const maxTop = window.innerHeight - 100;
    
    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));
    
    // Update position
    sidebar.style.left = left + 'px';
    sidebar.style.top = top + 'px';
}

// ===== NOTES RESIZING =====

let isResizingNotes = false;
let resizeDirection = '';
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

function initNotesResizing() {
    const rightHandle = document.getElementById('notesResizeRight');
    const bottomHandle = document.getElementById('notesResizeBottom');
    const cornerHandle = document.getElementById('notesResizeCorner');
    const sidebar = document.getElementById('notesSidebar');
    // If sidebar doesn't exist (we removed it), don't attach resize listeners
    if (!rightHandle || !bottomHandle || !cornerHandle || !sidebar) return;

    // Right edge resize
    rightHandle.addEventListener('mousedown', function(e) {
        isResizingNotes = true;
        resizeDirection = 'right';
        resizeStartX = e.clientX;
        resizeStartWidth = sidebar.offsetWidth;
        sidebar.classList.add('resizing');
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Bottom edge resize
    bottomHandle.addEventListener('mousedown', function(e) {
        isResizingNotes = true;
        resizeDirection = 'bottom';
        resizeStartY = e.clientY;
        const content = document.getElementById('notesContent');
        // Get the current height value, or use offsetHeight if not set
        const currentHeight = content.style.height;
        resizeStartHeight = currentHeight ? parseInt(currentHeight) : content.offsetHeight;
        sidebar.classList.add('resizing');
        content.classList.add('resizing');
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Corner resize (both directions)
    cornerHandle.addEventListener('mousedown', function(e) {
        isResizingNotes = true;
        resizeDirection = 'corner';
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartWidth = sidebar.offsetWidth;
        const content = document.getElementById('notesContent');
        // Get the current height value, or use offsetHeight if not set
        const currentHeight = content.style.height;
        resizeStartHeight = currentHeight ? parseInt(currentHeight) : content.offsetHeight;
        sidebar.classList.add('resizing');
        content.classList.add('resizing');
        e.preventDefault();
        e.stopPropagation();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isResizingNotes) {
            const sidebar = document.getElementById('notesSidebar');
            const content = document.getElementById('notesContent');
            
            if (resizeDirection === 'right' || resizeDirection === 'corner') {
                const deltaX = e.clientX - resizeStartX;
                const newWidth = Math.max(280, Math.min(1200, resizeStartWidth + deltaX));
                sidebar.style.width = newWidth + 'px';
            }
            
            if (resizeDirection === 'bottom' || resizeDirection === 'corner') {
                const deltaY = e.clientY - resizeStartY;
                const newHeight = Math.max(150, Math.min(window.innerHeight - 100, resizeStartHeight + deltaY));
                content.style.height = newHeight + 'px';
            }
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizingNotes) {
            isResizingNotes = false;
            resizeDirection = '';
            
            // Remove resizing class
            const sidebar = document.getElementById('notesSidebar');
            const content = document.getElementById('notesContent');
            sidebar.classList.remove('resizing');
            content.classList.remove('resizing');
            
            // Save size
            localStorage.setItem('notesSize', JSON.stringify({
                width: sidebar.offsetWidth,
                height: content.offsetHeight
            }));
        }
    });
}

function loadNotesSavedSize() {
    const savedSize = localStorage.getItem('notesSize');
    if (savedSize) {
        const { width, height } = JSON.parse(savedSize);
        const sidebar = document.getElementById('notesSidebar');
        const content = document.getElementById('notesContent');
        sidebar.style.width = width + 'px';
        content.style.height = height + 'px';
    }
}

// ===== CUSTOM FIELDS =====

function loadCustomFields() {
    const saved = localStorage.getItem('customFields');
    if (saved) {
        customFields = JSON.parse(saved);
    }
    renderCustomFields();
}

function saveCustomFields() {
    localStorage.setItem('customFields', JSON.stringify(customFields));
    renderCustomFields();
}

function renderCustomFields() {
    const container = document.getElementById('customFieldsContainer');
    container.innerHTML = '';
    
    customFields.forEach((field, index) => {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'field-group';
        fieldGroup.innerHTML = `
            <label for="customField${index}">${field.name}:</label>
            <div class="field-with-copy">
                <input type="text" id="customField${index}" placeholder="Enter ${field.name}" oninput="generateTemplate()">
                <button class="copy-field-btn" tabindex="-1" onclick="copyField('customField${index}')">Copy</button>
            </div>
        `;
        container.appendChild(fieldGroup);
    });
}

function renderCustomFieldsList() {
    const listContainer = document.getElementById('customFieldsList');
    listContainer.innerHTML = '';
    
    if (customFields.length === 0) {
        listContainer.appendChild(createEmptyState('No custom fields yet. Add one below!'));
        return;
    }
    
    customFields.forEach((field, index) => {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.innerHTML = `
            <div class="template-item-content">
                <h3>${field.name}</h3>
            </div>
            <div class="template-item-actions">
                <button class="btn-delete" onclick="deleteCustomField(${index})">Delete</button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

function addCustomField() {
    const name = document.getElementById('newFieldName').value.trim();
    
    if (!name) {
        alert('Please enter a field name!');
        return;
    }
    
    if (customFields.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        alert('A field with this name already exists!');
        return;
    }
    
    customFields.push({ name: name });
    saveCustomFields();
    renderCustomFieldsList();
    document.getElementById('newFieldName').value = '';
    showNotification('Custom field added!');
}

function deleteCustomField(index) {
    if (confirm(`Are you sure you want to delete the field "${customFields[index].name}"?`)) {
        customFields.splice(index, 1);
        saveCustomFields();
        renderCustomFieldsList();
        showNotification('Custom field deleted!');
    }
}

// ===== TIME TRACKING =====

function addQuickMinutes(type, minutes) {
    const count = type === 'inbound' ? inboundCount : outboundCount;
    if (count === 0) {
        addTimeEntry(type);
    }
    
    const latestCount = type === 'inbound' ? inboundCount : outboundCount;
    const inputField = document.getElementById(`${type}Time${latestCount}`);
    if (inputField) {
        const currentValue = parseInt(inputField.value) || 0;
        inputField.value = currentValue + minutes;
        updateTotalTime();
        generateTemplate();
    }
}

function addTimeEntry(type) {
    if (type === 'inbound') {
        inboundCount++;
        const container = document.getElementById('inboundEntries');
        const entry = document.createElement('div');
        entry.className = 'time-entry';
        entry.id = `inbound${inboundCount}`;
        entry.innerHTML = `
            <input type="number" 
                   id="inboundTime${inboundCount}" 
                   placeholder="Minutes" 
                   min="0" 
                   onchange="updateTotalTime(); generateTemplate();">
        `;
        container.appendChild(entry);
    } else {
        outboundCount++;
        const container = document.getElementById('outboundEntries');
        const entry = document.createElement('div');
        entry.className = 'time-entry';
        entry.id = `outbound${outboundCount}`;
        entry.innerHTML = `
            <input type="number" 
                   id="outboundTime${outboundCount}" 
                   placeholder="Minutes" 
                   min="0" 
                   onchange="updateTotalTime(); generateTemplate();">
        `;
        container.appendChild(entry);
    }
}

function updateTotalTime() {
    let currentInbound = 0;
    let currentOutbound = 0;
    
    document.querySelectorAll('[id^="inboundTime"]').forEach(input => {
        currentInbound += parseInt(input.value) || 0;
    });
    
    document.querySelectorAll('[id^="outboundTime"]').forEach(input => {
        currentOutbound += parseInt(input.value) || 0;
    });
    
    let totalLoggedInbound = 0;
    let totalLoggedOutbound = 0;
    
    if (callStats.todayInbound) {
        Object.values(callStats.todayInbound).forEach(val => totalLoggedInbound += val);
    }
    
    if (callStats.todayOutbound) {
        Object.values(callStats.todayOutbound).forEach(val => totalLoggedOutbound += val);
    }
    
    const totalInboundWithCurrent = totalLoggedInbound + currentInbound;
    const totalOutboundWithCurrent = totalLoggedOutbound + currentOutbound;
    const totalDailyTime = totalInboundWithCurrent + totalOutboundWithCurrent;
    
    document.getElementById('inboundTotal').textContent = `${totalInboundWithCurrent} min`;
    document.getElementById('outboundTotal').textContent = `${totalOutboundWithCurrent} min`;
    document.getElementById('grandTotal').textContent = `${totalDailyTime} minutes`;
    
    return { inbound: currentInbound, outbound: currentOutbound, total: currentInbound + currentOutbound };
}

// ===== CALL LOGGING =====

function logCall() {
    const mainCategoryKey = document.getElementById('mainCategory').value;
    const subcategoryName = getSubcategoryValue();
    
    // Pause stopwatch if running (don't log the time)
    if (stopwatchRunning) {
        pauseStopwatch();
    }
    
    if (!mainCategoryKey) {
        alert('Error: Please select a main category!');
        return;
    }
    
    if (!subcategoryName) {
        alert('Error: Please enter or select a subcategory!');
        return;
    }
    
    // Check if subcategory exists or needs to be created
    let subCategoryKey = getSubcategoryKeyFromName(mainCategoryKey, subcategoryName);
    
    if (!subCategoryKey) {
        // Create new subcategory
        subCategoryKey = generateKey(subcategoryName);
        
        if (categories[mainCategoryKey].subcategories[subCategoryKey]) {
            alert('A subcategory with this name already exists!');
            return;
        }
        
        // Add the new subcategory
        categories[mainCategoryKey].subcategories[subCategoryKey] = {
            name: subcategoryName,
            template: ''
        };
        saveCategories();
        updateSubcategoryDropdown();
        showNotification(`New subcategory "${subcategoryName}" added!`);
    }
    
    const timeData = updateTotalTime();
    const inboundMinutes = timeData.inbound;
    const outboundMinutes = timeData.outbound;
    
    const inboundInputs = document.querySelectorAll('[id^="inboundTime"]');
    const outboundInputs = document.querySelectorAll('[id^="outboundTime"]');
    
    let hasTimeInput = false;
    inboundInputs.forEach(input => { if (input.value !== '') hasTimeInput = true; });
    outboundInputs.forEach(input => { if (input.value !== '') hasTimeInput = true; });
    
    if (!hasTimeInput) {
        alert('Error: Please enter time values (0 or more) in at least one time field before logging!');
        return;
    }
    
    lastLoggedMainCategory = mainCategoryKey;
    lastLoggedSubCategory = subCategoryKey;
    
    const categoryKey = `${mainCategoryKey}_${subCategoryKey}`;
    
    // Initialize counters
    ['today', 'todayInbound', 'todayOutbound', 'allTime', 'allTimeInbound', 'allTimeOutbound'].forEach(key => {
        if (!callStats[key][categoryKey]) callStats[key][categoryKey] = 0;
    });
    
    // Increment counters
    callStats.today[categoryKey]++;
    callStats.todayInbound[categoryKey] += inboundMinutes;
    callStats.todayOutbound[categoryKey] += outboundMinutes;
    callStats.allTime[categoryKey]++;
    callStats.allTimeInbound[categoryKey] += inboundMinutes;
    callStats.allTimeOutbound[categoryKey] += outboundMinutes;
    
    const currentTimestamp = new Date().toISOString();
    if (!callStats.todayTimestamps) callStats.todayTimestamps = [];
    if (!callStats.allTimeTimestamps) callStats.allTimeTimestamps = [];
    callStats.todayTimestamps.push(currentTimestamp);
    callStats.allTimeTimestamps.push(currentTimestamp);
    
    lastLoggedCall = {
        categoryKey,
        mainCategoryKey,
        subCategoryKey,
        inboundMinutes,
        outboundMinutes,
        timestamp: currentTimestamp
    };
    
    saveCallStats();
    updateStatsDisplay();
    showNotification('Call logged successfully!');
    showUndoButton();
    
    if (undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
        hideUndoButton();
        lastLoggedCall = null;
    }, 60000);
    
    // Clear all fields
    const fieldsToClear = ['firstName', 'lastName', 'phoneNumber', 'email', 'bpn', 
                           'ytunnus', 'companyName', 'contact2Name', 'contact2Phone', 'contact2Email',
                           'ticketNumber1', 'ticketNumber2', 'id1', 'id2'];
    fieldsToClear.forEach(id => document.getElementById(id).value = '');
    
    customFields.forEach((field, index) => {
        const elem = document.getElementById(`customField${index}`);
        if (elem) elem.value = '';
    });
    
    document.querySelectorAll('[id^="inboundTime"], [id^="outboundTime"]').forEach(input => input.value = '');
    updateTotalTime();
    
    // Restore categories
    document.getElementById('mainCategory').value = lastLoggedMainCategory;
    document.getElementById('mainCategory').dispatchEvent(new Event('change'));
    setTimeout(() => {
        const subInput = document.getElementById('subCategoryInput');
        if (subInput && lastLoggedSubCategory && categories[lastLoggedMainCategory]?.subcategories[lastLoggedSubCategory]) {
            subInput.value = categories[lastLoggedMainCategory].subcategories[lastLoggedSubCategory].name;
            generateTemplate();
        }
    }, 50);
}

function undoLastCall() {
    if (!lastLoggedCall) {
        alert('No recent call to undo!');
        return;
    }
    
    const call = lastLoggedCall;
    const statsKeys = ['today', 'todayInbound', 'todayOutbound', 'allTime', 'allTimeInbound', 'allTimeOutbound'];
    const amounts = {
        today: 1,
        todayInbound: call.inboundMinutes,
        todayOutbound: call.outboundMinutes,
        allTime: 1,
        allTimeInbound: call.inboundMinutes,
        allTimeOutbound: call.outboundMinutes
    };
    
    statsKeys.forEach(key => {
        if (callStats[key][call.categoryKey]) {
            callStats[key][call.categoryKey] -= amounts[key];
            if (callStats[key][call.categoryKey] === 0) {
                delete callStats[key][call.categoryKey];
            }
        }
    });
    
    // Remove timestamps
    [callStats.todayTimestamps, callStats.allTimeTimestamps].forEach(arr => {
        if (arr) {
            const index = arr.indexOf(call.timestamp);
            if (index > -1) arr.splice(index, 1);
        }
    });
    
    saveCallStats();
    updateStatsDisplay();
    updateTotalTime();
    
    lastLoggedCall = null;
    if (undoTimeout) clearTimeout(undoTimeout);
    hideUndoButton();
    
    showNotification('Last call undone successfully!');
}

function showUndoButton() {
    const undoBtn = document.getElementById('undoButton');
    if (undoBtn) {
        undoBtn.style.display = 'block';
        
        let secondsLeft = 60;
        updateUndoButtonText(secondsLeft);
        
        if (undoCountdownInterval) clearInterval(undoCountdownInterval);
        undoCountdownInterval = setInterval(() => {
            secondsLeft--;
            updateUndoButtonText(secondsLeft);
            if (secondsLeft <= 0) clearInterval(undoCountdownInterval);
        }, 1000);
    }
}

function updateUndoButtonText(seconds) {
    const undoBtn = document.getElementById('undoButton');
    if (undoBtn) {
        undoBtn.textContent = `↩️ Undo Last Call (${seconds}s)`;
    }
}

function hideUndoButton() {
    const undoBtn = document.getElementById('undoButton');
    if (undoBtn) {
        undoBtn.style.display = 'none';
    }
    if (undoCountdownInterval) {
        clearInterval(undoCountdownInterval);
        undoCountdownInterval = null;
    }
}

// ===== TEMPLATE GENERATION =====

function copyField(fieldId) {
    const field = document.getElementById(fieldId);
    let value = '';
    
    if (field.tagName === 'SELECT') {
        const selectedOption = field.options[field.selectedIndex];
        value = selectedOption ? selectedOption.text : '';
    } else {
        value = field.value;
    }
    
    if (!value || value.startsWith('--')) {
        showNotification('Field is empty!');
        return;
    }
    
    copyToClipboard(value, 'Copied to clipboard!');
}

function generateTemplate() {
    const mainCategoryKey = document.getElementById('mainCategory').value;
    const subcategoryName = getSubcategoryValue();
    const subCategoryKey = subcategoryName ? getSubcategoryKeyFromName(mainCategoryKey, subcategoryName) : null;
    
    const fields = ['firstName', 'lastName', 'phoneNumber', 'email', 'bpn',
                   'ytunnus', 'companyName', 'contact2Name', 'contact2Phone', 'contact2Email',
                   'ticketNumber1', 'ticketNumber2', 'id1', 'id2'];
    const values = {};
    fields.forEach(id => values[id] = document.getElementById(id).value);
    
    const timeData = updateTotalTime();
    const outputDiv = document.getElementById('output');
    
    if (!mainCategoryKey && !subcategoryName && !values.firstName && !values.lastName && 
        !values.phoneNumber && !values.email && !values.bpn) {
        outputDiv.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                <p>Your documentation summary will appear here...</p>
                <p style="margin-top: 10px;">Fill in the details on the left to generate summary.</p>
            </div>
        `;
        return;
    }

    let template = null;
    if (mainCategoryKey && subCategoryKey && categories[mainCategoryKey]?.subcategories[subCategoryKey]) {
        template = categories[mainCategoryKey].subcategories[subCategoryKey].template;
    }
    
    let summary = 'Summary:\n';
    
    if (values.firstName || values.lastName) summary += `${values.firstName} ${values.lastName}`.trim() + '\n';
    if (values.phoneNumber) summary += `${values.phoneNumber}\n`;
    if (values.email) summary += `${values.email}\n`;
    if (values.bpn) summary += `${values.bpn}\n`;
    
    customFields.forEach((field, index) => {
        const val = document.getElementById(`customField${index}`)?.value.trim();
        if (val) summary += `${val}\n`;
    });
    
    if (mainCategoryKey === 'kayttotuki') {
        ['ytunnus', 'companyName', 'contact2Name', 'contact2Phone', 'contact2Email', 
         'ticketNumber1', 'ticketNumber2', 'id1', 'id2'].forEach(key => {
            if (values[key]) summary += `${values[key]}\n`;
        });
    }
    
    if (mainCategoryKey && subcategoryName) {
        const mainCatText = document.getElementById('mainCategory').options[document.getElementById('mainCategory').selectedIndex].text;
        summary += `${mainCatText} - ${subcategoryName}\n`;
    }
    
    if (timeData.inbound > 0) summary += `Inbound: ${timeData.inbound} min\n`;
    if (timeData.outbound > 0) summary += `Outbound: ${timeData.outbound} min\n`;
    if (template) summary += `${template}\n`;

    createSection(outputDiv, 'Complete Summary', summary, 'summary');
}

function createSection(container, title, content, id) {
    const section = document.createElement('div');
    section.className = 'output-section';
    
    const header = document.createElement('div');
    header.className = 'output-section-header';
    header.innerHTML = `
        <span>${title}</span>
        <button class="copy-section-btn" onclick="copySectionToClipboard('${id}')">Copy</button>
    `;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'output-section-content';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'editable-textarea';
    textarea.id = `section-${id}`;
    textarea.value = content;
    
    contentDiv.appendChild(textarea);
    section.appendChild(header);
    section.appendChild(contentDiv);
    container.innerHTML = '';
    container.appendChild(section);
}

function copySectionToClipboard(sectionId) {
    const textarea = document.getElementById(`section-${sectionId}`);
    if (!textarea) {
        showNotification('Section not found!');
        return;
    }
    copyToClipboard(textarea.value, 'Summary copied to clipboard!');
}

// ===== MODAL MANAGEMENT =====

function openCategoryManager() {
    populateViewMainCategoryDropdown();
    const currentMainCategory = document.getElementById('mainCategory').value;
    if (currentMainCategory) {
        document.getElementById('viewMainCategory').value = currentMainCategory;
    }
    renderCategoryList();
    document.getElementById('categoryModal').style.display = 'block';
}

function closeCategoryManager() {
    document.getElementById('categoryModal').style.display = 'none';
    ['newMainCategoryName', 'newSubcategoryName', 'newSubcategoryTemplate'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

function openCustomerFieldsManager() {
    renderCustomFieldsList();
    document.getElementById('customerFieldsModal').style.display = 'block';
}

function closeCustomerFieldsManager() {
    document.getElementById('customerFieldsModal').style.display = 'none';
    document.getElementById('newFieldName').value = '';
}

function populateViewMainCategoryDropdown() {
    const select = document.getElementById('viewMainCategory');
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Select Main Category --</option>';
    
    Object.keys(categories).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = categories[key].name;
        select.appendChild(option);
    });
    
    if (currentValue && categories[currentValue]) {
        select.value = currentValue;
    }
}

function renderCategoryList() {
    const listContainer = document.getElementById('categoryList');
    const selectedMainKey = document.getElementById('viewMainCategory').value;
    listContainer.innerHTML = '';
    
    if (!selectedMainKey) {
        listContainer.appendChild(createEmptyState('Please select a main category above to view and manage its subcategories.'));
        return;
    }
    
    const mainCategory = categories[selectedMainKey];
    if (!mainCategory) {
        listContainer.appendChild(createEmptyState('Selected category not found.'));
        return;
    }
    
    const mainItem = document.createElement('div');
    mainItem.className = 'template-item';
    mainItem.style.background = 'var(--section-bg)';
    mainItem.innerHTML = `
        <div class="template-item-content">
            <h3 style="color: var(--button-bg);">${mainCategory.name}</h3>
            <small style="color: var(--text-secondary);">Main Category</small>
        </div>
        <div class="template-item-actions">
            <button class="btn-delete" onclick="deleteMainCategory('${selectedMainKey}')">Delete Category</button>
        </div>
    `;
    listContainer.appendChild(mainItem);
    
    const subcategories = mainCategory.subcategories;
    
    if (Object.keys(subcategories).length === 0) {
        const emptyMsg = createEmptyState('No subcategories yet. Add one below!');
        emptyMsg.style.marginTop = '10px';
        listContainer.appendChild(emptyMsg);
    } else {
        Object.keys(subcategories).forEach(subKey => {
            const subcategory = subcategories[subKey];
            const subItem = document.createElement('div');
            subItem.className = 'template-item';
            subItem.style.marginTop = '10px';
            subItem.innerHTML = `
                <div class="template-item-content">
                    <h3>${subcategory.name}</h3>
                    <small style="color: var(--text-secondary);">Subcategory</small>
                    <textarea id="subcat-${selectedMainKey}-${subKey}" rows="4" placeholder="Template text...">${subcategory.template || ''}</textarea>
                </div>
                <div class="template-item-actions">
                    <button class="btn-save" onclick="updateSubcategory('${selectedMainKey}', '${subKey}')">Save</button>
                    <button class="btn-delete" onclick="deleteSubcategory('${selectedMainKey}', '${subKey}')">Delete</button>
                </div>
            `;
            listContainer.appendChild(subItem);
        });
    }
}

function addNewMainCategory() {
    const name = document.getElementById('newMainCategoryName').value.trim();
    
    if (!name) {
        alert('Please enter a main category name!');
        return;
    }
    
    const key = generateKey(name);
    
    if (categories[key]) {
        alert('A main category with this name already exists!');
        return;
    }
    
    categories[key] = { name: name, subcategories: {} };
    
    saveCategories();
    populateViewMainCategoryDropdown();
    showNotification('Main category added!');
    document.getElementById('newMainCategoryName').value = '';
    document.getElementById('viewMainCategory').value = key;
    // Also select the new category in the main dropdown so it's immediately available
    const mainSelect = document.getElementById('mainCategory');
    if (mainSelect) {
        mainSelect.value = key;
        updateSubcategoryDropdown();
    }
    renderCategoryList();
}

function addNewSubcategory() {
    const mainKey = document.getElementById('viewMainCategory').value;
    const name = document.getElementById('newSubcategoryName').value.trim();
    const template = document.getElementById('newSubcategoryTemplate').value.trim();
    
    if (!mainKey) {
        alert('Please select a main category first from the dropdown above!');
        return;
    }
    
    if (!name) {
        alert('Please enter a subcategory name!');
        return;
    }
    
    const key = generateKey(name);
    
    if (categories[mainKey].subcategories[key]) {
        alert('A subcategory with this name already exists in this main category!');
        return;
    }
    
    categories[mainKey].subcategories[key] = { name: name, template: template };
    
    saveCategories();
    renderCategoryList();
    showNotification('Subcategory added!');
    document.getElementById('newSubcategoryName').value = '';
    document.getElementById('newSubcategoryTemplate').value = '';
}

function updateSubcategory(mainKey, subKey) {
    const textarea = document.getElementById(`subcat-${mainKey}-${subKey}`);
    categories[mainKey].subcategories[subKey].template = textarea.value;
    saveCategories();
    showNotification('Subcategory updated!');
}

function deleteSubcategory(mainKey, subKey) {
    const subcatName = categories[mainKey].subcategories[subKey].name;
    if (confirm(`Are you sure you want to delete "${subcatName}"?`)) {
        delete categories[mainKey].subcategories[subKey];
        saveCategories();
        renderCategoryList();
        showNotification('Subcategory deleted!');
        generateTemplate();
    }
}

function deleteMainCategory(mainKey) {
    const mainCatName = categories[mainKey].name;
    const subcatCount = Object.keys(categories[mainKey].subcategories).length;
    
    const firstMessage = subcatCount > 0 
        ? `⚠️ WARNING ⚠️\n\nYou are about to delete the main category "${mainCatName}" which contains ${subcatCount} subcategory(ies).\n\nThis action will permanently delete:\n- The main category "${mainCatName}"\n- All ${subcatCount} subcategory(ies) under it\n\nAre you sure you want to continue?`
        : `Are you sure you want to delete the main category "${mainCatName}"?`;
    
    if (!confirm(firstMessage)) return;
    
    const secondMessage = `⚠️ FINAL CONFIRMATION ⚠️\n\nThis is your last chance to cancel!\n\nDeleting "${mainCatName}" and all its subcategories is PERMANENT and cannot be undone.\n\nClick OK to DELETE or Cancel to keep the category.`;
    
    if (confirm(secondMessage)) {
        delete categories[mainKey];
        saveCategories();
        populateViewMainCategoryDropdown();
        document.getElementById('viewMainCategory').value = '';
        renderCategoryList();
        showNotification('Main category deleted!');
        generateTemplate();
    }
}

// ===== EVENT LISTENERS =====

// Setup field event listeners
function setupEventListeners() {
    const fieldIds = ['firstName', 'lastName', 'phoneNumber', 'email', 'bpn',
                     'ytunnus', 'companyName', 'contact2Name', 'contact2Phone', 'contact2Email',
                     'ticketNumber1', 'ticketNumber2', 'id1', 'id2'];
    
    document.getElementById('mainCategory').addEventListener('change', updateSubcategoryDropdown);
    
    // Subcategory input now uses oninput in HTML, but add backup listener
    const subInput = document.getElementById('subCategoryInput');
    if (subInput) {
        subInput.addEventListener('input', handleSubcategoryInput);
    }
    
    fieldIds.forEach(id => {
        document.getElementById(id).addEventListener('input', generateTemplate);
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    // Close modals
    if (event.target.classList.contains('modal')) {
        if (event.target.id === 'categoryModal') closeCategoryManager();
        if (event.target.id === 'customerFieldsModal') closeCustomerFieldsManager();
    }
    
    // Close subcategory dropdown when clicking outside
    const dropdown = document.getElementById('subCategoryDropdown');
    const comboBox = document.querySelector('.combo-box-wrapper');
    if (dropdown && !comboBox?.contains(event.target)) {
        hideSubcategoryDropdown();
    }
};

// ===== INITIALIZATION =====

window.onload = function() {
    loadDarkModePreference();
    loadCustomerSectionState();
    loadStopwatchSectionState();
    loadSchedule();
    loadScheduleSidebarState();
    initScheduleDragging();
    loadNotesSidebarState();
    initNotesDragging();
    initNotesResizing();
    initCategories();
    // Ensure main category dropdown is populated (extra safeguard)
    setTimeout(() => {
        populateMainCategoryDropdown();
        console.debug('After initCategories, categories:', categories);
    }, 50);
    loadCustomFields();
    addTimeEntry('inbound');
    addTimeEntry('outbound');
    setupEventListeners();
    generateTemplate();
    
    // Restore last logged categories
    if (lastLoggedMainCategory && categories[lastLoggedMainCategory]) {
        document.getElementById('mainCategory').value = lastLoggedMainCategory;
        document.getElementById('mainCategory').dispatchEvent(new Event('change'));
        setTimeout(() => {
            if (lastLoggedSubCategory && categories[lastLoggedMainCategory].subcategories[lastLoggedSubCategory]) {
                const subInput = document.getElementById('subCategoryInput');
                if (subInput) {
                    subInput.value = categories[lastLoggedMainCategory].subcategories[lastLoggedSubCategory].name;
                    generateTemplate();
                }
            }
        }, 50);
    }
};
