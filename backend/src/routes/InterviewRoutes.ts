import { Router } from "express";
import { InterviewController } from "../controllers/InterviewController.js";
import { clerkAuth } from "../middlewares/clerkAuth.js";
import { VisionAnalysisController } from "../controllers/VisionAnalysisController.js";
import multer from "multer";

// In-memory upload for audio blobs (max 10 MB)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Gracefully accept all audio/video mimetypes to avoid strict validation crashes.
    // If it's a blob, it might be audio/webm, video/webm, audio/mp4, etc.
    if (
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype === "application/octet-stream"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type: expected audio or video"));
    }
  },
});

export class InterviewRoutes {
  public router: Router;
  private controller: InterviewController;

  constructor(controller: InterviewController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Start a new interview session
    this.router.post(
      "/start",
      clerkAuth,
      this.controller.startInterview.bind(this.controller),
    );

    // Transcribe audio → text
    this.router.post(
      "/transcribe",
      clerkAuth,
      audioUpload.single("audio"),
      this.controller.transcribeAudio.bind(this.controller),
    );

    // Submit an answer for evaluation
    this.router.post(
      "/submit-answer",
      clerkAuth,
      this.controller.submitAnswer.bind(this.controller),
    );

    // Complete the interview session
    this.router.post(
      "/complete",
      clerkAuth,
      this.controller.completeInterview.bind(this.controller),
    );

    // Fetch past interview sessions
    this.router.get(
      "/history",
      clerkAuth,
      this.controller.getHistory.bind(this.controller),
    );

    // Analyze video frames for body language
    const visionController = new VisionAnalysisController();
    this.router.post(
      "/analyze-video-frames",
      clerkAuth,
      visionController.analyzeVideoFrames.bind(visionController),
    );

    // ── Sharing routes ──

    // Enable sharing for a session (protected)
    this.router.post(
      "/sessions/:id/share",
      clerkAuth,
      this.controller.shareSession.bind(this.controller),
    );

    // Revoke sharing (protected)
    this.router.delete(
      "/sessions/:id/share",
      clerkAuth,
      this.controller.revokeShare.bind(this.controller),
    );

    // Get shared report (PUBLIC — no auth required)
    this.router.get(
      "/shared/:shareToken",
      this.controller.getSharedReport.bind(this.controller),
    );
  }
}
