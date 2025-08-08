import jwt from 'jsonwebtoken';

const authDoctor = async (req, res, next) => {
    const token = req.headers.dtoken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Authentication failed: No token provided." });
    }

    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        req.docId = decodedPayload.id;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication failed: Invalid or expired token." });
    }
}

export default authDoctor;