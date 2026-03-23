// script.js - Frontend logic for WhatsApp Multi-Account Manager

// ═══════════════════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active from all buttons
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        // Show selected tab and activate button
        document.getElementById(tabName).classList.add('active');
        btn.classList.add('active');
        
        // Load accounts if switching to send tab
        if (tabName === 'send') {
            loadAccountsForSending();
        }
        
        // Load accounts if switching to button messages tab
        if (tabName === 'buttons') {
            loadAccountsForButtonMessages();
            updatePreview();
        }
    });
});

// ═══════════════════════════════════════════════════════════
//  ALERT SYSTEM
// ═══════════════════════════════════════════════════════════
function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type} show`;
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, 4000);
}

// ═══════════════════════════════════════════════════════════
//  ADD ACCOUNT
// ═══════════════════════════════════════════════════════════
document.getElementById('addAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('accountName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    
    try {
        showAlert('⏳ Creating account...', 'info');
        
        const response = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phoneNumber })
        });
        
        if (!response.ok) throw new Error('Failed to add account');
        
        const data = await response.json();
        
        showAlert('✅ Account created! Starting bot...', 'success');
        document.getElementById('addAccountForm').reset();
        
        // Wait for bot to initialize and generate QR
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Reload accounts list
        await loadAccounts();
        
        // Show QR code modal
        showAlert('📲 Scan the QR code with WhatsApp!', 'info');
        showQRCode(data.account.id);
        
    } catch (error) {
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
});

// ═══════════════════════════════════════════════════════════
//  LOAD ACCOUNTS
// ═══════════════════════════════════════════════════════════
async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts');
        const accounts = await response.json();
        
        const accountsList = document.getElementById('accountsList');
        
        if (accounts.length === 0) {
            accountsList.innerHTML = '<p class="loading">No accounts yet. Add your first account above! 👆</p>';
            return;
        }
        
        accountsList.innerHTML = accounts.map(account => `
            <div class="account-card">
                <div class="account-info">
                    <h3>📱 ${escapeHtml(account.name)}</h3>
                    <p>Phone: <strong>+${account.phoneNumber}</strong></p>
                    <p>Folder: <code>${account.folder}</code></p>
                    <span class="account-status ${account.status === 'connected' ? 'status-connected' : 'status-disconnected'}">
                        ${account.status === 'connected' ? '✅ Connected' : '⚪ Disconnected'}
                    </span>
                </div>
                <div class="account-actions">
                    <button class="btn btn-secondary btn-small" onclick="showQRCode('${account.id}')">
                        📲 QR Code
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteAccount('${account.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading accounts:', error);
        showAlert('Error loading accounts', 'error');
    }
}

// ═══════════════════════════════════════════════════════════
//  SHOW QR CODE
// ═══════════════════════════════════════════════════════════
let qrRefreshInterval = null;

async function showQRCode(accountId) {
    const modal = document.getElementById('qrModal');
    
    try {
        // Get account details
        const accountResponse = await fetch(`/api/accounts/${accountId}`);
        const account = await accountResponse.json();
        
        document.getElementById('qrAccountName').textContent = `Account: ${account.name} (${account.phoneNumber})`;
        
        // Reset loading state
        document.getElementById('qrLoading').style.display = 'block';
        document.getElementById('qrImage').style.display = 'none';
        
        modal.style.display = 'block';
        
        // Auto-refresh QR code every 5 seconds
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        
        qrRefreshInterval = setInterval(() => {
            fetchAndDisplayQR(accountId);
        }, 5000);
        
        // First fetch
        fetchAndDisplayQR(accountId);
        
    } catch (error) {
        console.error('Error loading QR code:', error);
        document.getElementById('qrLoading').innerHTML = `<p>❌ Error: ${error.message}</p>`;
    }
}

async function fetchAndDisplayQR(accountId) {
    try {
        const qrResponse = await fetch(`/api/accounts/${accountId}/qr`);
        
        if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            if (qrData.qr) {
                document.getElementById('qrImage').src = qrData.qr;
                document.getElementById('qrImage').style.display = 'block';
                document.getElementById('qrLoading').style.display = 'none';
            } else {
                throw new Error('No QR data');
            }
        } else {
            document.getElementById('qrLoading').innerHTML = `
                <p>⏳ Generating QR code...</p>
                <p style="font-size: 0.9em; color: #666;">This may take a few moments. Check the terminal for QR code display.</p>
                <p style="font-size: 0.85em; color: #999; margin-top: 10px;">Auto-refreshing every 5 seconds...</p>
            `;
        }
    } catch (error) {
        console.error('Error fetching QR:', error);
        document.getElementById('qrLoading').innerHTML = `<p>⏳ Waiting for QR code...</p><p style="font-size: 0.9em; color: #666;">Check terminal for status</p>`;
    }
}

// ═══════════════════════════════════════════════════════════
//  DELETE ACCOUNT
// ═══════════════════════════════════════════════════════════
async function deleteAccount(accountId) {
    if (!confirm('⚠️ Are you sure? This will delete all stored credentials for this account.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
        
        if (!response.ok) throw new Error('Failed to delete account');
        
        showAlert('✅ Account deleted', 'success');
        loadAccounts();
        
    } catch (error) {
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════
//  LOAD ACCOUNTS FOR SENDING
// ═══════════════════════════════════════════════════════════
async function loadAccountsForSending() {
    try {
        const response = await fetch('/api/accounts');
        const accounts = await response.json();
        
        const selectAccount = document.getElementById('selectAccount');
        
        if (accounts.length === 0) {
            selectAccount.innerHTML = '<option value="">No accounts available. Create one first!</option>';
            return;
        }
        
        selectAccount.innerHTML = '<option value="">Select an account...</option>' + 
            accounts.map(account => `
                <option value="${account.id}|${account.phoneNumber}">
                    ${escapeHtml(account.name)} (${account.phoneNumber}) - ${account.status}
                </option>
            `).join('');
        
    } catch (error) {
        showAlert('Error loading accounts', 'error');
    }
}

// ═══════════════════════════════════════════════════════════
//  SEND MESSAGE
// ═══════════════════════════════════════════════════════════
document.getElementById('sendMessageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const accountSelect = document.getElementById('selectAccount').value;
    const recipientPhone = document.getElementById('recipientPhone').value;
    const messageText = document.getElementById('messageText').value;
    
    if (!accountSelect) {
        showAlert('❌ Please select an account', 'error');
        return;
    }
    
    const [accountId, defaultPhone] = accountSelect.split('|');
    
    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accountId,
                phoneNumber: recipientPhone || defaultPhone,
                message: messageText
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send message');
        }
        
        showAlert('✅ Message sent successfully!', 'success');
        document.getElementById('sendMessageForm').reset();
        
    } catch (error) {
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
});

// ═══════════════════════════════════════════════════════════
//  SEND BUTTON MESSAGE
// ═══════════════════════════════════════════════════════════

// Initialize button message functionality
function initializeButtonMessages() {
    const addButtonBtn = document.getElementById('addButtonBtn');
    const sendButtonForm = document.getElementById('sendButtonMessageForm');
    
    addButtonBtn.addEventListener('click', addButtonInput);
    sendButtonForm.addEventListener('submit', sendButtonMessage);
    
    // Load accounts for button message tab
    loadAccountsForButtonMessages();
    
    // Add initial button
    addButtonInput();
}

async function loadAccountsForButtonMessages() {
    try {
        const response = await fetch('/api/accounts');
        const accounts = await response.json();
        
        const selectAccount = document.getElementById('selectAccountButtons');
        
        if (accounts.length === 0) {
            selectAccount.innerHTML = '<option value="">No accounts available. Create one first!</option>';
            return;
        }
        
        selectAccount.innerHTML = '<option value="">Select an account...</option>' + 
            accounts.map(account => `
                <option value="${account.id}|${account.phoneNumber}">
                    ${escapeHtml(account.name)} (${account.phoneNumber}) - ${account.status}
                </option>
            `).join('');
        
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

function addButtonInput() {
    const container = document.getElementById('buttonsContainer');
    const buttonCount = container.children.length;
    
    if (buttonCount >= 3) {
        showAlert('⚠️ Maximum 3 buttons allowed', 'info');
        return;
    }
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-input-group';
    const index = buttonCount + 1;
    
    buttonGroup.innerHTML = `
        <input type="text" class="button-text" placeholder="Button ${index} text (e.g., Yes, No, Call)" maxlength="20" required>
        <span class="button-counter">Button ${index}</span>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updatePreview();">✕ Remove</button>
    `;
    
    container.appendChild(buttonGroup);
    
    // Add event listener for real-time preview
    buttonGroup.querySelector('.button-text').addEventListener('input', updatePreview);
    document.getElementById('buttonMessageBody').addEventListener('input', updatePreview);
    
    updatePreview();
}

function updatePreview() {
    const messageBody = document.getElementById('buttonMessageBody').value;
    const buttons = Array.from(document.querySelectorAll('.button-text'))
        .filter(input => input.value)
        .map(input => input.value);
    
    const previewDiv = document.getElementById('buttonPreview');
    
    if (!messageBody && buttons.length === 0) {
        previewDiv.innerHTML = '<p style="color: #666;">Preview will appear here...</p>';
        return;
    }
    
    let previewHTML = '';
    
    if (messageBody) {
        previewHTML += `<div class="preview-message">${escapeHtml(messageBody)}</div>`;
    }
    
    if (buttons.length > 0) {
        previewHTML += '<div class="preview-buttons">';
        buttons.forEach(btn => {
            previewHTML += `<button class="preview-button" onclick="return false;">🔘 ${escapeHtml(btn)}</button>`;
        });
        previewHTML += '</div>';
    }
    
    previewHTML += '';
    
    previewDiv.innerHTML = previewHTML;
}

async function sendButtonMessage(e) {
    e.preventDefault();
    
    const accountSelect = document.getElementById('selectAccountButtons').value;
    const recipientPhone = document.getElementById('recipientPhoneButtons').value;
    const messageBody = document.getElementById('buttonMessageBody').value;
    
    if (!accountSelect) {
        showAlert('❌ Please select an account', 'error');
        return;
    }
    
    const buttons = Array.from(document.querySelectorAll('.button-text'))
        .filter(input => input.value)
        .map((input, index) => ({
            id: `btn_${index}`,
            displayText: input.value
        }));
    
    if (buttons.length === 0) {
        showAlert('❌ Please add at least one button', 'error');
        return;
    }
    
    if (buttons.length > 3) {
        showAlert('❌ Maximum 3 buttons allowed', 'error');
        return;
    }
    
    const [accountId, defaultPhone] = accountSelect.split('|');
    
    try {
        showAlert('⏳ Sending button message...', 'info');
        
        const response = await fetch('/api/send-button-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accountId,
                phoneNumber: recipientPhone || defaultPhone,
                messageBody,
                buttons
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send button message');
        }
        
        showAlert('✅ Button message sent successfully! 🎉', 'success');
        document.getElementById('sendButtonMessageForm').reset();
        
        // Clear buttons
        document.getElementById('buttonsContainer').innerHTML = '';
        addButtonInput();
        updatePreview();
        
    } catch (error) {
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════
//  MODAL CLOSE
// ═══════════════════════════════════════════════════════════
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('qrModal').style.display = 'none';
    if (qrRefreshInterval) clearInterval(qrRefreshInterval);
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('qrModal');
    if (e.target === modal) {
        modal.style.display = 'none';
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
    }
});

// ═══════════════════════════════════════════════════════════
//  CSV BULK SEND
// ═══════════════════════════════════════════════════════════

let currentBatchId = null;
let batchStatusInterval = null;

document.getElementById('csvUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (!file) {
        showAlert('❌ Please select a CSV file', 'error');
        return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showAlert('❌ Please upload a CSV file (.csv)', 'error');
        return;
    }

    try {
        showAlert('⏳ Processing CSV file...', 'info');

        const formData = new FormData();
        formData.append('csvFile', file);

        console.log('📤 Uploading CSV file:', file.name, 'Size:', file.size, 'bytes');

        const response = await fetch('/api/upload-csv', {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.get('content-type'));

        if (!response.ok) {
            let error;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                error = await response.json();
                throw new Error(error.error || `Server error: ${response.status}`);
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`);
            }
        }

        const data = await response.json();
        currentBatchId = data.batchId;

        showAlert(`✅ CSV uploaded! Processing ${data.totalItems} items...`, 'success');
        document.getElementById('csvUploadForm').reset();

        // Load and display batch status
        await loadBatchStatus(currentBatchId);

        // Start monitoring batch status every 2 seconds
        if (batchStatusInterval) clearInterval(batchStatusInterval);
        batchStatusInterval = setInterval(() => {
            loadBatchStatus(currentBatchId);
        }, 2000);

    } catch (error) {
        console.error('CSV Upload Error:', error);
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
});

async function loadBatchStatus(batchId) {
    try {
        const response = await fetch(`/api/batch-status/${batchId}`);

        if (!response.ok) {
            throw new Error('Failed to load batch status');
        }

        const batch = await response.json();
        displayBatchStatus(batch);

        // Check if all items are sent or have errors
        const allDone = batch.items.every(item => 
            item.status === 'Sent' || item.status.startsWith('Error')
        );

        if (allDone && batchStatusInterval) {
            clearInterval(batchStatusInterval);
            showAlert('✨ Batch processing completed!', 'success');
        }

    } catch (error) {
        console.error('Error loading batch status:', error);
    }
}

function displayBatchStatus(batch) {
    const table = document.getElementById('batchStatusTable');
    const tbody = document.getElementById('batchStatusBody');
    const noBatchMessage = document.getElementById('noBatchMessage');

    // Show table, hide "no batch" message
    table.style.display = 'block';
    noBatchMessage.style.display = 'none';

    // Clear existing rows
    tbody.innerHTML = '';

    // Add rows for each item
    batch.items.forEach((item, index) => {
        const messagePreview = item.messageBody.substring(0, 50) + 
                              (item.messageBody.length > 50 ? '...' : '');
        const timerDisplay = item.timer > 0 ? `${item.timer}s` : 'Immediate';

        // Color code status
        let statusColor = '#666';
        if (item.status === 'Sent') statusColor = '#00b050';
        else if (item.status.startsWith('Scheduled')) statusColor = '#ffc000';
        else if (item.status === 'Pending') statusColor = '#0078d4';
        else if (item.status.startsWith('Error')) statusColor = '#e81123';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd;">${item.rowIndex}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(item.accountName)}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">+${item.phoneNumber}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(messagePreview)}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${timerDisplay}</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: ${statusColor}; font-weight: bold;">
                ${item.status}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ═══════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Load accounts on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    initializeButtonMessages();
});
