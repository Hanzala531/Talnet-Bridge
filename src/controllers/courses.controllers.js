import { Course } from "../models/index.js";
import {asyncHandler} from "../utils/asyncHandler.js"



// first of all get all courses controller
// get a course by id 
// search courses 
// create a course controller
// update a course controller
//  update course status controller
//  delete courses 
// further controllers if required 
// export all the controllers

// getCourses controller
const getCourses = asyncHandler(async (req , res )=>{
    try {
        // check db for courses 
        // if dont get courses from db
        // if no courses found in db 
        // if courses found ten send response 
        // appropriate errors in catch block
    } catch (error) {
        
    }
})

// getCOurses by id
const getCoursesById = asyncHandler (async (req , res)=>{
    try {
        // get course id from request body 
        // find course in db 
        // if failed to find
        // if no course found 
        // appropriate response if course found
        // appropriate error in catch block
    } catch (error) {
        
    }
})

// create a course controller
const createCourse = asyncHandler(async(req , res)=>{
    try {
        const {title , insstructor , duration , price , language , type , description , objectives , skills } = req.body
    // getRequesting user from from req.user._id and add in training provider
    // check if all fields are present 
    // check if no harmful data is provided 
    // check if existing course exists with the same name of instructor title type duration and type
    // create course in db
    // check if the course is not created in db 
    // if course created successfully send response
    } catch (error) {
        
    }
})

// update course controller for user 
const updateCourse = asyncHandler(async (req , res)=>{
    try {
        // get requesting user 
        // get details from request body
        // check and validate details
        // check fields to be updated
        // update fields in db
        // if updates failed to complete 
        // if updated successfully send appropriate respons
        // approriate error in response
    } catch (error) {
        
    }
})

// update course status for admin
const updateCourseStatus = asyncHandler (async(req , res)=>{
    try {
        // get requesting user 
        // check if user is admin
        // get status from request body and course id
        // check if the status provided is a valid status 
        // find course with the id in db and update using find byId and update
        // if not updated successfully send response
        // if it is updated successfully then send appropriate responses
    } catch (error) {
        
    }
})

// Delete a course 
const deleteCourseById = asyncHandler(async(req , res)=>{
    try {
        // get user and check if he is admin
        // getCourseId from requesting body 
        // find course in db 
        // check if course exists
        // delete the course
        // if not deleted 
        // if deleted then response
        // aprropriate error in catch block
    } catch (error) {
        
    }
})