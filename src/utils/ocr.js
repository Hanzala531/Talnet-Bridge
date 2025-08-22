import Tesseract from "tesseract.js";

/**
 * Extract text from an image using Tesseract.js
 * @param {string} imagePath - Local file path or remote image URL
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      "eng", // language (use 'eng' for English)
      {
        logger: info => console.log(info) // optional: shows progress
      }
    );
    return text;
  } catch (error) {
    throw new Error("Failed to extract text from image: " + error.message);
  }
}

// Example usage
(async () => {
  const text = await extractTextFromImage("./certificate.jpg");
  console.log("Extracted text:", text);
})();
