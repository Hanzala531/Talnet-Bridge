import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file buffer directly to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer.memoryStorage
 * @param {string} folder - Optional Cloudinary folder name (default: "corsure-courses")
 * @returns {Promise<Object|null>} Cloudinary response or null if failed
 */
const uploadOnCloudinary = async (fileBuffer, folder = "corsure-courses") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder,
        quality: "auto:good",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary using its public_id
 * @param {string} publicId
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
