export const verifyAdmin = (req , res, next) => {
    if (req.user.status !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admins only.",
        });
    }
    next();
};