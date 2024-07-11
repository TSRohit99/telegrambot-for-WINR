const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
require("dotenv").config();

let chatIds = [];
const chatIdsPath = "./chat_ids.json";

if (fs.existsSync(chatIdsPath)) {
  chatIds = JSON.parse(fs.readFileSync(chatIdsPath));
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId);
    fs.writeFileSync(chatIdsPath, JSON.stringify(chatIds));
  }
});

const sendMessage = (text, options = {}) => {
  chatIds.forEach((chatId) => {
    if (chatId === -1001381610969) { // TG @WINRProtocol 
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

module.exports = { bot, sendMessage };
