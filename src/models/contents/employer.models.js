import mongoose from "mongoose";

const employerSchema = new mongoose.Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required: true 
    },
    name : {
        type :  String,
        required : true,
        trim : true 
    },
    companySize : {
        type : String,
        required : true,
        trim : true
    },
    industry : {
        type : String,
        required : true,
        trim: true
    },
    websiteLink:{
        type : String,
        required : true,
        trim : true
    }
},
{
    timestamps: true
})

export const Employer = mongoose.model('Employer' , employerSchema)