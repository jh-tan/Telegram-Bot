const config = require('./config')
const logger = require('./logger')
const mongoose = require('mongoose')
const User = require('./user')


const TelegramBot = require('node-telegram-bot-api');

logger.info('Connecting to',config.MONGODB_URI)


mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
.then(result=>{ logger.info('Connected to MongoDB') })
.catch(error=>{ logger.error('error connecting to MongoDB:', error.message) })

// replace the value below with the Telegram token you receive from @BotFather
let getMatch = null

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(config.API_TOKEN, {polling: true});

bot.onText(/\/start/, async (msg) => {
	//if db don have the chat id

	const currentUser = await User.findOne({msgID:msg.chat.id})

	if(currentUser && currentUser.matchWith !== ""){
		bot.sendMessage(msg.chat.id, "BOT: You can only match with one person at a time")
		return;
	}

	const user = await User.exists({msgID:msg.chat.id})
	if(!user) getStarted(msg)
	else{
		await User.findOneAndUpdate({msgID:msg.chat.id},
				      {$set:{matchWith: "",state:true }},
				      {new:true})
		bot.sendMessage(msg.chat.id, "BOT: Finding your friend...")
		search = true
		matchUser(msg)
	}
});

bot.onText(/\/end/, async (msg) => {
	// const user = await User.exists({msgID:msg.chat.id})
	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(currentUser !== null && currentUser.matchWith !== ""){
		await User.findOneAndUpdate({msgID:msg.chat.id},
				      {$set:{matchWith: "",state:false }},
				      {new:true})

		await User.findOneAndUpdate({msgID:currentUser.matchWith},
				      {$set:{matchWith: "",state:false }},
				      {new:true})
		

		bot.sendMessage(msg.chat.id, "BOT: You ended the chat")
		bot.sendMessage(currentUser.matchWith, "BOT: The person just leave the chat")
	} 
	else{
		bot.sendMessage(msg.chat.id,"BOT: You are not matching with anyone")
	}
});

bot.onText(/\/stop/, async (msg) =>{
	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(currentUser != null &&currentUser.matchWith === "" && currentUser.state){
		await User.findOneAndUpdate({msgID:msg.chat.id},
				      {$set:{matchWith: "",state:false }},
				      {new:true})
		bot.sendMessage(msg.chat.id, "BOT: Stop finding friend..")
	}
})

// Listen for any kind of message. There are different kinds of // messages.
bot.on('message', async (msg) => {
// send a message to the chat acknowledging receipt of their message

	if (msg.text === '/start' || msg.text === '/end' || msg.text === '/stop'){
		return
	}

	if(msg.text === 'Male' || msg.text === 'Female'){

		const user = new User ({
			msgID:msg.chat.id,
			gender:msg.text,
			state:true,
			matchWith: ""
		})

		user.save().then(result => {
			console.log('user saved!')
		})
		bot.sendMessage(msg.chat.id, "BOT: Finding your friend....", {
			parse_mode: 'HTML',
			reply_markup: { remove_keyboard: true },
		});
		matchUser(msg)
	}

	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(currentUser!== null && currentUser.matchWith !== "")
		bot.sendMessage(currentUser.matchWith,"User: " + msg.text)


});

const getStarted = (msg) =>{
	bot.sendMessage(msg.chat.id,
		`This bot was inspired by the NUS Chat Bot and is used to provide opportunities for
		 the student to meet new friends or even find a spouse. Just type /start to start
		 to look for a person to chat with, /end to end the chat and /stop to stop looking
		 for a chat.
		`
	)
	const opts = {
		reply_to_message_id: msg.message_id,
		reply_markup: JSON.stringify({
			keyboard: [
				['Male'],
				['Female']
			]
		})
	};
	bot.sendMessage(msg.chat.id, 'BOT: Are you Male or Female', opts);
}

const matchUser = async (msg) =>{
	getMatch = await User.findOne({msgID:{$ne:msg.chat.id},state:true,matchWith:""})
	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(getMatch !==null){
		await User.findOneAndUpdate({msgID:getMatch.msgID},
				      {$set:{matchWith: msg.chat.id }},
				      {new:true})

		await User.findOneAndUpdate({msgID:msg.chat.id},
				      {$set:{matchWith: getMatch.msgID }},
				      {new:true})


		bot.sendMessage(msg.chat.id , `BOT: Found a match! [${getMatch.gender}]`)
		bot.sendMessage(getMatch.msgID , `BOT: Found a match! [${currentUser.gender}]`)

	}
}

bot.on('polling_error', (err) => console.log(err))

