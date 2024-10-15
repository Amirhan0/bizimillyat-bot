const telegramBot = require("node-telegram-bot-api")

const BOT_TOKEN = '7882038455:AAGjDAlwlQP2FO2WklvL7WxfjQcht34N7gE'

const bot = new telegramBot(BOT_TOKEN, {polling: true})

console.log('Бот запущен')

bot.on('polling-error', (error) =>  {
    console.error('Ошибка при запуске бота!', error)
})


function getRandomPhrase(phrases) {
    const randomIndex = Math.floor(Math.random() * phrases.length)
    return phrases[randomIndex]
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
        setTimeout(resolve, sec * 1000)
    })
}


bot.on('new_chat_members', async (msg) => {
    const newMember = msg.new_chat_member;
    const chatId = msg.chat.id

    await wait(5)
    const welcomeMessage = getRandomPhrase(greetings).replace("{name}", newMember.first_name)
    bot.sendMessage(chatId, welcomeMessage);
    setTimeout(async () => {
        const chatMember = await bot.getChatMember(chatId, newMember.id)

        if (chatMember.status === 'member') {
            const checkMessage = getRandomPhrase(activeCheck).replace("{name}", newMember.first_name)
            bot.sendMessage(chatId, checkMessage);
        }
    }, 300000)
})