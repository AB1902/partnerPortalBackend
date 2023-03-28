const mongoose=require('mongoose')

const partnerSchema=new mongoose.Schema({
    businessName:{
        type:String,
        required:true
    },
    partnerUid:{
        type:String,
        required:true
    },
    maxUsers:{
        type:String
    },
    maxPartnerUsers:{
        type:String
    },
    maxGroups:{
        type:String
    },
    type:{
        type:String
    }
})

module.exports=mongoose.model('Partner',partnerSchema)