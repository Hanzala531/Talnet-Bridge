import { TrainingInstitute , Employer , User } from "../models/index.js";
import { successResponse , badRequestResponse ,notFoundResponse } from "../utils/ApiResponse.js";
import { badRequest , notFound , internalServer } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// creating creat company profile controller
const creatCompanyProfile = asyncHandler(async (req , res)=>{
    try {
        // get requesting user from req.user._id
        // get required fields
        // validate all the fields given for harmful data 
        // check if comapny with this name already exists or not 
        // create company document 
        // if successfully created 
        // send responses and errors appropriately
    } catch (error) {
        
    }
})


// get all the companies on the system