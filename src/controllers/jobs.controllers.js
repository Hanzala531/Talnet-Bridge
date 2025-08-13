import { Job } from "../models/index.js";
import {asyncHandler} from "../utils/asyncHandler.js"


// #add appropriate errors in catch block

// get all jobs
// get a job by id 
// create a job
// update a job
// contact with school for employer if candidate is getting selected # not for now 

// get all job posts controller
const getAllJobs = asyncHandler(async(req  , res)=>{
    try {
        // check for jobs in database
        // if jobs are not fetched
        // if no document exists in job 
    } catch (error) {
        
    }
})

// get a job by id 
const getJobById = asyncHandler(async(req , res)=>{
    try {
        // get id for job from request body 
        // check if job exists in db
        // if job exists then send response
    } catch (error) {
        
    }
})


//create a joB
const createJobPost = asyncHandler(async(req , res)=>{
    try {
        const {jobTitle , }=req.body
    } catch (error) {
        
    }
}) 