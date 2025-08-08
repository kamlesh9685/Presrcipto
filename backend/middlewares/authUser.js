import jwt from 'jsonwebtoken'

// user authentication middleware
const authUser = async (req,res,next) => {
    try{
        const {token} = req.headers; // Assuming token is sent in headers
        
        if(!token) {
            return res.status(401).json({success:false,message:'Not Authorized, Login Again'}); // Use appropriate status codes
        }
        
        const token_decode = jwt.verify(token,process.env.JWT_SECRET);
        // Attach the userId directly to the request object
        req.userId = token_decode.id; // <--- CHANGE THIS LINE
        
        next();

    } catch (error) {
        console.log(error);
        // Better error message for token issues
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        res.status(500).json({success:false,message:'Server error: ' + error.message}); // Generic server error
    }
}

export default authUser;