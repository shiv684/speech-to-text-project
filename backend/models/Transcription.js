
const mongoose=require("mongoose");
const transcriptionSchema=new mongoose.Schema({

    audioName:{
        type:String,
        required:true
    },
     transcription: {
        type: String,
        required: true
    }

})
module.export=mongoose.model("Transcription",trascriptionSchema);