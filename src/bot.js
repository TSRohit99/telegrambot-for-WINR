const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const chatIds = [-1002162604540,-1001476355723,-1001381610969]

const buyAmount = 2000;

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (!chatIds.includes(chatId)) {
    bot.sendMessage(chatId, "Only available at @WINRProtocol for now!");
      }
  } 
);

// Function to send messages to all groups
const sendMessage = async (text, options = {}) => {


  // await bot.sendMessage(-1002162604540, text, {
  //           parse_mode: "HTML",
  //           disable_web_page_preview: true,
  //           ...options,
  //         });

  chatIds.forEach( async (chatId) => {
    if (chatId === -1001381610969) {
      // TG @WINRProtocol
      const topicId = 91869; // Topic -> Price_Chat
    await bot.sendMessage(chatId, text, {
        message_thread_id: topicId,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...options,
      });
    } else {
      try {
       await bot.sendMessage(chatId, text, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          ...options,
        });
      } catch (error) {
        console.log("Group has been deleted, or bot has been removed!");
      }
    }
  });
};

// Graceful shutdown function
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    await bot.stopPolling();
    console.log('Polling stopped');
    process.exit(0);
  } catch (error) {
    console.error('Error stopping polling:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown());
process.on('SIGTERM', () => gracefulShutdown());

module.exports = { bot, sendMessage, buyAmount };
