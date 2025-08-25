import mongoose from "mongoose";

const supportSchema = new mongoose.Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User'
    },
    employerQueries :{
        type : Number,
        default : 0
    },
    studentQueries :{
        type : Number,
        default : 0
    },
    schoolQueries :{
        type : Number,
        default : 0
    },
    isReplied : {
        type : Boolean,
        default : false 
    }
},
{
    timestamps : true
})

export const Support = mongoose.model('Support' , )