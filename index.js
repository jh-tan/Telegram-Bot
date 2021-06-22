const express = require('express');
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

let bot

if (process.env.NODE_ENV === 'production'){
	bot = new TelegramBot(config.API_TOKEN,{onlyFirstMatch:true})
	bot.setWebHook(process.env.HEROKU_URL+bot.token);
}
else{
	bot = new TelegramBot(config.API_TOKEN, {polling : true, onlyFirstMatch:true})
}

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Hello World!'));

app.post('/' + bot.token, (req, res) => {
	bot.processUpdate(req.body);
	res.sendStatus(200);
});

app.listen(process.env.PORT);

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
		matchUser(msg)
	}
});

bot.onText(/\/nopic/, async (msg)=>{

	await User.findOneAndUpdate({msgID:msg.chat.id},
				      {$set:{nopic:true }},
				      {new:true})

})

bot.onText(/\/end/, async (msg) => {
	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(currentUser !== null && currentUser.matchWith !== ""){
		await User.findOneAndUpdate({msgID:msg.chat.id},
				      {$set:{matchWith: "",state:false,nopic:false }},
				      {new:true})

		await User.findOneAndUpdate({msgID:currentUser.matchWith},
				      {$set:{matchWith: "",state:false,nopic:false }},
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
				      {$set:{matchWith: "",state:false,nopic:false }},
				      {new:true})
		bot.sendMessage(msg.chat.id, "BOT: Stop finding friend..")
	}
})

bot.onText(/\/report (.+)/, (msg, match) => {
	// 'msg' is the received Message from Telegram
	// 'match' is the result of executing the regexp above on the text content
	// of the message
  
	const resp = match[1]; // the captured "whatever"
  
	// send back the matched "whatever" to the chat
	bot.sendMessage(config.CHAT_ID, resp);
  });

bot.onText(/Male|Female/, async (msg)=>{

		const user = new User ({
			msgID:msg.chat.id,
			gender:msg.text,
			state:true,
			matchWith: "",
			nopic:false
		})

		await user.save()
		console.log('user saved!')

		bot.sendMessage(msg.chat.id, "BOT: Finding your friend....", {
			parse_mode: 'HTML',
			reply_markup: { remove_keyboard: true },
		});
		matchUser(msg)
})

// Listen for any kind of message. There are different kinds of // messages.
bot.onText(/(.+)/, async (msg) => {
// send a message to the chat acknowledging receipt of their message
	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(currentUser!== null && currentUser.matchWith !== ""){
		if(bot.sendChatAction(currentUser.matchWith,"typing"))
			bot.sendMessage(currentUser.matchWith,"User: " + msg.text)
	}
});


bot.on('photo', async (msg)=>{

	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(currentUser!== null && currentUser.matchWith !== ""){
		const currentMatch = await User.findOne({msgID:currentUser.matchWith})
		// Example online user reverse()
		// bot.sendPhoto(currentUser.matchWith, msg.photo.reverse()[0].file_id)
		if(currentMatch.nopic)
			bot.sendMessage(msg.chat.id, "BOT: The user had set to no pic mode")
		else
			bot.sendPhoto(currentUser.matchWith,msg.photo[0].file_id,{caption:msg.caption})
	}
})

bot.on('animation', async (msg)=>{
	const currentUser = await User.findOne({msgID:msg.chat.id})
	if(currentUser!== null && currentUser.matchWith !== ""){

		const currentMatch = await User.findOne({msgID:currentUser.matchWith})
		// Example online user reverse()
		// bot.sendPhoto(currentUser.matchWith, msg.photo.reverse()[0].file_id)
		if(currentMatch.nopic)
			bot.sendMessage(msg.chat.id, "BOT: The user had set to no pic mode")
		else
			bot.sendDocument(currentUser.matchWith, msg.document.file_id);
	}

})

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
	let match = false
	while(!match){
		const session = await mongoose.startSession()
		session.startTransaction()
		const getMatch = await User.findOne({msgID:{$ne:msg.chat.id},state:true,matchWith:""})
		const currentUser = await User.findOne({msgID:msg.chat.id})
		try{
			if(getMatch !==null){
				if((currentUser.matchWith === "" && getMatch.matchWith === "") && 
				(currentUser.state === true && getMatch.state === true)){
					await User.findOneAndUpdate({msgID:getMatch.msgID},
						{$set:{matchWith: msg.chat.id,state:false }},
						{new:true,session:session})
						
					await User.findOneAndUpdate({msgID:msg.chat.id},
						{$set:{matchWith: getMatch.msgID,state:false }},
						{new:true,session:session})

					await session.commitTransaction();

					bot.sendMessage(msg.chat.id , `BOT: Found a match! [${getMatch.gender}]`)
					bot.sendMessage(getMatch.msgID , `BOT: Found a match! [${currentUser.gender}]`)
					match = true
					return
				}
				else{
					await session.abortTransaction();
				}
			}
		}catch(err){
			await session.abortTransaction();
		}
	}
}
			
bot.on('polling_error', (err) => console.log(err))


