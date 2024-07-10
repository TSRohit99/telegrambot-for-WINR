const { setupBot } = require('./src/bot');
const { camelotMonitor } = require('./src/dexMonitoring/camelotMonitor');
const { uniswapMonitor } = require('./src/dexMonitoring/uniswapMonitor');

setupBot;

(async () => {
  try {
    await Promise.all([
      camelotMonitor(),
      uniswapMonitor()
    ]);
  } catch (error) {
    console.error('Error starting monitoring:', error);
  }
})();