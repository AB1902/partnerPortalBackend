const mongoose=require('mongoose')
const config=require('config')
const db=config.get("mongoURI")
const {GridFsStorage }= require("multer-gridfs-storage");


const connectDB=async() => {
    try {
        await mongoose.connect(db,{

        })
        console.log("db connected")
    } catch (error) {
        console.log(error)
    }
    let bucket
    mongoose.connection.on('connected',() => {
        var db = mongoose.connections[0].db;
        bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: "newBucket"
        })
        console.log(bucket)
    })

}

module.exports =connectDB