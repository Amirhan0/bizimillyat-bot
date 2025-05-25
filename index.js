require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN);
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = 3000;

bot.setWebHook(`https://bizimillyat-bot.onrender.com/${BOT_TOKEN}`)
    .then(() => console.log("Вебхук успешен"))
    .catch((err) => {
        console.error("Ошибка:", err);
        process.exit(1);
    });

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
;
bot.onText(/\/спроси (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userQuestion = match[1];

    await bot.sendMessage(chatId, 'Думаю...');

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'mistral/mistral-7b-instruct:free',
                messages: [{ role: "user", content: userQuestion }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const answer = response.data.choices[0].message.content;
        bot.sendMessage(chatId, answer);
    } catch (error) {
        console.error("Ошибка AI:", error?.response?.data || error);
        bot.sendMessage(chatId, "⚠️ Не удалось получить ответ от ИИ. Попробуй позже.");
    }
})

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
    const userId = leftMember.id;

    if (awaitingResponses[userId]) {
        clearTimeout(awaitingResponses[userId].timeout);
        clearTimeout(awaitingResponses[userId].kickTimeout);
        delete awaitingResponses[userId];
    }

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
    "Настоящий мужчина не плачет. Он идёт пить чай с вареньем.",
    "Не ошибается тот, кто ничего не делает. И даже он иногда ошибается.",
    "Чтобы добиться успеха, нужно вставать пораньше... и сразу ложиться обратно.",
    "Мудрость приходит с опытом, но иногда опыт приходит один.",
    "Знания — это сила. А сила — это возможность открыть банку огурцов.",
    "Лучше поздно, чем ещё позже.",
    "Если ты встал не с той ноги, то ляг обратно и попробуй ещё раз.",
    "Настоящий мужчина всегда знает, что хочет... и обязательно забывает об этом через минуту.",
    "Жизнь — это не только борьба, но и обеденный перерыв.",
    "Сложности закаляют характер... если ты, конечно, их пережил.",
    "Кто ищет смысл жизни, тот пропускает ужин.",
    "Если не можешь победить — притворись, что ты вообще не при делах.",
    "Успех — это когда ты забыл, что у тебя выходной, и пошёл на работу.",
    "Чтобы оставаться молодым, нужно просто не смотреть в паспорт.",
    "Сначала ты работаешь на репутацию, а потом она работает на тебя... если повезёт.",
    "Опыт — это то, что остаётся после того, как забудешь всё остальное.",
    "У кого не спрашивай, у всех «нормально».",
    "План был идеальный, но идеальность решила отдохнуть."
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
