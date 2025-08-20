import vision from "@google-cloud/vision";
import path from "path";
import { fileURLToPath } from "url";

// For ES modules path handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, "../config/vision-key.json"),
});

/**
 * Extract text from an image using Google Cloud Vision
 * @param {string} imagePath - Local file path or a remote image URL
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromImage(imagePath) {
  try {
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations;
    return detections.length > 0 ? detections[0].description : "";
  } catch (error) {throw new Error("Failed to extract text from image");
  }
}
