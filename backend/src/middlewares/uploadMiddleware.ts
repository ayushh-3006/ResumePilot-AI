import multer from "multer";

/**
 * SOLID — S (Single Responsibility): Only responsible for handling file uploads.
 *
 * Uses memoryStorage — the uploaded file is kept as a Buffer in memory.
 * This Buffer is passed directly to PDFResumeParser.
 * We do NOT write the uploaded file to disk (only the generated PDF is saved to disk).
 */
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },

  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true); // Accept the file
    } else {
      cb(new Error("Only PDF files are accepted.")); // Reject anything else
    }
  },
});

export default upload;
