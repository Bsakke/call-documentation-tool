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
        categories = JSON.parse(savedCategories);
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
        updateSubcategoryDropdown();
    }
}

function updateSubcategoryDropdown() {
    const mainCategoryKey = document.getElementById('mainCategory').value;
    const subSelect = document.getElementById('subCategory');
    const currentValue = subSelect.value;
    
    subSelect.innerHTML = '<option value="">-- Select Subcategory --</option>';
    
    if (mainCategoryKey && categories[mainCategoryKey]) {
        const subcategories = categories[mainCategoryKey].subcategories;
        Object.keys(subcategories).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = subcategories[key].name;
            subSelect.appendChild(option);
        });
        
        if (currentValue && subcategories[currentValue]) {
            subSelect.value = currentValue;
        }
    }
    
    updateCustomerFields();
    generateTemplate();
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
    
    let hasCategories = false;
    let totalCalls = 0;
    const mainCategoryCalls = {};
    
    // Calculate totals
    Object.keys(categories).forEach(mainKey => {
        const subcategories = categories[mainKey].subcategories;
        mainCategoryCalls[mainKey] = 0;
        
        Object.keys(subcategories).forEach(subKey => {
            const categoryKey = `${mainKey}_${subKey}`;
            const stats = getStatsForCategory(categoryKey, isToday);
            totalCalls += stats.calls;
            mainCategoryCalls[mainKey] += stats.calls;
        });
    });
    
    // Render categories
    Object.keys(categories).forEach(mainKey => {
        const mainCategory = categories[mainKey];
        const subcategories = mainCategory.subcategories;
        
        if (Object.keys(subcategories).length > 0) {
            hasCategories = true;
            
            let mainCategoryCallCount = 0;
            let mainCategoryInbound = 0;
            let mainCategoryOutbound = 0;
            
            Object.keys(subcategories).forEach(subKey => {
                const categoryKey = `${mainKey}_${subKey}`;
                const stats = getStatsForCategory(categoryKey, isToday);
                mainCategoryCallCount += stats.calls;
                mainCategoryInbound += stats.inbound;
                mainCategoryOutbound += stats.outbound;
            });
            
            const mainCategoryTotal = mainCategoryInbound + mainCategoryOutbound;
            const mainCategoryAvg = mainCategoryCallCount > 0 ? Math.round(mainCategoryTotal / mainCategoryCallCount) : 0;
            const mainCategoryPercentage = totalCalls > 0 ? ((mainCategoryCalls[mainKey] / totalCalls) * 100).toFixed(1) : 0;
            
            if (mainCategoryCallCount > 0) {
                const headerRow = document.createElement('tr');
                headerRow.className = 'stats-header-row';
                
                if (isToday) {
                    headerRow.innerHTML = `
                        <td class="stats-header-cell">${mainCategory.name}</td>
                        <td class="stats-header-cell">${mainCategoryCallCount}</td>
                        <td class="stats-header-cell">${mainCategoryInbound} min</td>
                        <td class="stats-header-cell">${mainCategoryOutbound} min</td>
                        <td class="stats-header-cell">${mainCategoryTotal} min</td>
                        <td class="stats-header-cell stats-percentage">${mainCategoryPercentage}%</td>
                    `;
                } else {
                    headerRow.innerHTML = `
                        <td class="stats-header-cell">${mainCategory.name}</td>
                        <td class="stats-header-cell">${mainCategoryCallCount}</td>
                        <td class="stats-header-cell">${formatTime(mainCategoryInbound, true)}</td>
                        <td class="stats-header-cell">${formatTime(mainCategoryOutbound, true)}</td>
                        <td class="stats-header-cell">${formatTime(mainCategoryTotal, true)}</td>
                        <td class="stats-header-cell">${formatTime(mainCategoryAvg, false)}</td>
                        <td class="stats-header-cell stats-percentage">${mainCategoryPercentage}%</td>
                    `;
                }
                tableBody.appendChild(headerRow);
                
                // Add subcategory rows
                Object.keys(subcategories).forEach(subKey => {
                    const categoryKey = `${mainKey}_${subKey}`;
                    const stats = getStatsForCategory(categoryKey, isToday);
                    
                    if (stats.calls > 0) {
                        const totalTime = stats.inbound + stats.outbound;
                        const avgTime = stats.calls > 0 ? Math.round(totalTime / stats.calls) : 0;
                        const row = document.createElement('tr');
                        
                        if (isToday) {
                            row.innerHTML = `
                                <td style="padding-left: 30px;">${subcategories[subKey].name}</td>
                                <td><span class="stats-number">${stats.calls}</span></td>
                                <td><span class="stats-number">${stats.inbound} min</span></td>
                                <td><span class="stats-number">${stats.outbound} min</span></td>
                                <td><span class="stats-number">${totalTime} min</span></td>
                                <td></td>
                            `;
                        } else {
                            row.innerHTML = `
                                <td style="padding-left: 30px;">${subcategories[subKey].name}</td>
                                <td><span class="stats-number">${stats.calls}</span></td>
                                <td><span class="stats-number">${formatTime(stats.inbound, true)}</span></td>
                                <td><span class="stats-number">${formatTime(stats.outbound, true)}</span></td>
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
    
    if (!hasCategories) {
        const colspan = isToday ? '6' : '7';
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; color: var(--text-secondary);">No subcategories yet. Add subcategories to start tracking.</td></tr>`;
    }
}

// Add CSS for stats header cells
const style = document.createElement('style');
style.textContent = `
    .stats-header-row {
        border-top: 3px solid var(--border-color);
    }
    .stats-header-cell {
        background: var(--section-bg);
        font-weight: 700;
        padding: 14px 10px;
        border-top: 3px solid var(--border-color);
        color: var(--text-primary);
    }
    .stats-header-cell:first-child {
        color: var(--button-bg);
        font-size: 14px;
    }
    .stats-header-cell.stats-percentage {
        text-align: center;
        color: var(--button-bg);
        font-size: 14px;
    }
`;
document.head.appendChild(style);

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
    
    let totalCalls = 0;
    const mainCategoryCalls = {};
    
    Object.keys(categories).forEach(mainKey => {
        const subcategories = categories[mainKey].subcategories;
        mainCategoryCalls[mainKey] = 0;
        
        Object.keys(subcategories).forEach(subKey => {
            const categoryKey = `${mainKey}_${subKey}`;
            const stats = getStatsForCategory(categoryKey, isToday);
            totalCalls += stats.calls;
            mainCategoryCalls[mainKey] += stats.calls;
        });
    });
    
    const normalizeText = (text) => text.replace(/ä/g, 'a').replace(/Ä/g, 'A').replace(/ö/g, 'o').replace(/Ö/g, 'O');
    
    let csv = `"Call Statistics Report - ${isToday ? 'Today' : 'All-Time'}"\n`;
    csv += `"Time Window: ${timeWindow}"\n`;
    csv += `"Total Calls: ${totalCalls}"\n\n`;
    
    csv += isToday 
        ? 'Main Category,Subcategory,Calls,Percentage,Inbound (min),Outbound (min),Total (min)\n'
        : 'Main Category,Subcategory,Calls,Percentage,Inbound,Outbound,Total,Avg per Call\n';
    
    Object.keys(categories).forEach(mainKey => {
        const mainCategory = categories[mainKey];
        const subcategories = mainCategory.subcategories;
        const mainCategoryPercentage = totalCalls > 0 ? ((mainCategoryCalls[mainKey] / totalCalls) * 100).toFixed(1) : 0;
        const normalizedMainCat = normalizeText(mainCategory.name);
        
        csv += `"${normalizedMainCat}","",,"${mainCategoryPercentage}%",,,\n`;
        
        Object.keys(subcategories).forEach(subKey => {
            const categoryKey = `${mainKey}_${subKey}`;
            const stats = getStatsForCategory(categoryKey, isToday);
            const totalTime = stats.inbound + stats.outbound;
            const avgTime = stats.calls > 0 ? Math.round(totalTime / stats.calls) : 0;
            const normalizedSubCat = normalizeText(subcategories[subKey].name);
            
            if (isToday) {
                csv += `"","${normalizedSubCat}",${stats.calls},,${stats.inbound},${stats.outbound},${totalTime}\n`;
            } else {
                csv += `"","${normalizedSubCat}",${stats.calls},,"${formatTime(stats.inbound, true)}","${formatTime(stats.outbound, true)}","${formatTime(totalTime, true)}","${formatTime(avgTime, false)}"\n`;
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
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const btn = document.querySelector('.dark-mode-toggle');
        if (btn) btn.textContent = '☀️ Light';
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
        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No custom fields yet. Add one below!</div>';
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
    
    document.getElementById('inboundTotal').textContent = `Inbound: ${totalInboundWithCurrent} min`;
    document.getElementById('outboundTotal').textContent = `Outbound: ${totalOutboundWithCurrent} min`;
    document.getElementById('grandTotal').textContent = `Total Today: ${totalDailyTime} minutes`;
    
    return { inbound: currentInbound, outbound: currentOutbound, total: currentInbound + currentOutbound };
}

// ===== CALL LOGGING =====

function logCall() {
    const mainCategoryKey = document.getElementById('mainCategory').value;
    const subCategoryKey = document.getElementById('subCategory').value;
    
    if (!mainCategoryKey || !subCategoryKey) {
        alert('Error: Please select both main category and subcategory!');
        return;
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
                           'ytunnus', 'contact2Name', 'contact2Phone', 'contact2Email',
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
        document.getElementById('subCategory').value = lastLoggedSubCategory;
        document.getElementById('subCategory').dispatchEvent(new Event('change'));
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
    const subCategoryKey = document.getElementById('subCategory').value;
    
    const fields = ['firstName', 'lastName', 'phoneNumber', 'email', 'bpn',
                   'ytunnus', 'contact2Name', 'contact2Phone', 'contact2Email',
                   'ticketNumber1', 'ticketNumber2', 'id1', 'id2'];
    const values = {};
    fields.forEach(id => values[id] = document.getElementById(id).value);
    
    const timeData = updateTotalTime();
    const outputDiv = document.getElementById('output');
    
    if (!mainCategoryKey && !subCategoryKey && !values.firstName && !values.lastName && 
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
        ['ytunnus', 'contact2Name', 'contact2Phone', 'contact2Email', 
         'ticketNumber1', 'ticketNumber2', 'id1', 'id2'].forEach(key => {
            if (values[key]) summary += `${values[key]}\n`;
        });
    }
    
    if (mainCategoryKey && subCategoryKey) {
        const mainCatText = document.getElementById('mainCategory').options[document.getElementById('mainCategory').selectedIndex].text;
        const subCatText = document.getElementById('subCategory').options[document.getElementById('subCategory').selectedIndex].text;
        summary += `${mainCatText} - ${subCatText}\n`;
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
        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Please select a main category above to view and manage its subcategories.</div>';
        return;
    }
    
    const mainCategory = categories[selectedMainKey];
    if (!mainCategory) {
        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Selected category not found.</div>';
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
        const emptyMsg = document.createElement('div');
        emptyMsg.style.padding = '20px';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = 'var(--text-secondary)';
        emptyMsg.style.marginTop = '10px';
        emptyMsg.textContent = 'No subcategories yet. Add one below!';
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
    
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    
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
    
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    
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
                     'ytunnus', 'contact2Name', 'contact2Phone', 'contact2Email',
                     'ticketNumber1', 'ticketNumber2', 'id1', 'id2'];
    
    document.getElementById('mainCategory').addEventListener('change', updateSubcategoryDropdown);
    document.getElementById('subCategory').addEventListener('change', generateTemplate);
    
    fieldIds.forEach(id => {
        document.getElementById(id).addEventListener('input', generateTemplate);
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        if (event.target.id === 'categoryModal') closeCategoryManager();
        if (event.target.id === 'customerFieldsModal') closeCustomerFieldsManager();
    }
};

// ===== INITIALIZATION =====

window.onload = function() {
    loadDarkModePreference();
    loadCustomerSectionState();
    initCategories();
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
                document.getElementById('subCategory').value = lastLoggedSubCategory;
                document.getElementById('subCategory').dispatchEvent(new Event('change'));
            }
        }, 50);
    }
};
