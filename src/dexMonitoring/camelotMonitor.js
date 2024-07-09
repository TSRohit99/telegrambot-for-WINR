const { web3 } = require('../../layer2s/setChainARB');
const { sendMessage } = require('../bot');
const { routerAddress, routerAbi } = require('../routerConfigs/camelotYakRouter'); // Adjust path as needed
const axios = require('axios');


const WINR_ADDRESS = '0xd77b108d4f6cefaa0cae9506a934e825becca46e'.toLowerCase();
// Adjust concurrency as needed

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';

const getTokenPriceInUSD = async (tokenId) => {
  try {
    const response = await axios.get(COINGECKO_API_URL, {
      params: {
        ids: tokenId,
        vs_currencies: 'usd',
        include_market_cap: 'true'
      }
    });
    const data = response.data[tokenId];
    return {
      price: data.usd,
      marketCap: data.usd_market_cap
    };
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
};

const camelotMonitor = async () => {
  try {
    const routerContract = new web3.eth.Contract(routerAbi, routerAddress);
    console.log('Router contract initialized');
    let lastCheckedBlock = BigInt(await web3.eth.getBlockNumber());
    console.log('Last checked block:', lastCheckedBlock.toString());

    const checkForEvents = async () => {
      const PQueue = await import('p-queue');
      const queue = new PQueue.default({ concurrency: 1 }); 
      try {
        const latestBlock = BigInt(await web3.eth.getBlockNumber());

        if (latestBlock > lastCheckedBlock) {
          console.log(`Checking blocks from ${lastCheckedBlock + BigInt(1)} to ${latestBlock}`);
          const events = await routerContract.getPastEvents('YakSwap', {
            fromBlock: (lastCheckedBlock + BigInt(1)).toString(),
            toBlock: latestBlock.toString()
          });

          for (const event of events) {
            const {  _tokenOut, _amountOut } = event.returnValues;

            const isBuy = _tokenOut.toLowerCase() === WINR_ADDRESS;
            if (isBuy) {
              queue.add(async () => {
                let message = `<b>WINR Buy (on Camelot)!💹🔥</b>\n\n`;
                const amountOutWINR = parseFloat(web3.utils.fromWei(_amountOut.toString(), 'ether')).toFixed(2);
                
                // Determine the token symbol and get its price in USD
                const tokenPriceInUSD = await getTokenPriceInUSD("winr-protocol");
                
                const amountInUSD = amountOutWINR * tokenPriceInUSD.price;
                const mcapInUSD = tokenPriceInUSD.marketCap.toFixed(2);
                
                message += `<b>➡️</b> ${amountOutWINR} WINR (${amountInUSD.toFixed(2)} USD)\n`;
                const tx = await web3.eth.getTransaction(event.transactionHash);
                message += `<b>👤 </b><a href="https://arbiscan.io/address/${tx.from}">Owner </a>\n`;
                message += `<b>🔗 </b><a href="https://arbiscan.io/tx/${event.transactionHash}">Txn Link</a>\n`;
                message += `<b>📈 Market Cap ~</b> $${mcapInUSD} \n\n`;

                message += `<a href="https://dexscreener.com/arbitrum/0xc35aa1cec34e02a8acc3e5f79c22be364823094c">Chart </a>`;
                message+=" | ";
                message += `<a href="https://x.com/winrprotocol">X </a>`;
                message+=" | ";
                message += `<a href="https://discord.gg/winrprotocol">Discord </a>`;

                const options = {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: 'Casino 🎲', url: `https://app.just.bet/` },
                        { text: 'Futures 💹', url: `https://app.degens.bet/eth` }
                      ]
                    ]
                  },
                  disable_web_page_preview: true
                };

                await sendMessage(message, options);
              });
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
