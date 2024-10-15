const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = '7882038455:AAGjDAlwlQP2FO2WklvL7WxfjQcht34N7gE';
const bot = new TelegramBot(BOT_TOKEN);

const app = express();
app.use(bodyParser.json());

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
    "Салам, {name}! Добро пожаловать в чат! Слышал, тут раздают печеньки! 🍪",
    "Салам, {name}! Рад тебя видеть! Говорят, ты супергерой! 🦸‍♂️",
    "Салам, {name}! Добро пожаловать! Готовься, сейчас будет весело! 🎉",
    "Салам, {name}! Не стой в стороне! У нас тут танцы и конкурс на лучшее селфи! 📸",
    "Салам, {name}! Как дела? Рад тебя видеть! Заходи, у нас тут веселье! 😄"
];

const activeCheck = [
    "{name}, ты здесь? Пожалуйста, ответь! Не прячься, мы не кусаемся! 😜",
    "{name}, где ты? Ответь! У нас тут веселье, не упусти его! 🎊",
    "Эй, {name}, ты с нами? Ждем твоего ответа. Надеюсь, ты не застрял в пробке! 🚦",
    "{name}, ты все еще здесь? Напиши что-нибудь! Или ты уже стал призраком? 👻",
    "Эй, {name}, где ты? Мы начали без тебя! Может, ты просто потерялся? 🧭"
];

const responseMessages = [
    "Салам! Ура, ты пришёл! Мы тебя ждали! 😄",
    "Салам, {name}! Я думал, ты призрак! 🎉",
    "Отлично, что ты здесь! Мы уже приготовили печеньки! 🍪",
    "Ура, ты пришёл! А что, если устроим вечеринку? 🎊",
    "Ты не представляешь, как мы по тебе скучали! 😃"
];

const farewellMessages = [
    "Салам, {name}! Ты покинул чат! Жаль, мы тебя ждали! 😢",
    "Эх, {name}, жаль! Мы тебя ждали, а ты ушёл! 👋",
    "Пока, {name}! Ты покинул чат, а мы тебя ждали! 🥺",
    "{name}, ты ушёл! Пока! Мы тебя ждали! 🎈",
    "Жаль, {name}, что тебя больше нет! Пока, надеемся, увидимся снова! 💔"
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

    const welcomeMessage = getRandomPhrase(greetings).replace("{name}", `@${newMember.username || newMember.first_name}`);
    const welcomeResponse = await bot.sendMessage(chatId, welcomeMessage);

    const timeoutMinutes = 10; 
    const timeoutMillis = timeoutMinutes * 60 * 1000; 

    setTimeout(async () => {
        const chatMember = await bot.getChatMember(chatId, newMember.id);
        if (chatMember.status === 'member') {
            const checkMessage = getRandomPhrase(activeCheck).replace("{name}", `@${newMember.username || newMember.first_name}`);
            await bot.sendMessage(chatId, checkMessage);
            setTimeout(async () => {
                const updatedChatMember = await bot.getChatMember(chatId, newMember.id);
                if (updatedChatMember.status === 'member') {
                    await bot.kickChatMember(chatId, newMember.id);
                    const kickMessage = `${newMember.first_name} был кикнут из-за отсутствия ответа! Пока 😔`;
                    await bot.sendMessage(chatId, kickMessage);
                }
            }, timeoutMillis); 

            const messageListener = (message) => {
                if (message.reply_to_message && message.reply_to_message.message_id === welcomeResponse.message_id) {
                    const followUpMessage = getRandomPhrase(responseMessages).replace("{name}", message.from.first_name);
                    bot.sendMessage(chatId, followUpMessage);
                    bot.removeListener('message', messageListener); 
                }
            };
            bot.on('message', messageListener);
        }
    }, timeoutMillis);
});

bot.on('left_chat_member', (msg) => {
    const leftMember = msg.left_chat_member;
    const chatId = msg.chat.id;

    const farewellMessage = getRandomPhrase(farewellMessages).replace("{name}", `@${leftMember.username || leftMember.first_name}`);
    bot.sendMessage(chatId, farewellMessage);
});

app.listen(PORT, () => {
    console.log(`Бот запущен на порту ${PORT}`);
});
