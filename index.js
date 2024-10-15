const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = '7882038455:AAGjDAlwlQP2FO2WklvL7WxfjQcht34N7gE';
const bot = new TelegramBot(BOT_TOKEN);

// Создаем Express-приложение
const app = express();
app.use(bodyParser.json());

// Устанавливаем вебхук для бота
const PORT = 3000;
bot.setWebHook(`https://bizimillyat-bot.onrender.com/${BOT_TOKEN}`);

app.post(`/${BOT_TOKEN}`, (req, res) => {
    const update = req.body;
    bot.processUpdate(update);
    res.sendStatus(200);
});

function getRandomPhrase(phrases) {
    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
}

const greetings = [
    "Салам алейкум, {name}! Хош гялдин джаным",
    "Салам алейкум, {name}, сени гордюм, и олдум!",
    "Салам алейкум, {name}! Хош гялдин!",
    "Салам алейкумляр, {name}! Буюр, чекинмя!",
    "Салам алейкум, {name}! Начасян? Сени гордюм, чок гезяль олдум!"
];

const activeCheck = [
    "{name}, бурдасын сян??.",
    "{name}, йоха чихма, дзаваб вер",
    "Эй, {name}, бизимлсясин? Дзавабаны гозлеик",
    "{name}, бурдасын? Бир щей яз я Алла!"
];

const thankYouMessages = [
    "Тешекюр эдерим, {name}, сянин дзавабаны алдим сагол!",
    "Дзавабан учуня тещекюляр, {name}!",
    "{name}, сагол, дзавабан учун!",
    "Не яхши ки дзавабаны вердин, {name}!"
];

const leaveMessages = [
    "Ох, {name} бизи тярк етти...",
    "{name}, сагол, горющурюз!",
    "Горющундук, {name}. Гял еня!",
    "Тясуф ки, {name} артык бизимля деил."
];

// Функция для ожидания
function wait(sec) {
    return new Promise((resolve) => {
        setTimeout(resolve, sec * 1000);
    });
}

let awaitingResponses = {};
const INACTIVITY_PERIOD = 2 * 24 * 60 * 60 * 1000; // 2 дня в миллисекундах

// Функция для проверки статуса участников
async function checkUserActivity() {
    const now = Date.now();

    for (const userId in awaitingResponses) {
        const userData = awaitingResponses[userId];
        const lastActivityTime = userData.lastActiveTime || now;

        if (now - lastActivityTime > INACTIVITY_PERIOD) {
            const chatId = userData.chatId;
            const message = `Привет, ${userData.first_name}! Хардасын? Ики гюн сян охтурсун, бищейми олду?`;
            await bot.sendMessage(chatId, message);
            delete awaitingResponses[userId]; // Удаляем пользователя из ожидающих
        }
    }
}

// Запускаем проверку активности каждые 12 часов
setInterval(checkUserActivity, 12 * 60 * 60 * 1000);

bot.on('new_chat_members', async (msg) => {
    const newMember = msg.new_chat_member;
    const chatId = msg.chat.id;

    await wait(5); 

    let memberTag;
    if (newMember.username) {
        memberTag = `@${newMember.username}`; 
    } else {
        memberTag = `[${newMember.first_name}](tg://user?id=${newMember.id})`; 
    }

    const welcomeMessage = getRandomPhrase(greetings).replace("{name}", memberTag);
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });

    awaitingResponses[newMember.id] = {
        chatId: chatId,
        first_name: newMember.first_name,
        lastActiveTime: Date.now(), // Устанавливаем текущее время как время активности
        timeout: setTimeout(async () => {
            const chatMember = await bot.getChatMember(chatId, newMember.id);

            if (chatMember.status === 'member') {
                const checkMessage = getRandomPhrase(activeCheck).replace("{name}", memberTag);
                bot.sendMessage(chatId, checkMessage, { parse_mode: 'Markdown' });

                awaitingResponses[newMember.id].kickTimeout = setTimeout(async () => {
                    const chatMember = await bot.getChatMember(chatId, newMember.id);
                    if (chatMember.status === 'member') {
                        bot.kickChatMember(chatId, newMember.id);
                        bot.sendMessage(chatId, `${newMember.first_name}, давай гагаш ты салам не закинул.`);
                        delete awaitingResponses[newMember.id]; 
                    }
                }, 1200000); 
            }
        }, 10000) 
    };
});

bot.on('message', (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    if (awaitingResponses[userId] && awaitingResponses[userId].chatId === chatId) {
        clearTimeout(awaitingResponses[userId].timeout);
        clearTimeout(awaitingResponses[userId].kickTimeout);

        const thankYouMessage = getRandomPhrase(thankYouMessages).replace("{name}", msg.from.first_name);
        bot.sendMessage(chatId, thankYouMessage);

        // Обновляем время последней активности
        awaitingResponses[userId].lastActiveTime = Date.now();

        delete awaitingResponses[userId]; 
    }
});

bot.on('left_chat_member', (msg) => {
    const leftMember = msg.left_chat_member;
    const chatId = msg.chat.id;
    const leaveMessage = getRandomPhrase(leaveMessages).replace("{name}", leftMember.first_name);
    bot.sendMessage(chatId, leaveMessage);
});

app.listen(PORT, () => {
    console.log(`Бот запущен на порту ${PORT}`);
});
