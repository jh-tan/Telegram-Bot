const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const userSchema = new mongoose.Schema({
    msgID: {
        type:String,
        unique: true,
        required:true,
    },
    gender:{
        type:String,
        required:true
    },
    state:{
	 type:Boolean
    },
    matchWith:{
	    type:String,
    },
    nopic:{
        type:Boolean
    }
})

userSchema.set('toJSON',{
    transform:(document,returnedObject)=>{
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})
userSchema.plugin(uniqueValidator)


module.exports = mongoose.model('User',userSchema)