const express=require('express')
const app=express()
const connectDB=require('./config/db')
const Partners=require("./models/Partners")
const Customers=require('./models/Customers')
const bodyParser=require('body-parser')
const cors=require('cors')
const path = require('path');
const Grid = require('gridfs-stream')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcryptjs')
const PartnerUsers = require('./models/PartnerUsers')
const Groups = require('./models/Groups')
const mo=require('method-override')
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const mongoose=require('mongoose')
const Document=require("./models/Documents")
const { cursorTo } = require('readline')
const config=require('config')
const CustomerGroups = require('./models/CustomerGroups')
const CustomerQr=require("./models/CustomerQr")
const lastScannedQr=require('./models/LastScannedQr')
const { db } = require('./models/Partners')
connectDB()

// const mongouri='mongodb+srv://hector1902:Viennacity.123@cluster0.1fezuvb.mongodb.net/?retryWrites=true&w=majority'
// const conn=mongoose.createConnection(mongouri)
// let gfs

app.use(cors())
app.use(express.json())

const storage=multer.diskStorage({
    destination:'uploads',
    filename:(req,filename,cb) =>{
        cb(null,Date.now()+filename.originalname)
    }
})

const upload=multer({
    storage
}).single('filename')

app.get("/",(req,res) => {
    res.send('route working')
})

app.get("/partners",async(req,res) => {
    let partners=await Partners.find({})
    res.json({partners})
})

app.get("/partnerUsers",async(req,res) => {
    let partnerUsers=await PartnerUsers.find({})
    res.json({partnerUsers})
})

app.get("/groups",async(req,res) => {
    let groups=await Groups.find({})
    res.json({groups})
})

app.get("/customers/:id/groups",async(req,res) => {
    const customerId=req.params.id
    const customerGroups=await CustomerGroups.find({customerId})
    res.json({customerGroups})
})

app.get("/customers/:id/qr",async(req,res) => {
    const customerId=req.params.id
    const customerQrs=await CustomerQr.find({customerId})
    res.json({customerQrs})
})

app.get("/customers",async(req,res) => {
    let customers=await Customers.find({})
    res.json({customers})
})

app.get("/upload",async(req,res) => {
    const docs=await Document.find({})
    res.status(200).json({docs})
})


app.get("/upload/:id" ,async(req,res) => {
    const customerHash=req.params.id
    const doc=await Document.find({customerHash})
    res.json({doc})
})

app.get("/customerData",async(req,res) =>{
    var customers=await Customers.aggregate([
        {
            $lookup:{
                from:"customergroups",
                localField:"_id",
                foreignField:"customerId",
                as:"customerGroups"
            }
        },
        {
            $lookup:{
                from:"customerqrs",
                localField:"_id",
                foreignField:"customerId",
                as:"customerQrs"
            },
        },
        {
            $lookup:{
                from:"documents",
                localField:"_id",
                foreignField:"customerId",
                as:"customerDocs"
            },
        }
        
    ])
    res.json({customers})
})

app.post("/partnerUsers/signup",async(req,res) => {
    try {
        const {partnerUserEmail,mobile,partnerUid,partnerUserUid,password}=req.body
        let partnerUser=await PartnerUsers.findOne({partnerUserEmail})
        if(partnerUser){
            res.status(420).json({message:'user already exists'})
            return
        }
        partnerUser=new PartnerUsers({
            partnerUserEmail,mobile,partnerUserUid,partnerUid,password
        })
        const salt=await bcrypt.genSalt(10)
        partnerUser.password=await bcrypt.hash(password,salt)
        await partnerUser.save()
        res.status(200).json({message:'partnerUser successsfully registered'})
    } catch (error) {
        res.status(400).json({error:error.message})
    }
})

app.post("/partnerUsers/login",async(req,res) => {
    const {partnerUserUid,password}=req.body
    try {
        let partner=await PartnerUsers.find({partnerUserUid}) 
        if(!partner){
            res.status(400).json({message:'user not found'})
        }
        //res.json(partner[0].password)
        const validPassword=await bcrypt.compare(password,partner[0].password)
        if(!validPassword){
            res.status(400).json({message:'wrong password'})
        }

        const payload={
            loggedInPartnerUser:{
                id:partnerUserUid
            }
        }

        jwt.sign(payload,config.get("JWTSecret"),(err,token) => {
            if(err)
                console.log(err.message)
            res.status(200).json({token,message:'logged in successfully'})
        })

    } catch (error) {
        console.log(error)
        res.status(400).json({error:error.message})
    }
})


app.post("/partners",async(req,res) => {
    
    try {
        const {businessName,partnerUid,maxUsers,maxPartnerUsers,maxGroups}=req.body
        let partner=await Partners.findOne({partnerUid})
        if(partner){
            res.status(240).send('Partner already exists in db')
            return
        }
        partner=new Partners({businessName,partnerUid,maxUsers,maxPartnerUsers,maxGroups})
        await partner.save()
        res.json({message:'Partner saved successfully'})
    } catch (error) {
        res.json({error:error.message})
    }
})

app.post("/groups",async(req,res) => {
    
    try {
        const {groupName,partnerUid,groupDescription,startDate,endDate}=req.body
        let group=await Groups.findOne({groupName})
        if(group){
            res.status(240).send('group already exists in db')
            return
        }
        group=new Groups({groupName,partnerUid,groupDescription,startDate,endDate})
        group.startDate=new Date(startDate)
        group.endDate=new Date(endDate)

        await group.save()
        res.json({message:'group saved successfully'})
    } catch (error) {
        res.json({error:error.message})
    }
})

app.post("/upload",async(req,res) => {

    upload (req,res,(err) =>{
        if(err){
            console.log(err.message)
        }
        if(!req.body.customerId){
            res.json({'message':"user does not exist"})
        }
        else{
            const newDoc=new Document({
                customerHash:req.body.customerHash,
                description:req.body.description,
                name:req.body.name,
                document:{
                    data:req.file.filename,
                    contentType:'application/pdf'
                },
                customerId:req.body.customerId
            })
            newDoc.save()
            .then(() => res.send('success') )
            .catch(err => console.log(err.message))
        }
    })
})

app.post("/customers",async(req,res) => {
    const {name,address,dob,partnerUid,userUid,
            gender,childListUid,bloodGroup}=req.body
    const token=req.headers["x-auth-token"]
    const payload=jwt.verify(token,'Viennacity.123')
    
    const loggedInUser=await PartnerUsers.find({partnerUserUid:payload.loggedInPartnerUser.id})
    // res.json({loggedInUser})
    if(!loggedInUser){
        console.log('not authorized')
    }
    try {
        let customer=await Customers.find({userUid})
        
        customer=new Customers({
            name,address,dob,partnerUid,childListUid,userUid,gender,bloodGroup
        })
        await customer.save()
        res.status(200).json({message:'customer added',customer})
    } catch (error) {
        res.status(400).json({message:error.message})
    }
            
})

// app.put("/customers/:id/qrHash",async(req,res) => {
//     const {id,pin}=req.body
//     const userUid=req.params.id
//     try {
//         let customer=await Customers.findOne({userUid})
//         if(!customer){
//             res.status(400).json({message:'user does not exist'})
//         }
//         const qr={
//             id,
//             pin
//         }

//         await Customers.findOneAndUpdate({userUid},{$push:{qrStatus:qr}})
//         res.status(200).json({message:'qr updated successfully',customer})
//     } catch (error) {
//         res.json({error:error.message})
//     }
// })

app.put("/customers/:id/childList",async(req,res) => {
    const {childHash}=req.body
    const userUid=req.params.id
    const newChild={childHash}
    try {
        let customer=await Customers.findOne({userUid})
        if(!customer){
            res.status(400).json({message:'user does not exist'})
        }
        await Customers.findOneAndUpdate({userUid},{$push:{childList:newChild}})
        res.status(200).json({message:'childList updated successfully',customer})
    } catch (error) {
        res.json({error:error.message})
    }
})

// app.put("/customers/:id/groups",async(req,res) => {
//     const {groupName,groupId,destination,startDate,endDate}=req.body
//     const userUid=req.params.id
//     try {
//         let customer=await Customers.findOne({userUid})
//         if(!customer){
//             res.status(400).json({message:'user does not exist'})
//         }
//         const group={
//             groupName,
//             groupId,
//             destination,
//             startDate,
//             endDate
//         }
//         await Customers.findOneAndUpdate({userUid},{$push:{groups:group}})
//         res.status(200).json({message:'group updated successfully',customer})
//     } catch (error) {
//         res.json({error:error.message})
//     }
// })


//adding customer to a new group
app.post("/customers/:id/groups",async(req,res) => {
    const {groupName,groupId,groupDescription,partnerUid,startDate,endDate}=req.body
    const customerId=req.params.id
    try {
        const customerGroup=new CustomerGroups({
            customerId,groupId,groupName,groupDescription,partnerUid,startDate,endDate
        })
        await customerGroup.save()
        res.json({message:'customer added to a new group',customerGroup})
    } catch (error) {
        res.status(400).json({error:error.message})
    }
})

//assigning QR to customer
app.post("/customers/:id/qr",async(req,res) => {
    const customerId=req.params.id
    const {qrId,qrPin,lastScanned}=req.body
    try {
        const customerQr=new CustomerQr({
            customerId,qrId,qrPin,lastScanned
        })
        await customerQr.save()
        res.json({customerQr})
    } catch (error) {
        res.status(400).json({message:error.message})
    }
})

app.post("/lastScanned",async (req,res) => {
    const {
        userUid,childListUid,ip_address,latitude,longitude,
        qrcode,datetime,address,recipients,smstext,
        permission_given,timestamp
    }=req.body
    try {
        const userId=userUid+' '+childListUid
        const newLastScanned=new lastScannedQr({
            userId,ip_address,latitude,longitude,
            qrcode,datetime,address,recipients,smstext,
            permission_given,timestamp
        })
        await newLastScanned.save()
        res.json({newLastScanned})
    } catch (error) {
        res.status(400).json({error:error.message})
    }

})

app.listen(PORT=1902,() => {
    console.log("server started")
})