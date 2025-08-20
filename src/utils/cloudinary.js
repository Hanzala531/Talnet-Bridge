import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath) => {
  // Configure Cloudinary inside the function to ensure env vars are loaded
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const timerLabel = `uploadTime-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  console.time(timerLabel);
  
  try {
    if (!localFilePath) {return null;
    }

    // Debug: Log environment variables (only in development)
    if (process.env.NODE_ENV === 'development') {}

    // Check if Cloudinary credentials are available
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {throw new Error("Cloudinary credentials are missing. Check your environment variables");
    }

    // Check if the file exists before uploading
    if (!fs.existsSync(localFilePath)) {return null;
    }const response = await cloudinary.uploader.upload(localFilePath, { 
      resource_type: "auto",
      folder: "loopwin-products", // Optional: organize uploads in a folder
      quality: "auto:good", // Optimize image quality
      fetch_format: "auto" // Optimize format (webp, etc.)
    });// Delete the file from the server
    deleteLocalFile(localFilePath);

    return response;
  } catch (error) {// Delete the file even if upload fails
    deleteLocalFile(localFilePath);

    return null;
  } finally {
    console.timeEnd(timerLabel);
  }
};

const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);} else {}
  } catch (err) {}
};

export { uploadOnCloudinary };