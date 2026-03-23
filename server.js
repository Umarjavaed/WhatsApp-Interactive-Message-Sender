// server.js - Main application with persistent logins and web interface
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { startBot } = require('./bot-manager');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Setup multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Ensure stored_login directory exists
const STORED_LOGIN_DIR = path.join(__dirname, 'stored_login');
if (!fs.existsSync(STORED_LOGIN_DIR)) {
  fs.mkdirSync(STORED_LOGIN_DIR, { recursive: true });
}

// Ensure batches directory exists
const BATCHES_DIR = path.join(__dirname, 'stored_login', 'batches');
if (!fs.existsSync(BATCHES_DIR)) {
  fs.mkdirSync(BATCHES_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════
//  BATCH MANAGEMENT
// ═══════════════════════════════════════════════════════════

// Load batch by ID
function loadBatch(batchId) {
  const batchFile = path.join(BATCHES_DIR, `${batchId}.json`);
  if (fs.existsSync(batchFile)) {
    return JSON.parse(fs.readFileSync(batchFile, 'utf-8'));
  }
  return null;
}

// Save batch
function saveBatch(batchId, batchData) {
  const batchFile = path.join(BATCHES_DIR, `${batchId}.json`);
  fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2));
}

// Update batch item status
function updateBatchItemStatus(batchId, rowIndex, status) {
  const batch = loadBatch(batchId);
  if (batch && batch.items[rowIndex]) {
    batch.items[rowIndex].status = status;
    saveBatch(batchId, batch);
  }
}

// ═══════════════════════════════════════════════════════════
//  ACCOUNTS MANAGEMENT
// ═══════════════════════════════════════════════════════════

// Load all accounts
function loadAccounts() {
  const accountsFile = path.join(STORED_LOGIN_DIR, 'accounts.json');
  if (fs.existsSync(accountsFile)) {
    return JSON.parse(fs.readFileSync(accountsFile, 'utf-8'));
  }
  return [];
}

// Save accounts
function saveAccounts(accounts) {
  const accountsFile = path.join(STORED_LOGIN_DIR, 'accounts.json');
  fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2));
}

// Get account by ID
function getAccountById(accountId) {
  const accounts = loadAccounts();
  return accounts.find(acc => acc.id === accountId);
}

// ═══════════════════════════════════════════════════════════
//  API ENDPOINTS
// ═══════════════════════════════════════════════════════════

// Get all accounts
app.get('/api/accounts', (req, res) => {
  try {
    const accounts = loadAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new account
app.post('/api/accounts', (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    
    if (!name || !phoneNumber) {
      return res.status(400).json({ error: 'Name and phone number are required' });
    }

    const accounts = loadAccounts();
    const accountId = uuidv4();
    const accountFolder = path.join(STORED_LOGIN_DIR, phoneNumber);
    
    // Create account folder
    if (!fs.existsSync(accountFolder)) {
      fs.mkdirSync(accountFolder, { recursive: true });
      console.log(`\n✅ Created folder for ${phoneNumber}: ${accountFolder}`);
    }

    const newAccount = {
      id: accountId,
      name,
      phoneNumber,
      folder: accountFolder,
      status: 'initializing',
      createdAt: new Date()
    };

    accounts.push(newAccount);
    saveAccounts(accounts);

    console.log(`\n🎯 New account created: ${name} (${phoneNumber})`);
    
    // Start the bot asynchronously
    setImmediate(() => {
      console.log(`\n🚀 Starting bot for ${name}...`);
      startBot(newAccount);
    });

    res.json({ success: true, account: newAccount, message: 'Account created. Check terminal for QR code!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account details
app.get('/api/accounts/:id', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update account
app.put('/api/accounts/:id', (req, res) => {
  try {
    const { name } = req.body;
    const accounts = loadAccounts();
    const account = accounts.find(acc => acc.id === req.params.id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    account.name = name || account.name;
    saveAccounts(accounts);
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete account
app.delete('/api/accounts/:id', (req, res) => {
  try {
    const accounts = loadAccounts();
    const index = accounts.findIndex(acc => acc.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accounts[index];
    accounts.splice(index, 1);
    saveAccounts(accounts);

    // Delete account folder
    const accountFolder = account.folder;
    if (fs.existsSync(accountFolder)) {
      fs.rmSync(accountFolder, { recursive: true, force: true });
    }

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start account (initialize QR code)
app.post('/api/accounts/:id/start', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Start bot for this account
    startBot(account);
    res.json({ success: true, message: 'Account started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
app.post('/api/send-message', (req, res) => {
  try {
    const { accountId, phoneNumber, message } = req.body;
    
    if (!accountId || !phoneNumber || !message) {
      return res.status(400).json({ error: 'accountId, phoneNumber, and message are required' });
    }

    const account = getAccountById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get the bot instance for this account and send message
    const botManager = require('./bot-manager');
    botManager.sendMessage(accountId, phoneNumber, message);

    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send interactive button message
app.post('/api/send-button-message', (req, res) => {
  try {
    const { accountId, phoneNumber, messageBody, buttons } = req.body;
    
    if (!accountId || !phoneNumber || !messageBody || !buttons) {
      return res.status(400).json({ error: 'accountId, phoneNumber, messageBody, and buttons are required' });
    }

    if (!Array.isArray(buttons) || buttons.length === 0) {
      return res.status(400).json({ error: 'At least one button is required' });
    }

    if (buttons.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 buttons allowed' });
    }

    const account = getAccountById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get the bot manager and send button message
    const botManager = require('./bot-manager');
    botManager.sendButtonMessage(accountId, phoneNumber, messageBody, buttons);

    res.json({ success: true, message: 'Button message sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get QR code for account
app.get('/api/accounts/:id/qr', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const qrFile = path.join(account.folder, 'qr.json');
    if (fs.existsSync(qrFile)) {
      const qrData = JSON.parse(fs.readFileSync(qrFile, 'utf-8'));
      res.json(qrData);
    } else {
      res.status(404).json({ error: 'QR code not available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  CSV HELPERS
// ═══════════════════════════════════════════════════════════

// Parse CSV using proper parsing instead of line-by-line
function parseCSVData(csvText) {
  return new Promise((resolve, reject) => {
    const rows = [];
    
    const stream = Readable.from([csvText]);
    
    stream
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// ═══════════════════════════════════════════════════════════
//  CSV BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════

// Upload and process CSV file
app.post('/api/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    console.log('\n📨 CSV Upload Request Received');
    console.log('   File name:', req.file ? req.file.originalname : 'no file');
    console.log('   File size:', req.file ? req.file.size : 0, 'bytes');
    
    if (!req.file) {
      console.error('❌ No file provided in request');
      return res.status(400).json({ error: 'No CSV file provided' });
    }

    let csvData = req.file.buffer.toString('utf-8');
    
    // Remove BOM (Byte Order Mark) if present
    if (csvData.charCodeAt(0) === 0xFEFF) {
      csvData = csvData.slice(1);
    }
    
    console.log('✅ CSV data read:', csvData.substring(0, 100), '...');
    
    const accounts = loadAccounts();
    console.log('📋 Available accounts:', accounts.map(a => a.name).join(', '));
    
    const batchId = uuidv4();
    let items = [];

    try {
      // Parse CSV using proper csv-parser
      const rows = await parseCSVData(csvData);
      
      console.log('📄 CSV rows parsed:', rows.length);
      
      if (rows.length < 1) {
        console.error('❌ CSV file has no data rows');
        return res.status(400).json({ error: 'CSV file has no data rows' });
      }

      // Get headers from first row keys
      const headers = Object.keys(rows[0]);
      console.log('🔤 Headers found:', headers);

      // Validate required columns
      const requiredHeaders = ['Account', 'Recipient Phone Number', 'Message Body'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        console.error('❌ Missing required headers:', missingHeaders);
        return res.status(400).json({ 
          error: `Missing required columns: ${missingHeaders.join(', ')}. Found: ${headers.join(', ')}` 
        });
      }

      // Process each row
      rows.forEach((row, rowIndex) => {
        const accountName = String(row['Account'] || '').trim();
        const phoneNumber = String(row['Recipient Phone Number'] || '').trim();
        const messageBody = String(row['Message Body'] || '').trim();
        const btn1 = String(row['Interactive Button 1'] || '').trim();
        const btn2 = String(row['Interactive Button 2'] || '').trim();
        const btn3 = String(row['Interactive Button 3'] || '').trim();
        const timer = parseInt(row['Timer (in seconds)']) || 0;

        // Validate required fields
        if (!accountName || !phoneNumber || !messageBody) {
          console.warn(`Row ${rowIndex + 1}: Missing required fields (Account, Phone, or Message)`);
          return; // Skip this row
        }

        // Find matching account
        const account = accounts.find(a => a.name === accountName);
        if (!account) {
          throw new Error(`Account "${accountName}" not found in row ${rowIndex + 1}`);
        }

        // Build buttons array
        const buttons = [];
        if (btn1) buttons.push({ id: `btn_0_${batchId}`, displayText: btn1 });
        if (btn2) buttons.push({ id: `btn_1_${batchId}`, displayText: btn2 });
        if (btn3) buttons.push({ id: `btn_2_${batchId}`, displayText: btn3 });

        items.push({
          rowIndex: items.length + 1,
          accountId: account.id,
          accountName: account.name,
          phoneNumber,
          messageBody,
          buttons,
          timer,
          status: 'Pending',
          sentAt: null
        });
      });

    } catch (parseError) {
      console.error('❌ CSV Parsing Error:', parseError.message);
      return res.status(400).json({ error: parseError.message });
    }

    if (items.length === 0) {
      console.error('❌ No valid data rows found in CSV');
      return res.status(400).json({ error: 'No valid data rows found in CSV' });
    }

    // Save batch
    const batch = {
      id: batchId,
      createdAt: new Date(),
      totalItems: items.length,
      items: items
    };

    saveBatch(batchId, batch);

    console.log(`\n✅ CSV Batch created: ${batchId}`);
    console.log(`   Total items: ${items.length}`);
    console.log(`   Batch file saved`);

    // Start processing batch asynchronously
    setImmediate(() => {
      console.log(`🚀 Starting batch processing for ${batchId}...`);
      processBatch(batchId);
    });

    console.log(`\n📤 Sending success response to client`);
    res.json({ success: true, batchId, totalItems: items.length });
  } catch (error) {
    console.error('\n🔴 CSV Upload Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Get batch status
app.get('/api/batch-status/:batchId', (req, res) => {
  try {
    const batch = loadBatch(req.params.batchId);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  BATCH PROCESSING
// ═══════════════════════════════════════════════════════════

// Generate random delay between 8-20 seconds (increased from 5-15)
function getRandomDelay() {
  const minMs = 8000;  // 8 seconds (increased)
  const maxMs = 20000; // 20 seconds (increased)
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

async function processBatch(batchId) {
  try {
    const batch = loadBatch(batchId);
    if (!batch) {
      console.error(`Batch ${batchId} not found`);
      return;
    }

    const botManager = require('./bot-manager');
    const MAX_RETRIES = 2;

    for (let i = 0; i < batch.items.length; i++) {
      const item = batch.items[i];
      const timer = item.timer || 0;
      let retryCount = 0;
      let messageSent = false;

      // Retry logic for failed messages
      while (retryCount <= MAX_RETRIES && !messageSent) {
        try {
          // Mark as scheduled if timer > 0
          if (timer > 0 && retryCount === 0) {
            updateBatchItemStatus(batchId, i, `Scheduled (${timer}s)`);
            console.log(`\n⏱️  Item ${item.rowIndex}: Waiting ${timer} seconds before sending...`);
            
            // Wait for timer
            await new Promise(resolve => setTimeout(resolve, timer * 1000));
          } else if (retryCount > 0) {
            const retryDelay = 5000 + (retryCount * 3000); // 5s, 8s, 11s for retries
            console.log(`\n🔄 Item ${item.rowIndex}: Retry ${retryCount}/${MAX_RETRIES}. Waiting ${(retryDelay/1000).toFixed(1)}s...`);
            updateBatchItemStatus(batchId, i, `Retrying (attempt ${retryCount}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            updateBatchItemStatus(batchId, i, 'Scheduled');
          }

          // Send message
          if (item.buttons && item.buttons.length > 0) {
            // Send button message
            await botManager.sendButtonMessage(
              item.accountId,
              item.phoneNumber,
              item.messageBody,
              item.buttons
            );
          } else {
            // Send regular message
            await botManager.sendMessage(
              item.accountId,
              item.phoneNumber,
              item.messageBody
            );
          }

          // Mark as sent
          updateBatchItemStatus(batchId, i, 'Sent');
          console.log(`\n✅ Item ${item.rowIndex}: Message sent successfully`);
          messageSent = true;

        } catch (error) {
          const isTimeoutError = error.message && 
            (error.message.includes('Timed Out') || 
             error.message.includes('timed out') ||
             error.message.includes('timeout'));

          if (isTimeoutError && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`\n⚠️  Item ${item.rowIndex}: Timeout error (${error.message}). Will retry...`);
            continue; // Retry
          } else {
            // Final error after all retries
            const errorMsg = isTimeoutError 
              ? `Timeout (tried ${retryCount + 1} times) - Network/Rate limit issue`
              : error.message;
            updateBatchItemStatus(batchId, i, `Error: ${errorMsg}`);
            console.error(`\n❌ Item ${item.rowIndex}: Failed - ${errorMsg}`);
            messageSent = true; // Exit retry loop
          }
        }
      }

      // Random delay between messages (8-20 seconds)
      if (i < batch.items.length - 1) {
        const delay = getRandomDelay();
        const delaySeconds = (delay / 1000).toFixed(1);
        console.log(`⏳ Waiting ${delaySeconds} seconds before next message...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`\n✨ Batch ${batchId} processing completed!`);
  } catch (error) {
    console.error(`Error processing batch ${batchId}:`, error.message);
  }
}

// ═══════════════════════════════════════════════════════════
//  ERROR HANDLERS
// ═══════════════════════════════════════════════════════════

// 404 handler
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: `Endpoint not found: ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔴 Server Error:', err);
  
  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  
  res.status(500).json({ 
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ═══════════════════════════════════════════════════════════
//  PROCESS ERROR HANDLERS (Prevent crashes)
// ═══════════════════════════════════════════════════════════

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n🔴 Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Don't exit process - log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n🔴 Uncaught Exception:', error);
  // In production, you might want to restart the process here
  // For now, just log it and continue
});

// ═══════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 Web interface running on http://localhost:${PORT}`);
});
