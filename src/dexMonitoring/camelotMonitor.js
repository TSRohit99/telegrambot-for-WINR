const { web3 } = require('../../layer2s/setChainARB');
const { msgTemplate,getTime } = require("../msgSender");
const { getTokenPriceInUSD } = require("../getTokenPriceInUSD");
const { routerAddress, routerAbi } = require('../routerConfigs/camelotYakRouter');

const WINR_ADDRESS = '0xd77b108d4f6cefaa0cae9506a934e825becca46e'.toLowerCase();
const CHECK_INTERVAL = 2000; // Check every 1 second
const eventQueue = [];

const processQueue = async () => {
  while (eventQueue.length > 0) {
    const event = eventQueue.shift();
    try {
      const { _tokenOut, _amountOut } = event.returnValues;
      const isBuy = _tokenOut.toLowerCase() === WINR_ADDRESS;
      
      const tokenPriceInUSD = await getTokenPriceInUSD("winr-protocol");

      if (!tokenPriceInUSD) {
        console.error('Failed to fetch token price, skipping this event');
        continue;
      }

      const amountOutWINR = parseFloat(web3.utils.fromWei(_amountOut.toString(), 'ether')).toFixed(2);
      const amountInUSD = parseFloat(amountOutWINR) * tokenPriceInUSD.price;
      const mcapInUSD = tokenPriceInUSD.marketCap.toFixed(2);
      const volume24hInUSD = tokenPriceInUSD.volume24h.toFixed(2);
      const tx = await web3.eth.getTransaction(event.transactionHash);
      const dex = "Camelot";

      const obj = {
        dex,
        amountOutWINR,
        amountInUSD,
        mcapInUSD,
        volume24hInUSD,
        tx,
        event,
        blockNumber: event.blockNumber.toString()
      };

      if (isBuy && amountInUSD >= 500) {
        const response = await msgTemplate(obj);
        console.log(response);
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }

  // Schedule next queue processing
  setTimeout(processQueue, 1000);
};

const camelotMonitor = async () => {
  try {
    const routerContract = new web3.eth.Contract(routerAbi, routerAddress);
    console.log('Router contract initialized');
    let lastCheckedBlock = BigInt(await web3.eth.getBlockNumber());
    console.log('Last checked block:', lastCheckedBlock.toString());

    const checkForEvents = async () => {
      try {
        const latestBlock = BigInt(await web3.eth.getBlockNumber());

        if (latestBlock > lastCheckedBlock) {
          console.log(`Camelot Monitor -> Checking blocks from ${lastCheckedBlock + BigInt(1)} to ${latestBlock} : ${getTime()}`);
          const events = await routerContract.getPastEvents('YakSwap', {
            fromBlock: (lastCheckedBlock + BigInt(1)).toString(),
            toBlock: latestBlock.toString()
          });
          console.log(`Camelot Monitor -> Found ${events.length} events`);

          // Add events to queue instead of processing immediately
          events.forEach(event => {
            eventQueue.push(event);
          });

          lastCheckedBlock = latestBlock;
        }
      } catch (error) {
        console.error('Error checking for new events:', error);
        // Add a delay before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    };

    // Use setInterval with error handling
    const runInterval = () => {
      checkForEvents().catch(error => {
        console.error("Error in checkForEvents:", error);
        // Ensure the interval continues even if there's an error
        setTimeout(runInterval, CHECK_INTERVAL);
      });
    };

    setInterval(runInterval, CHECK_INTERVAL);

    // Start processing queue
    processQueue();

  } catch (error) {
    console.error('Error setting up event listener:', error);
    console.error('Error details:', error.stack);
  }
};

module.exports = { camelotMonitor };