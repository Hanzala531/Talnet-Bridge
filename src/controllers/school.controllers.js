import {TrainingInstitute} from '../models/index.js'
import { internalServer } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'


// get profile controller
const getProfile = asyncHandler(async(req , res)=>{
    try {
        // get user id from req.user._id
        // check if user is subscriber
        // send basic profile information of the user 
        // throw appropriate error 
    } catch (error) {
        throw internalServer("failed to fetch profile")
    }
})


// edit user profile 
const editProfile = asyncHandler(async(req,res)=>{
    try {
        // user id from req.user._id
        // fields to be edited by user like name email contact about or establiseh , focus areas or location
        // validate fields
        // update profile
        // check if successfully updated
        // send appropriate response 
    } catch (error) {
        
    }
})


// also create all other necessary controllers