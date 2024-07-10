const { web3 } = require("../../layer2s/setChainARB");
const { msgTemplate } = require("../msgSender");
const { getTokenPriceInUSD } = require("../getTokenPriceInUSD");
const { poolAddress, poolAbi } = require("../routerConfigs/uniSwapV3Pool");

const MAX_BLOCK_RANGE = 100; // Maximum number of blocks to check in one iteration
const CHECK_INTERVAL = 2000; // Check every 2 seconds

const uniswapMonitor = async () => {
  try {
    const poolContract = new web3.eth.Contract(poolAbi, poolAddress);
    console.log("Pool contract initialized");
    let lastCheckedBlock = BigInt(await web3.eth.getBlockNumber());
    console.log("Last checked block:", lastCheckedBlock.toString());

    const checkForEvents = async () => {
      try {
        const latestBlock = BigInt(await web3.eth.getBlockNumber());

        if (latestBlock > lastCheckedBlock) {
          const endBlock = BigInt(Math.min(Number(lastCheckedBlock) + MAX_BLOCK_RANGE, Number(latestBlock)));

          console.log(
            `Checking blocks from ${lastCheckedBlock + BigInt(1)} to ${endBlock}`
          );

          const events = await poolContract.getPastEvents("Swap", {
            fromBlock: (lastCheckedBlock + BigInt(1)).toString(),
            toBlock: endBlock.toString(),
          });

          console.log(`Found ${events.length} events`);

          for (const event of events) {
            const { amount0, amount1 } = event.returnValues;
            const isBuy = BigInt(amount1) < 0;
            const tokenAmount = isBuy ? BigInt(-amount1) : BigInt(amount0);
            const tokenPriceInUSD = await getTokenPriceInUSD("winr-protocol");

            if (!tokenPriceInUSD) {
              console.error("Failed to fetch token price, skipping this event");
              continue;
            }

            const amountOutWINR = parseFloat(
              web3.utils.fromWei(tokenAmount.toString(), "ether")
            ).toFixed(2);

            const amountInUSD = parseFloat(amountOutWINR) * tokenPriceInUSD.price;
            const mcapInUSD = tokenPriceInUSD.marketCap.toFixed(2);
            const volume24hInUSD = tokenPriceInUSD.volume24h.toFixed(2);
            const tx = await web3.eth.getTransaction(event.transactionHash);
            const dex = "UniSwap";
            const obj = {
              dex,
              amountOutWINR,
              amountInUSD,
              mcapInUSD,
              volume24hInUSD,
              tx,
              event,
              blockNumber: endBlock.toString(), // Add this for msgTemplate
            };

            if (isBuy && amountInUSD ) {
              const response = await msgTemplate(obj);
              console.log(response);
            }
          }

          lastCheckedBlock = endBlock;
        } else {
          console.log("No new blocks. Waiting...");
        }
      } catch (error) {
        console.error("Error checking for new events:", error);
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

  } catch (error) {
    console.error(
      "Error initializing contract or setting up event listener:",
      error
    );
    console.error("Error details:", error.stack);
  }
};

module.exports = { uniswapMonitor };