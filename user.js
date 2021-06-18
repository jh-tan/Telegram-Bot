const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    msgID: {
        type:String,
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
    }
})

userSchema.set('toJSON',{
    transform:(document,returnedObject)=>{
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})


module.exports = mongoose.model('User',userSchema)