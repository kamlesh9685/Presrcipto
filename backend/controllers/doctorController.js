import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";

const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body;

        const docData = await doctorModel.findById(docId);
        await doctorModel.findByIdAndUpdate(docId, {
            available: !docData.available,
        }); // --- THIS IS THE LINE TO CORRECT ---
        res.json({ success: true, message: "Availability Changed" });
    } catch (error) {
        console.error("Error in changeAvailability:", error);
        res.json({ success: false, message: error.message });
    }
};

const doctorList = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select(["-password", "-email"]);
        res.json({ success: true, doctors });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const loginDoctor = async (req, res) => {
    try {
        const { email, password } = req.body;
        const doctor = await doctorModel.findOne({ email });

        if (!doctor) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, doctor.password);

        if (isMatch) {
            const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const appointmentsDoctor = async (req, res) => {
    try {
        const docId = req.docId;
        const appointments = await appointmentModel
            .find({ docId })
            .populate("docId")
            .populate("userData");
        res.json({ success: true, appointments });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const appointmentCompleted = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const docId = req.docId;

        const appointmentData = await appointmentModel.findById(appointmentId);

        if (appointmentData && appointmentData.docId.toString() === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                isCompleted: true,
            });
            return res.json({ success: true, message: "Appointment Completed" });
        } else {
            return res.json({ success: false, message: "Mark Failed" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const docId = req.docId;

        const appointmentData = await appointmentModel.findById(appointmentId);

        if (appointmentData && appointmentData.docId.toString() === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, {
                cancelled: true,
            });
            return res.json({ success: true, message: "Appointment Cancelled" });
        } else {
            return res.json({ success: false, message: "Cancellation Failed" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
    try {
        const docId = req.docId;

        const appointments = await appointmentModel.find({ docId }).populate('userData');

        let earnings = 0;
        appointments.forEach((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount;
            }
        });

        const patientIds = new Set(appointments.map(item => item.userId.toString()));

        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: patientIds.size,
            latestAppointments: [...appointments].reverse().slice(0, 5),
        };

        res.json({ success: true, dashData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API to get doctor profile for Doctor Panel
const doctorProfile = async (req, res) => {
    try {
        const docId = req.docId; // Correctly using ID from auth middleware

        if (!docId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        const profileData = await doctorModel.findById(docId).select('-password');
        if (!profileData) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }
        res.json({ success: true, profileData });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

// --- IMPORTANT FIX: API to update doctor profile data from doctor panel ---
const updateDoctorProfile = async (req, res) => {
    try {
        const docId = req.docId;
        const { fees, address, available } = req.body;

        // Find and update the document, and return the NEW updated document
        const updatedDoctor = await doctorModel.findByIdAndUpdate(
            docId, 
            { fees, address, available },
            { new: true } // This option ensures the updated document is returned and prevents issues.
        );

        if (!updatedDoctor) {
            return res.status(404).json({ success: false, message: "Doctor profile not found to update." });
        }

        res.json({ success: true, message: 'Profile Updated', data: updatedDoctor });

    } catch (error) {
        console.log("ERROR IN UPDATE DOCTOR PROFILE:", error); // For better debugging
        res.status(500).json({ success: false, message: "Error updating profile on server." });
    }
}

export {
    changeAvailability,
    doctorList,
    loginDoctor,
    appointmentsDoctor,
    appointmentCancel,
    appointmentCompleted,
    doctorDashboard,
    doctorProfile,
    updateDoctorProfile,
};
