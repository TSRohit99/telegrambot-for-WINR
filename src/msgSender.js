const { sendMessage } = require("./bot");

const getTime = () => {
  return ( new Date().toLocaleString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  timeZone: 'Asia/dhaka' //GMT +6
}))
}

let PQueue;
let queue;

(async () => {
  const pQueueModule = await import('p-queue');
  PQueue = pQueueModule.default;
  queue = new PQueue({ concurrency: 1 });
})();

let processedTxs = new Set();
let lastResetBlock = 0;

const resetProcessedTxs = (currentBlock) => {
  if (currentBlock - lastResetBlock >= 100) { // Reset every 100 blocks
    processedTxs = new Set();
    lastResetBlock = currentBlock;
    console.log(`Reset processed transactions at block ${currentBlock}`);
  }
};

const msgTemplate = async (obj) => {
  resetProcessedTxs(parseInt(obj.blockNumber));
  if (processedTxs.has(obj.event.transactionHash)) {
    console.log(`Skipping already processed transaction: ${obj.event.transactionHash}`);
    return "Message already sent for this transaction.";
  }

  return queue.add(async () => {
    let message = `<b>WINR Buy (on ${obj.dex} V3)!💹🔥</b>\n\n`;
    message += `<b>➡️</b> ${obj.amountOutWINR} WINR (${obj.amountInUSD.toFixed(2)} USD)\n`;
    message += `<b>👤 </b><a href="https://arbiscan.io/address/${obj.tx.from}">Owner</a>\n`;
    message += `<b>🔗 </b><a href="https://arbiscan.io/tx/${obj.event.transactionHash}">Txn Link</a>\n`;
    message += `<b>💰 24h Vol ~</b> $${obj.volume24hInUSD} \n`;
    message += `<b>📈 Market Cap ~</b> $${obj.mcapInUSD} \n\n`;
    message += `<a href="https://dexscreener.com/arbitrum/0xc35aa1cec34e02a8acc3e5f79c22be364823094c">Chart </a>`;
    message += " | ";
    message += `<a href="https://x.com/winrprotocol">X </a>`;
    message += " | ";
    message += `<a href="https://discord.gg/winrprotocol">Discord </a>`;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Casino 🎲", url: `https://app.just.bet/` },
            { text: "Futures 💹", url: `https://app.degens.bet/eth` },
          ],
        ],
      },
      disable_web_page_preview: true,
    };

    try {
      await sendMessage(message, options);
      processedTxs.add(obj.event.transactionHash);
      return "Successfully sent msg to the group!";
    } catch (error) {
      console.error("Error sending message:", error);
      return "Failed to send message to the group.";
    }
  });
};

module.exports = { msgTemplate , getTime};