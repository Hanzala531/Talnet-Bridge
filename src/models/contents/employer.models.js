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
    description: {
        type: String,
        trim: true,
        maxLength: 1000
    },
    companySize : {
        type : String,
        required : true,
        trim : true,
        // enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]
    },
    industry : {
        type : String,
        required : true,
        trim: true
    },
    websiteLink:{
        type : String,
        required : true,
        trim : true,
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Website must be a valid URL'
        }
    },
    location: {
        type: String,
        trim: true
    },
    establishedYear: {
        type: Number,
        min: 1800,
        max: new Date().getFullYear()
    },
    totalEmployees: {
        type: Number,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes for performance
employerSchema.index({ userId: 1 });
employerSchema.index({ name: 1 });
employerSchema.index({ industry: 1 });
employerSchema.index({ companySize: 1 });
employerSchema.index({ location: 1 });
employerSchema.index({ verified: 1 });

export const Employer = mongoose.model('Employer' , employerSchema)
