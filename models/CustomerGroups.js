const mongoose=require('mongoose')

const customerGroupsSchema=new mongoose.Schema({
    
    // userUid:{
    //     type:String,
    //     required:true
    // },
    // childListUid:{
    //     type:String,
    //     required:true
    // },
    customerId:{
        type:mongoose.Schema.ObjectId,
        ref:'Customer',
        required:true
    },
    //add groupId
    groupId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Groups',
        required:true
    },

    groupName:{
        type:String,
        required:true
    },
    groupDescription:{
        type:String,
        
    },
    partnerUid:{
        type:String
    },
    startDate:{
        type:Date
    },
    endDate:{
        type:Date
    }
    
})

module.exports=mongoose.model('CustomerGroup',customerGroupsSchema)