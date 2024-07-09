require('dotenv').config();
const { setupBot } = require('./src/bot');
const { camelotMonitor } = require('./src/dexMonitoring/camelotMonitor');

setupBot;

(async () => {
    try {
      await camelotMonitor();
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  })();
  
