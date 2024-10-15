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
    "Салам, {name}! Хош гелдин чата! Слышал, тут раздают печеньки!",
    "Салам, {name}! Сени здесь görmekten şadam! Поговаривают, что ты супергерой!",
    "Салам, {name}, хош гелдин! Готовься, сейчас будет весело!",
    "Саламлар, {name}! Буйру, чэкинмэ! У нас тут танцы и конкурс на лучшее селфи!",
    "Салам, {name}! Нэчэсэн? Сени görmekten мэмнун! Заходи, у нас тут игрища!"
];

const activeCheck = [
    "{name}, сен бурдасан? Хайыш эдирам, жавоб вер! Не прячься, мы не кусаемся!",
    "{name}, йока чикма, жавоб вер! У нас тут веселье, не упусти его!",
    "Эй, {name}, бизнилэсэн? Жавобини кутамиз. Надеюсь, ты не застрял в трафике!",
    "{name}, хале де бурдасан? Бир шей яз! Или ты уже стал призраком?",
    "Йо, {name}, где ты? Мы тут уже начали без тебя! А может, ты просто потерялся?"
];

const responseMessages = [
    "Салам! Кош гелдин! Бак, я́лмы, сену гёрмэк у́чун кутудук! 😄",
    "Салам, {name}! Сени бурда гормэдигим чун, гальмудун! 🎉",
    "Саламат кэлдин, биз бак да жадалэн кутудук! 🍪",
    "Сен гельмесен, биз старгиз кэчиририк! 👻",
    "Санлда бир патнолар! Миссир гюлдüн! 🎊"
];

const farewellMessages = [
    "Салам, {name}! Ушбу чата гош кетдин! Кечир, биз сени жадалэн кутудук! 😢",
    "Эх, {name}, кэчир! Биз сени жадалэн кутудук, бу шейрда енисин! 👋",
    "Сан хош, {name}! Ушбу чата гош кетдин, ами биз сени жадалэн кутудук! 🥺",
    "{name}, ты ушёл! Хош! Сени жадалэн кутудук! 🎈",
    "Кечир, {name}, сени бурда көрмэсек! Хош гелдин! 💔"
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
