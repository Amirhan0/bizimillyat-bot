const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios"); // Импортируем axios для HTTP-запросов
const { HfInference } = require("@huggingface/inference"); // Измените эту строку
const BOT_TOKEN = '7882038455:AAGjDAlwlQP2FO2WklvL7WxfjQcht34N7gE';
const bot = new TelegramBot(BOT_TOKEN);
const inference = new HfInference("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");

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
async function getResponse(message) {
    try {
        const response = await inference.textGeneration({
            model: "EleutherAI/gpt-neo-1.3B",
            inputs: message,
            parameters: {
                max_length: 100,  // Ограничим длину ответа
                do_sample: true,
                temperature: 0.7, // Уменьшаем температуру для стабильности
            },
        });

        console.log('Response:', response); // Для отладки

        // Проверяем структуру ответа
        if (response && typeof response === 'object' && response.generated_text) {
            return response.generated_text; // Возвращаем сгенерированный текст
        } else {
            console.error('Unexpected response structure:', response);
            return "Извините, произошла ошибка при получении ответа.";
        }
    } catch (error) {
        console.error('Error fetching response:', error.message);
        return "Извините, произошла ошибка при получении ответа.";
    }
}

// Пример вызова функции
getResponse("Как ты").then(console.log).catch(console.error);

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
    "Эй, {name}, бизимлятьсясин? Дзавабаны гозлеик",
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
            const message = `Привет, ${userData.first_name}! Хардасын? Ики гюн сян охтурсун, бищейми олду?`;
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
Салам алейкум! Вот что я умею:
1. Приветствую новых участников чата.
2. Проверяю активность участников и напоминаю о себе, если ты долго не отвечаешь.
3. Автоматически удаляю неактивных пользователей, если они не проявляют активности после вступления в чат.
4. Отправляю благодарственные сообщения за активность.
5. Регистрирую, когда участник покидает чат.
6. Отвечаю на вопросы с использованием искусственного интеллекта.
7. Кидаю цитаты стетхема - /цитата
Если у тебя есть вопросы, пиши сюда!
`;

    bot.sendMessage(chatId, helpMessage);
});

// Команда /ai
bot.onText(/\/ai (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userInput = match[1]; // Получаем текст после /ai

    try {
        const aiResponse = await getAIResponse(userInput);
        bot.sendMessage(chatId, aiResponse);
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "Произошла ошибка при обработке вашего запроса.");
    }
});

// Массив цитат
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

// Команда /цитата
bot.onText(/\/цитата/, (msg) => {
    const chatId = msg.chat.id;
    const randomQuote = getRandomPhrase(stathamQuotes);
    bot.sendMessage(chatId, randomQuote);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Бот запущен на порту ${PORT}`);
});
