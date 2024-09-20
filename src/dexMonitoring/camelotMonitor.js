const { web3 } = require("../../layer2s/setChainARB");
const { msgTemplate, getTime } = require("../msgSender");
const { getTokenPriceInUSD } = require("../getTokenPriceInUSD");
const {
  routerAddress,
  routerAbi,
} = require("../routerConfigs/camelotYakRouter");

const WINR_ADDRESS = "0xd77b108d4f6cefaa0cae9506a934e825becca46e".toLowerCase();
const MAX_BLOCK_RANGE = 100; // Same as UniSwap, fetching blocks in a range of 100
const CHECK_INTERVAL = 10000; // Set to 10 seconds
const QUEUE_PROCESS_INTERVAL = 5000; // Queue processing every 5 seconds
const MAX_QUEUE_SIZE = 100; // Keep queue size manageable

let eventQueue = [];
let isProcessing = false;
let lastCheckedBlock = BigInt(0); // Initialize block tracking

// Helper function for delaying execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Process each event in the queue
const processQueue = async () => {
  if (isProcessing || eventQueue.length === 0) return; // Avoid reprocessing if already busy or no events

  isProcessing = true;
  while (eventQueue.length > 0) {
    const event = eventQueue.shift(); // Fetch the next event
    try {
      const { _tokenOut, _amountOut } = event.returnValues;
      const isBuy = _tokenOut.toLowerCase() === WINR_ADDRESS; // Check if it is a buy event

      const tokenPriceInUSD = await getTokenPriceInUSD("winr-protocol");
      if (!tokenPriceInUSD) {
        console.error("Failed to fetch token price, skipping this event");
        continue; // Skip event if token price is not available
      }

      const amountOutWINR = parseFloat(
        web3.utils.fromWei(_amountOut.toString(), "ether")
      ).toFixed(2);
      const amountInUSD = parseFloat(amountOutWINR) * tokenPriceInUSD.price;

      if (isBuy && amountInUSD >= 500) {
        // Ensure amountInUSD meets minimum threshold
        const tx = await web3.eth.getTransaction(event.transactionHash);

        const obj = {
          price: tokenPriceInUSD.price,
          dex: "Camelot",
          amountOutWINR,
          amountInUSD,
          mcapInUSD: tokenPriceInUSD.marketCap.toFixed(2),
          volume24hInUSD: tokenPriceInUSD.volume24h.toFixed(2),
          tx,
          event,
          blockNumber: event.blockNumber.toString(),
        };
        const response = await msgTemplate(obj);
        console.log(response); // Log the response from msgTemplate
      }
    } catch (error) {
      console.error("Error processing event:", error);
    }
  }
  isProcessing = false; // Reset processing flag after queue is empty
};

// Check for events in block ranges
const checkForEvents = async (routerContract) => {
  try {
    const latestBlock = BigInt(await web3.eth.getBlockNumber());

    if (latestBlock > lastCheckedBlock) {
      const endBlock = BigInt(
        Math.min(
          Number(lastCheckedBlock) + MAX_BLOCK_RANGE,
          Number(latestBlock)
        )
      );
      console.log(
        `Camelot Monitor -> Checking blocks from ${
          lastCheckedBlock + 1n
        } to ${endBlock} : ${getTime()}`
      );

      const events = await routerContract.getPastEvents("YakSwap", {
        fromBlock: (lastCheckedBlock + 1n).toString(),
        toBlock: endBlock.toString(),
      });
      console.log(`Camelot Monitor -> Found ${events.length} events`);

      // Add events to the queue and slice to maintain queue size
      eventQueue = [...eventQueue, ...events].slice(-MAX_QUEUE_SIZE);

      lastCheckedBlock = endBlock; // Move the last checked block to end of the range
    }
  } catch (error) {
    console.error("Error checking for new events:", error);
    await sleep(5000); // Delay before retrying if there's an error
  }
};

// Monitor function to initialize and start the event listener
const camelotMonitor = async () => {
  try {
    const routerContract = new web3.eth.Contract(routerAbi, routerAddress);
    console.log("Router contract initialized");
    lastCheckedBlock = BigInt(await web3.eth.getBlockNumber()); // Initialize last checked block
    console.log("Last checked block:", lastCheckedBlock.toString());

    const monitor = async () => {
      await checkForEvents(routerContract); // Check for new events in each interval
      await processQueue(); // Process event queue after checking
    };

    // Run monitor and queue processing at intervals
    setInterval(monitor, CHECK_INTERVAL);
    setInterval(processQueue, QUEUE_PROCESS_INTERVAL); // Continue processing queue in parallel
  } catch (error) {
    console.error("Error setting up event listener:", error);
  }
};

module.exports = { camelotMonitor };
