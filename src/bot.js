const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
require("dotenv").config();

let chatIds = [];
const chatIdsPath = "./chat_ids.json";

// Load chat IDs from file
if (fs.existsSync(chatIdsPath)) {
  try {
    chatIds = JSON.parse(fs.readFileSync(chatIdsPath));
    console.log("Loaded chat IDs:", chatIds);
  } catch (error) {
    console.error("Error reading chat_ids.json:", error);
  }
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Function to save chat IDs to file
const saveChatIds = () => {
  try {
    fs.writeFileSync(chatIdsPath, JSON.stringify(chatIds));
    console.log("Chat IDs saved to file:", chatIds);
  } catch (error) {
    console.error("Error writing to chat_ids.json:", error);
  }
};

// Function to check if the bot is in a group
const checkBotInGroup = async (chatId) => {
  const botInfo = await bot.getMe();
  console.log(`Checking bot in chat ${chatId}...`);
  const chatMember = await bot.getChatMember(chatId, botInfo.id);
  if (chatMember.status === "kicked") {
    console.log(`Bot is kicked from the chat ${chatId}`);
    return false;
  }
  console.log(`Bot is in chat ${chatId}`);
  return true;
};

// Function to clean up chat IDs
const cleanupChatIds = async () => {
  console.log("Starting cleanup process...");
  const validChatIds = [];
  for (const chatId of chatIds) {
    if (await checkBotInGroup(chatId)) {
      validChatIds.push(chatId);
    } else {
      console.log(`Removing chat ID ${chatId} from the list`);
    }
  }
  if (validChatIds.length !== chatIds.length) {
    console.log(`Old chat IDs: ${chatIds}`);
    chatIds = validChatIds;
    console.log(`New chat IDs: ${chatIds}`);
    saveChatIds();
    console.log(`Removed ${chatIds.length - validChatIds.length} invalid chat IDs`);
  } else {
    console.log("No changes to chat IDs");
  }
};

// Run cleanup every 60 minutes
setInterval(cleanupChatIds, 60 * 60 * 1000);

// Listen for new messages and add group chats
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  console.log(`Received message from chat ${chatId}`);

  if (chatId < 0) { // Check for group chat
    if (chatIds.length < 100) {
      if (!chatIds.includes(chatId)) {
        chatIds.push(chatId);
        saveChatIds();
        console.log(`Added new chat ID: ${chatId}`);
      }
    } else {
      bot.sendMessage(
        chatId,
        "Max Group reached! Contact @rohit_sen to use this bot, in your group!"
      );
    }
  } else {
    bot.sendMessage(chatId, "Only available for groups for now!");
  }
});

// Function to send messages to all groups
const sendMessage = (text, options = {}) => {
  chatIds.forEach((chatId) => {
    if (chatId === -1001381610969) {
      // TG @WINRProtocol
      const topicId = 91869; // Topic -> Price_Chat
      bot.sendMessage(chatId, text, {
        message_thread_id: topicId,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...options,
      });
    } else {
      try {
        bot.sendMessage(chatId, text, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          ...options,
        });
      } catch (error) {
        console.log("Group has been deleted!");
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

// Initial cleanup
cleanupChatIds();

module.exports = { bot, sendMessage };
