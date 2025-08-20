import {User} from '../models/index.js'


export const verifyRegisterCredentials = (req , res, next) => {
  if (req.body.role?.toLowerCase() === "admin") {
    return res.status(403).json({
        success: false,
        message: "Access denied. You are not authorized to perform this action.",
    });
}
    next();
};

