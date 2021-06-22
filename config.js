require('dotenv').config()

const API_TOKEN = process.env.BOT_API_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
let MONGODB_URI = process.env.MONGODB_URI;


module.exports = {
	MONGODB_URI,
	API_TOKEN,
	CHAT_ID
}