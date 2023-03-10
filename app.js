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
const csv=require('csvtojson')
connectDB()

// const mongouri='mongodb+srv://hector1902:Viennacity.123@cluster0.1fezuvb.mongodb.net/?retryWrites=true&w=majority'
// const conn=mongoose.createConnection(mongouri)
// let gfs

app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static(path.resolve(__dirname,'public')))

const storage=multer.diskStorage({
    destination:'uploads',
    filename:(req,filename,cb) =>{
        cb(null,Date.now()+filename.originalname)
    }
})

 var customerStorage=multer.diskStorage({
    destination:(req,file,cb) => {
        cb(null,'./public/customerUploads')
    },
    filename:(req,file,cb) => {
        cb(null,file.originalname)
    }
})

const customerUpload=multer({storage:customerStorage})

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

app.delete("/doc/:id",async(req,res) => {
    const _id=(req.params.id)
    Document.findByIdAndDelete(_id)
    .then(result => {
        res.json({result,deleted:true})
    }).catch(err => {
        res.json({error:err.message})
    })

})

app.delete("/qr/:id",async(req,res) => {
    const id=(req.params.id)
    CustomerQr.findByIdAndDelete(id)
    .then(result => {
        res.json({result,deleted:true})
    }).catch(err => {
        res.json({error:err.message})
    })

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
        },
        {
            $lookup:{
                from:"lastscanneds",
                localField:"_id",
                foreignField:"customerId",
                as:"lastScanned"
            },
        }
        
    ])
    res.json({customers})
})

app.get("/customerData/new",async(req,res) =>{
    const page=parseInt(req.query.page)
    const limit=parseInt(req.query.limit)
    const startIndex=(page-1)*limit
    const endIndex=page*limit

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
        },
        {
            $lookup:{
                from:"lastscanneds",
                localField:"_id",
                foreignField:"customerId",
                as:"lastScanned"
            },
        }
        
    ])

    const results={}
    if(startIndex>0){
    results.next={
        page:page+1,
        limit:limit,
        
    }}
    if(endIndex<customers.length){
    results.previous={
        page:page-1,
        limit:limit,
        
    }}
    results.total=customers.length
    results.customers=customers.slice(startIndex,endIndex)
    res.json({results})
})

//filter route
app.post("/customerData/filter",async(req,res) =>{
    const {groupSelect,groupAssigned,qrAssigned,docsAssigned,qrScanData}=req.body
    console.log(groupSelect,groupAssigned,qrAssigned,docsAssigned,qrScanData)
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
        },
        {
            $lookup:{
                from:"lastscanneds",
                localField:"_id",
                foreignField:"customerId",
                as:"lastScanned"
            },
        }
        
    ])
   
    let filteredData=[]
    if(groupSelect!=='All'){
    customers.forEach(customer =>{
        customer.customerGroups.forEach(group =>{
            if(group.groupName===groupSelect)
                filteredData.push(customer)
        })
        if(groupAssigned==='Yes'){
            filteredData=filteredData.filter((data) => {
                if(data.customerGroups.length>0)
                    return data
            })
        }else if(groupAssigned=='No'){
            filteredData=filteredData.filter((data) => {
                if(data.customerGroups.length===0)
                    return data
            })
        }
        if(qrAssigned==='Yes'){
            filteredData=filteredData.filter((data) => {
                if(data.customerQrs.length>0)
                    return data
            })
        }else if(qrAssigned=='No'){
            filteredData=filteredData.filter((data) => {
                if(data.customerQrs.length===0)
                    return data
            })
        }
        if(docsAssigned==='Yes'){
            filteredData=filteredData.filter((data) => {
                if(data.customerDocs.length>0)
                    return data
            })
        }else if(docsAssigned=='No'){
            filteredData=filteredData.filter((data) => {
                if(data.customerDocs.length===0)
                    return data
            })
        }
        if(qrScanData==='Yes'){
            filteredData=filteredData.filter((data) => {
                if(data.lastScanned?.length>0)
                    return data
            })
        }else if(qrScanData=='No'){
            filteredData=filteredData.filter((data) => {
                if(data.lastScanned?.length===0)
                    return data
            })
        }
    })
    }
    else{
        if(groupAssigned==='Yes'){
            customers.forEach(customer => {
                if(customer.customerGroups.length>0)
                    filteredData.push(customer)
            })
            if(qrAssigned==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerQrs.length>0)
                        return data
                })
            }else if(qrAssigned=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerQrs.length===0)
                        return data
                })
            }
            if(docsAssigned==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length>0)
                        return data
                })
            }else if(docsAssigned=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length===0)
                        return data
                })
            }
            if(qrScanData==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length>0)
                        return data
                })
            }else if(qrScanData=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length===0)
                        return data
                })
            }
        }
        else if(groupAssigned==='No'){
            customers.forEach(customer => {
                if(customer.customerGroups.length===0)
                    filteredData.push(customer)
            })
            if(qrAssigned==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerQrs.length>0)
                        return data
                })
            }else if(qrAssigned=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerQrs.length===0)
                        return data
                })
            }
            if(docsAssigned==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length>0)
                        return data
                })
            }else if(docsAssigned=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length===0)
                        return data
                })
            }
            if(qrScanData==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length>0)
                        return data
                })
            }else if(qrScanData=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length===0)
                        return data
                })
            }
        }
        else if(qrAssigned==='Yes'){
            customers.forEach(customer => {
                if(customer.customerQrs.length>0)
                    filteredData.push(customer)
            })
            if(docsAssigned==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length>0)
                        return data
                })
            }else if(docsAssigned=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length===0)
                        return data
                })
            }
            if(qrScanData==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length>0)
                        return data
                })
            }else if(qrScanData=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length===0)
                        return data
                })
            }
        }
        else if(qrAssigned==='No'){
            customers.forEach(customer => {
                if(customer.customerQrs.length===0)
                    filteredData.push(customer)
            })
            if(docsAssigned==='Yes'){   
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length>0)
                        return data
                })
            }else if(docsAssigned=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.customerDocs.length===0)
                        return data
                })
            }
            if(qrScanData==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length>0)
                        return data
                })
            }else if(qrScanData=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length===0)
                        return data
                })
            }
        }
        else if(docsAssigned==='Yes'){
            customers.forEach(customer => {
                if(customer.customerDocs.length>0)
                    filteredData.push(customer)
            })
            if(qrScanData==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length>0)
                        return data
                })
            }else if(qrScanData=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length===0)
                        return data
                })
            }
        }
        else if(docsAssigned==='No'){
            customers.forEach(customer => {
                if(customer.customerDocs.length===0)
                    filteredData.push(customer)
            })
            if(qrScanData==='Yes'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length>0)
                        return data
                })
            }else if(qrScanData=='No'){
                filteredData=filteredData.filter((data) => {
                    if(data.lastScanned?.length===0)
                        return data
                })
            }
        }
        else if(qrScanData==='Yes'){
            customers.forEach(customer => {
                if(customer.lastScanned.length>0)
                    filteredData.push(customer)
            })
        }
        else if(qrScanData==='No'){
            customers.forEach(customer => {
                if(customer.lastScanned.length===0)
                    filteredData.push(customer)
            })
        }
    } 
    console.log(filteredData)

    res.json({filteredData})
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


//add many customers to already exitsing group
app.post("/groupsAddMany",async(req,res) => {
    
    const {groupName,groupId,groupDescription,partnerUid,startDate,endDate}=req.body
    const dataArr=req.body.dataArr
    try {
        dataArr.forEach(async(data) => {
            if(data.isChecked===true)
            {
                const customergroup=new CustomerGroups({customerId:data._id,
                groupName,groupId,groupDescription,partnerUid,startDate,endDate})
                await customergroup.save()
            }    
        }
        )
        res.json({message:'customers added'})
    } catch (error) {
        res.json({error:error.message})
    }
})

//add multiple customers to a newly created group
app.post("/createGroupAddMultiCustomer",async (req,res) => {

    try{
        const {groupName,groupDescription,startDate,endDate}=req.body
        const dataArr=req.body.dataArr
        const partnerUid='7ocUlGvJ22l4O1gbfg0p'
        let group=new Groups({groupName,groupDescription,partnerUid,startDate,endDate})
        group.startDate=new Date(startDate)
        group.endDate=new Date(endDate)

        await group.save()
        // console.log(group._id)
        // res.json({group})
        const groupId=group._id

        dataArr.forEach(async(data) => {
            if(data.isChecked===true){
                try {
                    const customerGroup=new CustomerGroups({
                        customerId:data._id,groupId,groupName,groupDescription,partnerUid,startDate,endDate
                    })
                    await customerGroup.save()
                    
                } catch (error) {
                    console.log(error.message)
                }
            }
        })
        
        res.json({message:'group created and customers added',group})
    }
    catch(error){
        res.json({error:error.message})
    }
})

//add a single customer to a new group
app.post("/createGroupAddCustomer/:id",async (req,res) => {
    const customerId=req.params.id
    try{
        const {groupName,groupDescription,startDate,endDate}=req.body
        const partnerUid='7ocUlGvJ22l4O1gbfg0p'
        let group=new Groups({groupName,groupDescription,partnerUid,startDate,endDate})
        group.startDate=new Date(startDate)
        group.endDate=new Date(endDate)

        await group.save()
        // console.log(group._id)
        // res.json({group})
        const groupId=group._id
        try {
            const customerGroup=new CustomerGroups({
                customerId,groupId,groupName,groupDescription,partnerUid,startDate,endDate
            })
            await customerGroup.save()
            
        } catch (error) {
            console.log(error.message)
        }
        res.json({message:'group created and customer added',group})
    }
    catch(error){
        res.json({error:error.message})
    }
})

//upload a doucment to a single customer
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

//upload a doucment to multiple customers
app.post("/uploadToMultiCustomers",async(req,res) => {
    
    upload (req,res,(err) =>{
        if(err){
            console.log(err.message)
        }
        else{
            const dataArr=JSON.parse(req.body.dataArr)
            //console.log(dataArr)
            dataArr.forEach(async(data) => {
               if(data.isChecked===true){
                const newDoc=new Document({
                    description:req.body.description,
                    name:req.body.name,
                    document:{
                        data:req.file.filename,
                        contentType:'application/pdf'
                    },
                    customerId:data._id
                })
                await newDoc.save().then((res) => console.log(res)).catch(err=>console.log(err.message))
               }
            })
        }
    })
})

//upload a single customer
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

//upload multiple customers through excel
app.post("/uploadMultipleCustomers",customerUpload.single('filename'),async(req,res) =>{
    try {
        let customers=[]
        csv().fromFile(req.file.path).then(async(res) => {
            for(let i=0;i<res.length;i++){
                customers.push({
                    name:res[i].name,
                    address:res[i].address,
                    dob:new Date(res[i].dob),
                    partnerUid:res[i].partnerUid,
                    userUid:res[i].userUid,
                    childListUid:res[i].childListUid,
                    gender:res[i].gender,
                    bloodGroup:res[i].bloodGroup,
                })
            }
            await Customers.insertMany(customers)
        })
        
        res.json({message:'customers imported to db'})
    } catch (error) {
        res.json({error:error.message})
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



// app.delete("/doc/:id",async(req,res) => {
//     const _id=JSON.stringify(req.params.id)
//     const doc=Document.findById(_id)
//     if(!doc)
//         res.send("doc not found")
//     res.send(doc)
// })

app.delete("/customer/:id",async(req,res) => {
    const customerId=req.params.id
    try {
        
        await CustomerGroups.deleteMany({customerId})
        await CustomerQr.deleteMany({customerId})
        await Document.deleteMany({customerId})
        await lastScannedQr.deleteMany({customerId})
        await Customers.findByIdAndDelete(customerId)
        .then(result => {
            res.json({result,deleted:true})
        }).catch(err => {
            console.log(err.message)
        })
    }catch (error) {
        res.json({error:error.message})
    }
    
})

app.listen(PORT=1902,() => {
    console.log("server started")
})