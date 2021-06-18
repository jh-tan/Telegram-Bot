require('dotenv').config()

const API_TOKEN = process.env.BOT_API_TOKEN;
let MONGODB_URI = process.env.MONGODB_URI;


module.exports = {
	MONGODB_URI,
	API_TOKEN
}