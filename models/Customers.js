const mongoose=require('mongoose')

const customerSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    address:{
        type:String
    },
    dob:{
        type:Date,
        required:true
    },
    partnerUid:{
        type:String,
        required:true
    },
    userUid:{
        type:String,
        required:true
    },
    childListUid:{
        type:String,
        required:true
    },
    gender:{
        type:String,
        required:true
    },
    bloodGroup:{
        type:String,
        required:true
    },
    // qrStatus:[
    // {
    //     id:{
    //         type:String,
    //         required:true
    //         },
    //         pin:{
    //             type:String,
    //             required:true
    //         },
    //         lastScanned:{
    //             type:Date
    //         }
    // }
               
    // ],
    // groups:
    //     [
    //         {
    //             groupName:{
    //                 type:String,
    //                 required:true
    //             },
    //             groupId:{
    //                 type:mongoose.Types.ObjectId,
    //                 ref:'Group',
    //             },
    //             destination:{
    //                 type:String,
    //                 required:true
    //             },
    //             startDate:{
    //                 type:Date,
    //                 required:true
    //             },
    //             endDate:{
    //                 type:Date,
    //                 required:true
    //             }
    //         }
    //     ]
    // ,
    // childList:
    // [
    //     {
    //         childHash:{
    //             type:String,
    //             required:true
    //         }
    //     }
            
    // ]
    
   
})

module.exports=mongoose.model('Customer',customerSchema)