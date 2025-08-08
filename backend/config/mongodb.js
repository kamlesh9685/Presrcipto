import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => console.log("Database Connected"));
    mongoose.connection.on("error", (err) => console.log("Database Connection Error:", err));

    // Yahan se aakhir ka "/prescripto" hata diya gaya hai
    await mongoose.connect(process.env.MONGODB_URI);

  } catch (error) {
    console.error("Could not connect to database:", error);
    process.exit(1);
  }
};

export default connectDB;