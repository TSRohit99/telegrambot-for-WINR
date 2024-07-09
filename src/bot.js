const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

let chatIds = [];
const chatIdsPath = './chat_ids.json';

if (fs.existsSync(chatIdsPath)) {
  chatIds = JSON.parse(fs.readFileSync(chatIdsPath));
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });


bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId);
    fs.writeFileSync(chatIdsPath, JSON.stringify(chatIds));
  }
});

const sendMessage = (text, options = {}) => {
  chatIds.forEach(chatId => {
    bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true, ...options });
  });
};

// bot.getChatAdministrators('-4204165375').then((data) => {
//   bot.sendMessage('-4204165375',"Admins in chat")
//   data.map((user)=> bot.sendMessage('-4204165375',user.user.username))
// });

module.exports = { bot, sendMessage  };
