
const express=require("express");
const cors=require("cors");
const multer=require("multer");


const app=express();

app.use(cors());
app.use(express.json());





const storage=multer.diskStorage({

    // file kha save hogi
    destination:(req,file,cb) =>{
        cb(null,"uploads/");

    },

    // file ka kya naam hoga

    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+file.orginalname);
    }

})

// multer activate

const upload=multer({storage});

const PORT=3000;

// home route

app.get("/",(req,res)=>{
    res.send("backend is runing")

});

// upload route

app.post("/upload",upload.single("audio"),(req,res)=>{
    res.json({
        "message":"upload successfully",
        file:req.file

    });
});

const mongoose=require("mongoose");
require("dotenv").config();
mongoose.connect(process.env.MONGO_URI)
.then(()=>{
    console.log("monhodb connected");
})

.catch((err)=>{
    console.log(err);

})

app.listen(PORT,()=>{
    console.log(`server is running  on port ${PORT}`);

})

