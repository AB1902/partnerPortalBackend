const mongoose=require('mongoose')

const documentSchema=new mongoose.Schema({
    
    customerHash:{
        type:String,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId
    },
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    document:{
        data:Buffer,
        contentType:String
    },
    timeStamp:{
        type:Date,
        default:Date.now()
    }
    
})

module.exports=mongoose.model('Document',documentSchema)