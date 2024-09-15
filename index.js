const express = require("express");
const app = express();
require("dotenv").config();

const { setupBot } = require('./src/bot');
const { camelotMonitor } = require('./src/dexMonitoring/camelotMonitor');
const { uniswapMonitor } = require('./src/dexMonitoring/uniswapMonitor');

app.get('/', (req, res)=>{
  res.send("Bot is live");
})


const port = process.env.PORT || 4000;

app.listen(port, ()=>{
  console.log('server running');
})


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