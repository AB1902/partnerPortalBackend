const mongoose=require('mongoose')

const partnerUserSchema=new mongoose.Schema({
    partnerUserEmail:{
        type:String,
        required:true
    },
    partnerUid:{
        type:String,
        required:true
    },
    partnerUserUid:{
        type:String,
        required:true
    },
    mobile:{
        type:String
    },
    password:{
        type:String,
        required:true
    },
    type:{
        type:String,
    }
})

module.exports=mongoose.model('PartnerUser',partnerUserSchema)