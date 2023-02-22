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
    let partners=await Partners.find()
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

app.get("/customers",async(req,res) => {
    let customers=await Customers.find({})
    res.json({customers})
})

app.get("/upload",(req,res) => {
    res.send("file upload")
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
    try {
        res.send("route working")
    } catch (error) {
        res.status(400).json({error:'error.message'})
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
        if(!req.body.customerHash){
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
                }
            })
            newDoc.save()
            .then(() => res.send('success') )
            .catch(err => console.log(err.message))
        }
    })
})


app.post("/customers",async(req,res) => {
    const {name,address,dob,partnerUid,firebaseHash,
            gender}=req.body
            try {
                let customer=await Customers.find({firebaseHash})
                if(customer){
                    res.json({message:'customer already exists'})
                }
                customer=new Customers({
                    name,address,dob,partnerUid,firebaseHash,gender
                })
                await customer.save()
                res.status(200).json({message:'customer added',customer})
            } catch (error) {
                res.status(400).json({message:error.message})
            }
})

app.put("/customers/:id/qrHash",async(req,res) => {
    const {id,pin}=req.body
    const firebaseHash=req.params.id
    try {
        let customer=await Customers.findOne({firebaseHash})
        if(!customer){
            res.status(400).json({message:'user does not exist'})
        }
        const qr={
            id,
            pin
        }

        await Customers.findOneAndUpdate({firebaseHash},{$push:{qrStatus:qr}})
        res.status(200).json({message:'qr updated successfully',customer})
    } catch (error) {
        res.json({error:error.message})
    }
})

app.put("/customers/:id/childList",async(req,res) => {
    const {childHash}=req.body
    const firebaseHash=req.params.id
    const newChild={childHash}
    try {
        let customer=await Customers.findOne({firebaseHash})
        if(!customer){
            res.status(400).json({message:'user does not exist'})
        }
        await Customers.findOneAndUpdate({firebaseHash},{$push:{childList:newChild}})
        res.status(200).json({message:'childList updated successfully',customer})
    } catch (error) {
        res.json({error:error.message})
    }
})

app.put("/customers/:id/groups",async(req,res) => {
    const {groupName,groupId,destination,startDate,endDate}=req.body
    const firebaseHash=req.params.id
    try {
        let customer=await Customers.findOne({firebaseHash})
        if(!customer){
            res.status(400).json({message:'user does not exist'})
        }
        const group={
            groupName,
            groupId,
            destination,
            startDate,
            endDate
        }
        await Customers.findOneAndUpdate({firebaseHash},{$push:{groups:group}})
        res.status(200).json({message:'group updated successfully',customer})
    } catch (error) {
        res.json({error:error.message})
    }
})

app.listen(PORT=1902,() => {
    console.log("server started")
})