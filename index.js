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
    "Никогда не сдавайтесь, идите к своей цели! А если будет сложно – сдавайтесь.",
    "Если заблудился в лесу, иди домой.",
    "Запомни: всего одна ошибка – и ты ошибся. Я вообще делаю что хочу. Хочу импланты — звоню врачу.",
    "В жизни всегда есть две дороги: одна — первая, а другая — вторая.",
    "Мы должны оставаться мыми, а они – оними.",
    "Делай, как надо. Как не надо, не делай.",
    "Сниму квартиру. Порядок на районе гарантирую.",
    "Работа — это не волк. Работа — ворк. А волк — это ходить.",
    "Не будьте эгоистами, в первую очередь думайте о себе!",
    "Марианскую впадину знаешь? Это я упал.",
    "Как говорил мой дед, «Я твой дед».",
    "Без подошвы тапочки — это просто тряпочки.",
    "Слово - не воробей. Вообще ничто не воробей, кроме самого воробья.",
    "Жи-ши пиши от души.",
    "Если тебе где-то не рады в рваных носках, то и в целых туда идти не стоит.",
    "Работа не волк. Никто не волк. Только волк волк.",
    "Если вы спросите у Чака Норриса: «Который час?», он всегда ответит: «Две секунды до». После того как вы спросите: «Две секунды до чего?», вы получите знаменитый удар ногой по лицу с разворота.",
    "Нет никакой теории эволюции Дарвина. Есть список существ, которых Чак Норрис пощадил.",
    "Чак Норрис может убить два камня одной птицей.",
    "Чак Норрис не здоров как бык, это бык здоров как Чак Норрис.",
    "Чак Норрис может захлопнуть вращающуюся дверь.",
    "Чак Норрис прислал повестку военкомату.",
    "Чак Норрис использует дублёров только для съёмки сцен, где его герой плачет.",
    "Чак Норрис однажды задушил бандита беспроводным телефоном.",
    "Когда родителям Чака Норриса снились кошмары, они приходили к нему в спальню.",
    "В «Парке Юрского периода» тиранозавр не гнался за джипом: он убегал от Чак Норриса.",
    "Чак Норрис - единственный артист в мире, кто отказался выступать на корпоративе «Газпрома».",
    "Чак Норрис может выжать апельсиновый сок из лимона.",
    "У Чака Норриса нет часов, он сам решает, сколько сейчас времени.",
    "Чак Норрис не пользуется полотенцем, вода сама убегает с его тела.",
    "Когда Чак Норрис тренируется, тренажёр становится сильнее.",
    "Чак Норрис вызывает у сигарет рак.",
    "Чак Норрис может довести до оргазма резиновую женщину.",
    "Когда Чак Норрис бросает бумеранг, тот не возвращается."
];

bot.onText(/\/цитата/, (msg) => {
    const chatId = msg.chat.id;
    const randomQuote = getRandomPhrase(stathamQuotes);
    bot.sendMessage(chatId, randomQuote);
});
app.listen(PORT, () => {
    console.log(`Бот запущен на порту ${PORT}`);
});
