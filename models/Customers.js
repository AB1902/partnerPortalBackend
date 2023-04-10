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
    },
    bloodGroup:{
        type:String,
    },
    dateRegistered:{
        type:String
    },
    portalId:{
        type:String
    },
    email:{
        type:String
    },
    mobile:{
        type:String
    },
    
    emergencyContactName1:{
        type:String
    },
    emergencyContactName2:{
        type:String
    },
    emergencyContactMobile1:{
        type:String
    },
    emergencyContactMobile2:{
        type:String
    }
    // emergencyContact1:{
    //     name:{
    //         type:String
    //     },
    //     contact:{
    //         type:String
    //     }
    // },
    // emergencyContact2:{
    //     name:{
    //         type:String
    //     },
    //     contact:{
    //         type:String
    //     }
    // },
})

module.exports=mongoose.model('Customer',customerSchema)