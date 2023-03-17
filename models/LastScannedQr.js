const mongoose=require('mongoose')

const lastScannedQr=new mongoose.Schema({
    //customerId
    customerId:{
        type:mongoose.Schema.ObjectId,
        required:true
    },
    userId:{
        type:String,
        required:true
    },
    ip_address:{
        type:String,
        required:true
    },
    latitude:{
        type:String,
        required:true
    },
    longitude:{
        type:String,
        required:true
    },
    qrcode:{
        type:String,
        required:true
    },
    datetime:{
        type:Date,
        required:true
    },
    address:{
        type:String
    },
    recipients:{
        type:String
    },
    smstext:{
        type:String
    },
    permission_given:{
        type:String
    },
    timestamp:{
        type:String
    }
    //lastScanned: refer to firebase table
    //create lastScanned table with ref to firebase, capture all info
})

module.exports=mongoose.model('LastScanned',lastScannedQr)