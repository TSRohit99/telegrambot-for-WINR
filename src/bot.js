const TelegramBot = require("node-telegram-bot-api");
// const fs = require("fs");
require("dotenv").config();

let chatIds = [-1002162604540,-1001476355723,-4218457554,-1001381610969]; // not using any DB at the moment
// const chatIdsPath = "./chat_ids.json";

// if (fs.existsSync(chatIdsPath)) {
//   chatIds = JSON.parse(fs.readFileSync(chatIdsPath));
// }

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (chatId < 0) {
    // Check for group chat
    // if (chatIds.length < 100) {
    //   if (!chatIds.includes(chatId)) {
    //     chatIds.push(chatId);
    //     try {
    //       fs.writeFileSync(chatIdsPath, JSON.stringify(chatIds));
    //     } catch (error) {
    //       console.error("Error writing to chat_ids.json:", error);
    //     }
    //   }
    // } else {
      bot.sendMessage(
        chatId,
        "Contact @rohit_sen to use this bot, in your group!"
      );

    //}
  } else {
    bot.sendMessage(chatId, "Only available for groups for now!");
  }
});

const sendMessage = (text, options = {}) => {
  chatIds.forEach((chatId) => {
    if (chatId === -1001381610969) {
      // TG @WINRProtocol
      const topicId = 91869; //Topic -> Price_Chat
      bot.sendMessage(chatId, text, {
        message_thread_id: topicId,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...options,
      });
    } else {
      bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...options,
      });
    }
  });
};

// Graceful shutdown function
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  bot.stopPolling()
    .then(() => {
      console.log('Polling stopped');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error stopping polling:', error);
      process.exit(1);
    });
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = { bot, sendMessage };