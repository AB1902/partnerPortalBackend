const mongoose=require('mongoose')

const customerqrStatusSchema=new mongoose.Schema({
    //customerId
    customerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Customer',
        required:true
    },
    qrId:{
        type:String,
        required:true
    },
    qrPin:{
        type:String,
        required:true
    },
    // lastScanned:{
    //     type:String,
    // },

    //lastScanned: refer to firebase table
    //create lastScanned table with ref to firebase, capture all info
})

module.exports=mongoose.model('CustomerQr',customerqrStatusSchema)