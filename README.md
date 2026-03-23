# 📱 WhatsApp Multi-Account Manager

A powerful Node.js application that allows you to manage multiple WhatsApp Business accounts, send messages, interactive button messages, and batch process CSV files for bulk messaging.

## 🎯 Features

- **Multi-Account Management**: Manage multiple WhatsApp Business accounts simultaneously
- **Web Interface**: User-friendly dashboard to manage accounts and send messages
- **Send Messages**: Send text messages to WhatsApp users from any connected account
- **Interactive Buttons**: Send messages with interactive button replies (1-3 buttons)
- **CSV Bulk Send**: Upload CSV files to send messages in bulk with automatic scheduling and retry logic
- **QR Code Authentication**: Secure login via WhatsApp QR code scanning
- **Persistent Storage**: All credentials stored locally in encrypted format
- **Rate Limiting Protection**: Built-in delays between messages to prevent WhatsApp rate limiting
- **Error Handling & Retry**: Automatic retry mechanism for failed message sends
- **Connection Status Monitoring**: Real-time connection status for all accounts

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Running the Application](#running-the-application)
  - [Adding WhatsApp Accounts](#adding-whatsapp-accounts)
  - [Sending Messages](#sending-messages)
  - [Bulk CSV Operations](#bulk-csv-operations)
- [CSV Format](#csv-format)
- [Project Structure](#project-structure)
- [Security](#security)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Dependencies](#dependencies)
- [License](#license)

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or later) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **WhatsApp Account** - A valid WhatsApp account to use as Business account
- **Modern Browser** - Chrome, Firefox, Safari, or Edge for the web interface
- **Internet Connection** - Required for WhatsApp connection

## 🚀 Installation

1. **Clone or Download the Repository**
   ```bash
   git clone https://github.com/Umarjavaed/WhatsApp-Interactive-Message-Sender.git
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Verify Installation**
   ```bash
   npm list
   ```

## ⚙️ Configuration

### Environment Setup

The application uses default configurations. For advanced setup, you can create a `.env` file:

```env
PORT=3000
NODE_ENV=development
```

### Folder Structure

After first run, the application will create:

```
wa-buttons/
├── stored_login/          # Credentials storage (AUTO-CREATED)
│   ├── accounts.json      # Account metadata
│   ├── [phone_number]/    # Individual account folder
│   │   └── creds.json     # Encrypted credentials
│   └── batches/           # CSV batch processing
├── public/                # Web interface files
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
└── server.js             # Main application
```

**Important**: The `stored_login/` folder contains sensitive credentials. Never commit this to version control. It's already in `.gitignore`.

## 📖 Usage

### Running the Application

#### Quick Start (Recommended)
```bash
npm start
```

#### Development Mode
```bash
npm run dev
```

The application will start on `http://localhost:3000`

**Terminal Output Example:**
```
🚀 Starting WhatsApp Multi-Account Bot...
📂 Loading saved accounts...
✅ Ready! Open http://localhost:3000 in your browser
🚀 Web interface running on http://localhost:3000
```

### Adding WhatsApp Accounts

1. Open browser and go to `http://localhost:3000`
2. Click on the **Accounts** tab
3. Enter account details:
   - **Account Name**: A memorable name (e.g., "Main Business", "Support Team")
   - **Phone Number**: WhatsApp phone number with country code (e.g., 923051234567)
4. Click **Add Account**
5. A QR code will be generated in the terminal and web interface
6. Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
7. Scan the QR code with your phone
8. Wait for the "✅ CONNECTED TO WHATSAPP ✅" message in the terminal

### Sending Messages

#### Single Message
1. Go to **Send Message** tab
2. Select the account to send from
3. Enter recipient's phone number (with country code)
4. Type your message
5. Click **Send Message**
6. Check terminal for delivery confirmation

#### Interactive Button Messages
1. Go to **Send Button Messages** tab
2. Select account and recipient phone number
3. Enter message body
4. Add 1-3 buttons (e.g., "Yes", "No", "Maybe")
5. Preview the message in real-time
6. Click **Send**

**Button Message Example:**
```
Message: Would you like to connect?
Buttons:
  - Connect Now
  - Not Interested
  - Ask Later
```

### Bulk CSV Operations

#### CSV File Format

Create a CSV file with the following structure:

| Account | Recipient Phone Number | Message Body | Interactive Button 1 | Interactive Button 2 | Interactive Button 3 | Timer (in seconds) |
|---------|------------------------|--------------|----------------------|----------------------|----------------------|--------------------|
| Main Account | 923051234567 | Hello! | Yes | No | | 0 |
| Business Account | 923051234568 | Check this out | View | Share | Later | 5 |

#### Required Columns:
- `Account` - Must match an existing account name
- `Recipient Phone Number` - Phone number with country code
- `Message Body` - The message text to send

#### Optional Columns:
- `Interactive Button 1` - First button (max 20 characters)
- `Interactive Button 2` - Second button
- `Interactive Button 3` - Third button
- `Timer (in seconds)` - Delay before sending (default: 0)

#### How to Send Bulk Messages:

1. Go to **CSV Bulk Send** tab
2. Click **Choose File** and select your CSV file
3. Click **Upload & Send**
4. Monitor progress in real-time:
   - **Pending**: Waiting to be sent
   - **Scheduled**: Waiting for timer
   - **Sent**: Successfully delivered
   - **Error**: Failed with reason
5. Check terminal for detailed logs

#### Example CSV File (sample_messages.csv)
```csv
Account,Recipient Phone Number,Message Body,Interactive Button 1,Interactive Button 2,Interactive Button 3,Timer (in seconds)
Main Account,92XXXXXXXXXX,Hello?,Yes,No,,10
Main Account,92XXXXXXXXXX,Hi friend,View Deal,Share,,5
Business Account,92XXXXXXXXXX,Testing,Hey friend,Testing,,0
```

**Batch Processing Features:**
- Random 8-20 second delays between messages
- Automatic retry for failed messages (up to 2 retries)
- Timer support for scheduled sending
- Real-time status updates
- Error tracking and logging

## 📊 CSV Format Specification

### Column Details

| Column Name | Required | Format | Example | Notes |
|------------|----------|--------|---------|-------|
| Account | Yes | Text | Main Account | Must match existing account name |
| Recipient Phone Number | Yes | Numbers | 923051234567 | Include country code, no + symbol |
| Message Body | Yes | Text | Hello there! | Can include emojis |
| Interactive Button 1 | No | Text (max 20) | Yes | Optional, for interactive messages |
| Interactive Button 2 | No | Text (max 20) | No | Optional, up to 3 buttons |
| Interactive Button 3 | No | Text (max 20) | Maybe | Optional |
| Timer (in seconds) | No | Number | 5 | Optional, default is 0 |

### CSV Best Practices

✅ **DO:**
- Use UTF-8 encoding for special characters
- Include country code in phone numbers
- Test with small batch first (5-10 messages)
- Use meaningful account names
- Schedule during business hours

❌ **DON'T:**
- Add phone numbers without country code
- Use account names that don't exist
- Include + symbol in phone numbers
- Exceed 3 buttons per message
- Use more than 20 characters per button text

## 📁 Project Structure

```
wa-buttons/
├── index.js              # Application entry point
├── server.js             # Express server & API endpoints
├── bot-manager.js        # WhatsApp bot logic & message handling
├── package.json          # Dependencies & scripts
├── .gitignore           # Git ignore configuration
├── sample_messages.csv   # Example CSV for bulk sending
├── quickstart.sh        # Quick start guide script
└── public/              # Web interface
    ├── index.html       # Main HTML page
    ├── styles.css       # Styling
    └── script.js        # Frontend JavaScript logic
```

### Core Files Description

#### `index.js`
Entry point that starts the Express server and loads saved accounts.

#### `server.js`
Main Express application handling:
- Account management API endpoints
- Message sending endpoints
- CSV file upload and processing
- Batch status tracking
- QR code serving

#### `bot-manager.js`
WhatsApp Baileys library wrapper managing:
- Bot instance creation
- Message sending logic
- Button message formatting
- Connection state management
- Credential storage

#### `public/index.html`
Web interface with tabs for:
- Account management
- Single message sending
- Interactive button messages
- CSV bulk operations

## 🔐 Security

### Security Features Implemented

✅ **Credential Management:**
- Encrypted credential storage using Baileys' built-in encryption
- No hardcoded API keys or passwords
- Credentials deleted on account logout
- Each account uses separate credential file

✅ **Input Validation:**
- All user inputs validated on server-side
- Phone number format validation
- CSV parsing with proper error handling
- XSS protection in frontend

✅ **File Management:**
- `.gitignore` excludes sensitive folders:
  - `stored_login/` - Contains all credentials
  - `node_modules/` - Dependencies
  - `.env` - Environment variables
- Temporary files cleaned up automatically

✅ **Rate Limiting:**
- 8-20 second random delays between messages
- Respects WhatsApp's rate limiting policies
- Prevents account bans from excessive messaging

✅ **Error Handling:**
- No stack traces exposed to frontend in production
- Secure error messages
- Graceful degradation on failures
- Connection monitoring and auto-reconnection

### Best Practices for Your Environment

1. **Keep Credentials Secure:**
   ```bash
   # Never commit stored_login/ folder
   git status  # Verify it's not staged
   ```

2. **Use Environment Variables:**
   ```env
   PORT=3000
   NODE_ENV=production  # In production
   ```

3. **Network Security:**
   - Use HTTPS in production
   - Only access from trusted networks
   - Consider adding authentication (Basic Auth, JWT)

4. **Regular Backups:**
   - Backup `stored_login/` directory regularly
   - Keep credentials backup in secure location
   - Never share credentials with unauthorized users

## 🔌 API Endpoints

### Account Management

#### Get All Accounts
```
GET /api/accounts
Response: [{ id, name, phoneNumber, status, folder, createdAt }, ...]
```

#### Create New Account
```
POST /api/accounts
Body: { name: string, phoneNumber: string }
Response: { success: true, account: {...}, message: string }
```

#### Get Account Details
```
GET /api/accounts/:id
Response: { id, name, phoneNumber, status, folder, createdAt }
```

#### Update Account
```
PUT /api/accounts/:id
Body: { name: string }
Response: { success: true, account: {...} }
```

#### Delete Account
```
DELETE /api/accounts/:id
Response: { success: true, message: string }
```

#### Get QR Code
```
GET /api/accounts/:id/qr
Response: { qr: dataURL, timestamp: string, phoneNumber: string }
```

#### Start Account
```
POST /api/accounts/:id/start
Response: { success: true, message: string }
```

### Messaging

#### Send Text Message
```
POST /api/send-message
Body: {
  accountId: string,
  phoneNumber: string (format: 923051234567),
  message: string
}
Response: { success: true, message: string }
```

#### Send Button Message
```
POST /api/send-button-message
Body: {
  accountId: string,
  phoneNumber: string,
  messageBody: string,
  buttons: [{ id: string, displayText: string }, ...]
}
Response: { success: true, message: string }
```

### CSV Bulk Operations

#### Upload and Process CSV
```
POST /api/upload-csv
Content-Type: multipart/form-data
Body: { csvFile: File }
Response: { success: true, batchId: string, totalItems: number }
```

#### Get Batch Status
```
GET /api/batch-status/:batchId
Response: { 
  id: string, 
  createdAt: string,
  totalItems: number,
  items: [{ rowIndex, status, sentAt, ... }, ...]
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. **Port 3000 Already in Use**
```bash
# Windows - Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm start
```

#### 2. **QR Code Not Appearing**
**Problem**: QR code not shown in browser or terminal

**Solution:**
- Wait 3-5 seconds after account creation
- Refresh the browser and click "QR Code" button
- Check terminal for errors
- Ensure valid phone number format

#### 3. **Account Keeps Disconnecting**
**Problem**: "Connection closed" messages in terminal

**Reasons:**
- WhatsApp logged you out on phone
- Network interruption
- Account security flagged

**Solution:**
- Log in on your phone to WhatsApp
- Restart the application: `npm start`
- Wait for auto-reconnection (5 seconds)
- Check that WhatsApp phone account is functional

#### 4. **Messages Not Sending**
**Common Causes:**
- ❌ Account not connected (check status in UI)
- ❌ Wrong phone number format (missing country code)
- ❌ Rate limited by WhatsApp (use longer delays)
- ❌ Invalid button text (over 20 characters)

**Check:**
```bash
# In terminal, look for error message
# ❌ Error sending message to 923051234567: [error details]
```

#### 5. **CSV Upload Fails**
**Common Issues:**
- ❌ Missing required columns
- ❌ Account names don't match
- ❌ Invalid phone numbers
- ❌ File encoding issue

**Solution:**
- Use UTF-8 encoding for CSV
- Verify all required columns exist
- Check account names match exactly
- Start with sample_messages.csv template

#### 6. **Node.js Not Recognized**
**Problem**: "command not found: node"

**Solution:**
- Install Node.js from https://nodejs.org/
- Restart your terminal
- Verify: `node --version`

#### 7. **Port Already in Use Error**
**Solution:**
```bash
# Change port in startup
PORT=3001 npm start
```

### Debug Mode

Enable verbose logging:
```bash
# Set debug environment variable
set DEBUG=true
npm start
```

Monitor logs in terminal for detailed information about:
- Connection status
- Message sending flow
- Error details
- File operations

## 📦 Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@itsukichan/baileys` | ^7.3.2 | WhatsApp Web API (core) |
| `@hapi/boom` | ^10.0.1 | HTTP error handling |
| `express` | ^4.18.2 | Web framework |
| `body-parser` | ^1.20.2 | Request body parsing |
| `uuid` | ^9.0.0 | Unique ID generation |
| `qrcode` | ^1.5.3 | QR code generation |
| `qrcode-terminal` | ^0.12.0 | Terminal QR display |
| `csv-parser` | ^3.0.0 | CSV file parsing |
| `pino` | ^10.3.1 | Logging |
| `multer` | 1.4.5-lts.1 | File upload handling |

### Development Setup

To install all dependencies:
```bash
npm install
```

To update dependencies:
```bash
npm update
```

## 🚀 Performance Optimization

### Message Sending Speed

- **Default**: 8-20 second random delays (prevents rate limiting)
- **Adjust**: Edit `getRandomDelay()` in `server.js`

```javascript
function getRandomDelay() {
  const minMs = 8000;  // Minimum delay
  const maxMs = 20000; // Maximum delay
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}
```

### Batch Processing

- **Optimal batch size**: 50-100 messages per CSV
- **Timing**: 8-20 seconds between messages = ~24-30 messages per hour
- **Retry limit**: 2 automatic retries on timeout


## 🤝 Support & Contribution

For issues or suggestions:
1. Check the Troubleshooting section
2. Review terminal logs for error details
3. Ensure dependencies are installed: `npm install`
4. Verify WhatsApp account is functioning properly

## ⚠️ Disclaimer

This tool uses the WhatsApp Baileys library which is an unofficial implementation. WhatsApp may change their API, which could affect functionality. Use responsibly and follow WhatsApp's Terms of Service.

---

**Last Updated**: March 2026  
**Version**: 1.0.0  
**Node.js Requirement**: v14.0.0+
