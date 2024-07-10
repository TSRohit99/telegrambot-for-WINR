const { web3 } = require('../../layer2s/setChainARB');
const { msgTemplate } = require("../msgSender");
const { getTokenPriceInUSD } = require("../getTokenPriceInUSD");
const { routerAddress, routerAbi } = require('../routerConfigs/camelotYakRouter');

const WINR_ADDRESS = '0xd77b108d4f6cefaa0cae9506a934e825becca46e'.toLowerCase();

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
          console.log(`Checking blocks from ${lastCheckedBlock + BigInt(1)} to ${latestBlock}`);
          const events = await routerContract.getPastEvents('YakSwap', {
            fromBlock: (lastCheckedBlock + BigInt(1)).toString(),
            toBlock: latestBlock.toString()
          });

          for (const event of events) {
            const { _tokenOut, _amountOut } = event.returnValues;

            const isBuy = _tokenOut.toLowerCase() === WINR_ADDRESS;
            const tokenPriceInUSD = await getTokenPriceInUSD("winr-protocol");

            if (!tokenPriceInUSD) {
              console.error('Failed to fetch token price, skipping this event');
              continue;
            }
            const amountOutWINR = parseFloat(web3.utils.fromWei(_amountOut.toString(), 'ether')).toFixed(2);
            const amountInUSD = amountOutWINR * tokenPriceInUSD.price;
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
              blockNumber: latestBlock.toString() // Add this line to include blockNumber
            };

            if (isBuy && amountInUSD >= 500) {
              const response = await msgTemplate(obj);
              console.log(response);
            }
          }

          lastCheckedBlock = latestBlock;
        }
      } catch (error) {
        console.error('Error checking for new events:', error);
      }
    };

    // Use a faster interval to check events every second
    setInterval(checkForEvents, 1000); // Check every 1 second
  } catch (error) {
    console.error('Error setting up event listener:', error);
    console.error('Error details:', error.stack);
  }
};

module.exports = { camelotMonitor };