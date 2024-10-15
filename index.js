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
bot.setWebHook(`https://bizimillyat-bot.onrender.com/`);

// Обработка обновлений
app.post(`/${BOT_TOKEN}`, (req, res) => {
    const update = req.body;
    bot.processUpdate(update);
    res.sendStatus(200);
});

// Функция для получения случайной фразы
function getRandomPhrase(phrases) {
    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
}

const greetings = [
    "Salam, {name}! Xoş gəldin çata!",
    "Salam, {name}! Səni burada görməyə şadam!",
    "Salam, {name}, xoş gəldin!",
    "Salamlar, {name}! Buyur, çəkinmə!",
    "Salam, {name}! Necəsən? Səni görməkdən məmnunuq!"
];

// Массив сообщений для проверки активности
const activeCheck = [
    "{name}, sən burdasan? Xahiş edirəm, cavab ver.",
    "{name}, yoxa çıxma, cavab ver!",
    "Hey, {name}, bizimləsən? Cavabını gözləyirik.",
    "{name}, hələ də burdasan? Bir şey yaz!"
];

function wait(sec) {
    return new Promise((resolve) => {
        setTimeout(resolve, sec * 1000);
    });
}

bot.on('new_chat_members', async (msg) => {
    const newMember = msg.new_chat_member;
    const chatId = msg.chat.id;

    await wait(5);
    const welcomeMessage = getRandomPhrase(greetings).replace("{name}", newMember.first_name);
    bot.sendMessage(chatId, welcomeMessage);
    setTimeout(async () => {
        const chatMember = await bot.getChatMember(chatId, newMember.id);

        if (chatMember.status === 'member') {
            const checkMessage = getRandomPhrase(activeCheck).replace("{name}", newMember.first_name);
            bot.sendMessage(chatId, checkMessage);
        }
    }, 10000);
});

// Запускаем сервер
app.listen(PORT, () => {
    console.log(`Бот запущен на порту ${PORT}`);
});
