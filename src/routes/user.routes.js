import express, { request } from "express";
import {
    registerUser,
    loginUser,
    logoutUser
} from '../controllers/user.controllers.js';
import {requestLogger} from '../middlewares/ReqLog.middlewares.js';
import {verifyJWT} from '../middlewares/Auth.middlewares.js';

const userRouter = express.Router();

// Basic User Routes 
userRouter.post('/register' , requestLogger , registerUser)
userRouter.post('/login' , requestLogger , loginUser)
userRouter.post('/logout', requestLogger , verifyJWT , logoutUser)



// Exporting the router
export default userRouter

