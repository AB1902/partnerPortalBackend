const mongoose=require('mongoose')

const groupSchema=new mongoose.Schema({
    groupName:{
        type:String,
        required:true
    },
    partnerUid:{
        type:String,
        required:true
    },
    groupDescription:{
        type:String,
        required:true
    },
    startDate:{
        type:Date
    },
    endDate:{
        type:Date
    }
})

module.exports=mongoose.model('Group',groupSchema)