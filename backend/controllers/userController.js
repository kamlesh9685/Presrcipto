import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import razorpay from "razorpay";
import crypto from "crypto";

// API to register user
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !password || !email) {
            return res.json({ success: false, message: "Missing Details" });
        }
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Enter a valid email" });
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Enter a strong password" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userData = { name, email, password: hashedPassword };
        const newUser = new userModel(userData);
        const user = await newUser.save();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

//API for user login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "user does not exist" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get user profile data
const getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required: User ID missing." });
        }
        const userData = await userModel.findById(userId).select("-password");
        if (!userData) {
            return res.status(404).json({ success: false, message: "User profile not found." });
        }
        res.json({ success: true, userData });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//API to update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required: User ID missing." });
        }
        const { name, phone, address, dob, gender } = req.body;
        const imageFile = req.file;
        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" });
        }
        const parsedAddress = typeof address === "string" ? JSON.parse(address) : address;
        await userModel.findByIdAndUpdate(userId, { name, phone, address: parsedAddress, dob, gender });
        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
            const imageURL = imageUpload.secure_url;
            await userModel.findByIdAndUpdate(userId, { image: imageURL });
        }
        res.json({ success: true, message: "Profile Updated" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to book appointment
const bookAppointment = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required: User ID missing." });
        }
        const { docId, slotDate, slotTime } = req.body;
        const docData = await doctorModel.findById(docId).select("-password");
        if (!docData || !docData.available) {
            return res.status(404).json({ success: false, message: "Doctor not available or not found" });
        }
        let slots_booked = docData.slots_booked || {};
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: "Slot not available" });
            } else {
                slots_booked[slotDate].push(slotTime);
            }
        } else {
            slots_booked[slotDate] = [];
            slots_booked[slotDate].push(slotTime);
        }
        const userData = await userModel.findById(userId).select("-password");
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found for appointment." });
        }
        const appointmentDocData = { _id: docData._id, name: docData.name, speciality: docData.speciality, fees: docData.fees, address: docData.address, image: docData.image };
        const appointmentData = { userId, docId, userData, docData: appointmentDocData, amount: docData.fees, slotTime, slotDate, date: Date.now() };
        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });
        res.json({ success: true, message: "Appointment Booked" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to get user appointment for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication failed." });
        }
        const appointments = await appointmentModel.find({ userId });
        res.json({ success: true, appointments });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const userId = req.userId;
        const appointmentData = await appointmentModel.findById(appointmentId);
        if (appointmentData.userId.toString() !== userId) {
            return res.json({ success: false, message: "Unauthorized" });
        }
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
        const { docId, slotDate, slotTime } = appointmentData;
        const doctorData = await doctorModel.findById(docId);
        let slots_booked = doctorData.slots_booked;
        slots_booked[slotDate] = slots_booked[slotDate].filter((e) => e !== slotTime);
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });
        res.json({ success: true, message: "Appointment Cancelled" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData || appointmentData.cancelled || appointmentData.payment) {
            return res.json({ success: false, message: "Appointment not valid for payment" });
        }
        const options = {
            amount: appointmentData.amount * 100,
            currency: "INR",
            receipt: appointmentId,
        };
        const order = await razorpayInstance.orders.create(options);
        if (!order) {
            return res.json({ success: false, message: "Razorpay order creation failed" })
        }
        await appointmentModel.findByIdAndUpdate(appointmentId, {
            razorpay_order_id: order.id
        });
        res.json({ success: true, order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error while creating Razorpay order" });
    }
};

// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");
        const isAuthentic = expectedSignature === razorpay_signature;
        if (isAuthentic) {
            await appointmentModel.findOneAndUpdate(
                { razorpay_order_id: razorpay_order_id },
                {
                    payment: true,
                    razorpay_payment_id: razorpay_payment_id,
                    razorpay_signature: razorpay_signature
                }
            );
            res.json({ success: true, message: "Payment Successful" });
        } else {
            res.json({ success: false, message: "Payment verification failed. Invalid signature." });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error in payment verification" });
    }
};

export {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay,
};