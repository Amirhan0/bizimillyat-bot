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
с
const greetings = [
    "Ассаламу алейкум, {name}! Добро пожаловать, дорогой!",
    "Ассаламу алейкум, {name}, увидел тебя и сразу стало лучше!",
    "Ассаламу алейкум, {name}! Добро пожаловать!",
    "Ассаламу алейкум, {name}! Проходи, не стесняйся!",
    "Ассаламу алейкум, {name}! Как ты? Увидев тебя, я стал счастливее!"
];

const activeCheck = [
    "{name}, ты здесь?",
    "{name}, не пропадай, ответь!",
    "Эй, {name}, ты с нами? Жду ответа!",
    "{name}, ты тут? Напиши что-нибудь!"
];

const thankYouMessages = [
    "Спасибо большое, {name}, получил твой ответ, ты супер!",
    "Благодарю за ответ, {name}!",
    "{name}, спасибо тебе за твой ответ!",
    "Как хорошо, что ты ответил, {name}!"
];

const leaveMessages = [
    "Ох, {name} покинул нас...",
"{name}, прощай, до встречи!",
"До свидания, {name}. Возвращайся ещё!",
"Жаль, что {name} больше с нами нет."
];

function wait(sec) {
    return new Promise((resolve) => {
        setTimeout(resolve, sec * 1000);
    });
}

let awaitingResponses = {};
const INACTIVITY_PERIOD = 2 * 24 * 60 * 60 * 1000;

async function checkUserActivity() {
    const now = Date.now();

    for (const userId in awaitingResponses) {
        const userData = awaitingResponses[userId];
        const lastActivityTime = userData.lastActiveTime || now;

        if (now - lastActivityTime > INACTIVITY_PERIOD) {
            const chatId = userData.chatId;
            const message = `Привет, ${userData.first_name}!  Где ты? Уже два дня тебя не видно, всё ли в порядке?`;
            await bot.sendMessage(chatId, message);
            delete awaitingResponses[userId];
        }
    }
}

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
        lastActiveTime: Date.now(),
        timeout: setTimeout(async () => {
            const chatMember = await bot.getChatMember(chatId, newMember.id);

            if (chatMember.status === 'member') {
                const checkMessage = getRandomPhrase(activeCheck).replace("{name}", memberTag);
                bot.sendMessage(chatId, checkMessage, { parse_mode: 'Markdown' });

                awaitingResponses[newMember.id].kickTimeout = setTimeout(async () => {
                    const chatMember = await bot.getChatMember(chatId, newMember.id);
                    if (chatMember.status === 'member') {
                        bot.kickChatMember(chatId, newMember.id);
                        bot.sendMessage(chatId, `${newMember.first_name}, давай, дружище, ты хотя бы поздоровайся!.`);
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

bot.onText(/\/помощь/, (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
    Ассаламу алейкум! Вот что я могу:
    1. Приветствую новых участников чата.
    2. Проверяю активность участников и напоминаю о себе, если ты долго не отвечаешь.
    3. Автоматически удаляю неактивных пользователей, если они не проявляют активности после вступления в чат.
    4. Отправляю благодарственные сообщения за активность.
    5. Фиксирую, когда участник покидает чат.
    6. Показываю цитаты Джейсона Стэтхема - /цитата.
    
    Если у тебя есть вопросы, пиши сюда!    
`;

    bot.sendMessage(chatId, helpMessage);
});

const stathamQuotes = [
    "Работа не волк. Никто не волк. Только волк — волк.",
    "Настоящий мужчина, как ковер тети Зины — с каждым годом лысеет.",
    "Мама учила не ругаться матом, но жизнь научила не ругаться матом при маме.",
    "Если закрыть глаза, становится темно.",
    "Если тебе где-то не рады в рваных носках, то и в целых туда идти не стоит.",
    "«Жи-ши» пиши от души.",
    "В Риме был, а папы не видал.",
    "Тут — это вам не там.",
    "Кто рано встает — тому весь день спать хочется.",
    "Если ты смелый, ловкий и очень сексуальный — иди домой, ты пьян.",
    "Сила – не в бабках. Ведь бабки – уже старые.",
    "Из проведённых 64-х боёв у меня 64 победы. Все бои были с тенью.",
    "Взял нож - режь, взял дошик - ешь.",
    "Я живу, как карта ляжет. Ты живёшь, как мамка скажет.",
    "Никогда не сдавайтесь, идите к своей цели и не забывайте, что победа — это не только цель, но и путь.",
    "Успех — это результат хорошей подготовки, тяжелой работы и обучения от неудач.",
    "Жизнь — это не просто проход через мясорубку, это шанс научиться.",
    "Секрет успеха — это работать над своим делом, даже когда никто не смотрит.",
    "Каждый из нас делает ошибки, важно извлекать уроки из них.",
    "Делайте то, что любите, и не забывайте о тех, кто был с вами на этом пути."
];

bot.onText(/\/цитата/, (msg) => {
    const chatId = msg.chat.id;
    const randomQuote = getRandomPhrase(stathamQuotes);
    bot.sendMessage(chatId, randomQuote);
});

bot.onText(/\/старт/, (msg) => {
    const chatId = msg.chat.id;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Помощь", callback_data: 'help' }],
                [{ text: "Цитата", callback_data: 'quote' }]
            ]
        }
    };
    
    bot.sendMessage(chatId, 'Выберите действие:', options);
});

bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;

    if (data === 'help') {
        bot.sendMessage(message.chat.id, `
Салам алейкум! Вот что я умею:
1. Приветствую новых участников чата.
2. Проверяю активность участников и напоминаю о себе, если ты долго не отвечаешь.
3. Автоматически удаляю неактивных пользователей, если они не проявляют активности после вступления в чат.
4. Отправляю благодарственные сообщения за активность.
5. Регистрирую, когда участник покидает чат.
6. Кидаю цитаты стетхема - /цитата
Если у тебя есть вопросы, пиши сюда!
        `);
    } else if (data === 'quote') {
        const randomQuote = getRandomPhrase(stathamQuotes);
        bot.sendMessage(message.chat.id, randomQuote);
    }
});


app.listen(PORT, () => {
    console.log(`Бот запущен на порту ${PORT}`);
});
