// index.js - Entry point for WhatsApp Multi-Account Bot
// This file starts both the Express web server and loads all saved accounts

const botManager = require('./bot-manager');

console.log('🚀 Starting WhatsApp Multi-Account Bot...\n');

// Start the Express server (server.js will be imported and run automatically)
require('./server');

// Load and start all previously saved accounts
console.log('📂 Loading saved accounts...');
botManager.loadAndStartAllAccounts();

console.log('\n✅ Ready! Open http://localhost:3000 in your browser');