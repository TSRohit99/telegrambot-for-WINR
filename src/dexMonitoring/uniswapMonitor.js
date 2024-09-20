const { web3 } = require("../../layer2s/setChainARB");
const { msgTemplate, getTime } = require("../msgSender");
const { getTokenPriceInUSD } = require("../getTokenPriceInUSD");
const { poolAddress, poolAbi } = require("../routerConfigs/uniSwapV3Pool");

const MAX_BLOCK_RANGE = 100;
const CHECK_INTERVAL = 10000; // Increased to 10 seconds
const QUEUE_PROCESS_INTERVAL = 5000; // Process queue every 5 seconds
const MAX_QUEUE_SIZE = 100; // Limit queue size

let eventQueue = [];
let isProcessing = false;

const processEvent = async (event) => {
  try {
    const { amount0, amount1 } = event.returnValues;
    const isBuy = BigInt(amount1) < 0n;
    const tokenAmount = isBuy ? -BigInt(amount1) : BigInt(amount0);

    const tokenPriceInUSD = await getTokenPriceInUSD("winr-protocol");
    if (!tokenPriceInUSD) {
      console.error("Failed to fetch token price, skipping this event");
      return;
    }

    const amountOutWINR = parseFloat(web3.utils.fromWei(tokenAmount.toString(), "ether")).toFixed(2);
    const amountInUSD = parseFloat(amountOutWINR) * tokenPriceInUSD.price;

    if (isBuy && amountInUSD >= 500) { // Added minimum threshold
      const tx = await web3.eth.getTransaction(event.transactionHash);
      const obj = {
        price: tokenPriceInUSD.price,
        dex: "UniSwap",
        amountOutWINR,
        amountInUSD,
        mcapInUSD: tokenPriceInUSD.marketCap.toFixed(2),
        volume24hInUSD: tokenPriceInUSD.volume24h.toFixed(2),
        tx,
        event,
        blockNumber: event.blockNumber.toString(),
      };

      await msgTemplate(obj);
    }
  } catch (error) {
    console.error("Error processing event:", error);
  }
};

const processQueue = async () => {
  if (isProcessing || eventQueue.length === 0) return;
  
  isProcessing = true;
  const event = eventQueue.shift();
  await processEvent(event);
  isProcessing = false;
};

const uniswapMonitor = async () => {
  try {
    const poolContract = new web3.eth.Contract(poolAbi, poolAddress);
    console.log("Pool contract initialized");
    let lastCheckedBlock = BigInt(await web3.eth.getBlockNumber());

    const checkForEvents = async () => {
      try {
        const latestBlock = BigInt(await web3.eth.getBlockNumber());
        
        if (latestBlock > lastCheckedBlock) {
          const endBlock = BigInt(Math.min(Number(lastCheckedBlock) + MAX_BLOCK_RANGE, Number(latestBlock)));
          
          console.log(`UniSwap Monitor -> Checking blocks from ${lastCheckedBlock + 1n} to ${endBlock} : ${getTime()}`);
          
          const events = await poolContract.getPastEvents("Swap", {
            fromBlock: (lastCheckedBlock + 1n).toString(),
            toBlock: endBlock.toString(),
          });
          
          console.log(`UniSwap Monitor -> Found ${events.length} events`);
          
          eventQueue = [...eventQueue, ...events].slice(-MAX_QUEUE_SIZE);
          
          lastCheckedBlock = endBlock;
        }
      } catch (error) {
        console.error("Error checking for new events:", error);
      }
    };

    setInterval(checkForEvents, CHECK_INTERVAL);
    setInterval(processQueue, QUEUE_PROCESS_INTERVAL);
  } catch (error) {
    console.error("Error initializing contract or setting up event listener:", error);
  }
};

module.exports = { uniswapMonitor };