import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import mongoose from "mongoose";
import path from "path";

// Routes and Middlewares
import { connectDB } from "./config/db.js";
import webhookRoutes from "./routes/webhook.routes.js";
import userRoutes from "./routes/user.routes.js";
import { syncUser } from "./middlewares/authMiddleware.js";
import { clerkAuth } from "./middlewares/clerkAuth.js";
import resumeRoutes from "./routes/ResumeRoutes.js";
import resumeBuilderRoutes from "./routes/ResumeBuilderRouter.js";
import { ATSRouter } from "./routes/ATSRouter.js";
import { ATSController } from "./controllers/ATSController.js";
import { ATSAnalyzer } from "./services/ATSAnalyzerModule.js";
import { ParserFactory } from "./parsers/ParserFactory.js";
import { ATSRepository } from "./repositories/ATSRepository.js";
import { InterviewRoutes } from "./routes/InterviewRoutes.js";
import { InterviewController } from "./controllers/InterviewController.js";
import { QuestionBankRouter } from "./routes/QuestionBankRouter.js";

// Models
import { ResumeDraft } from "./models/ResumeDraft.js";
import { InterviewSession } from "./models/InterviewSession.js";

// Load environment variables (force override to pick up .env changes during nodemon restarts)
dotenv.config({ override: true });

// Connect to MongoDB (non-blocking)
connectDB().catch(console.error);

const app = express();

// Webhook routes (MUST be before express.json() because it needs raw body)
app.use("/api/webhooks", webhookRoutes);

const allowedOrigins = [
  "https://resume-pilot-ai-gamma.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.options(
  /.*/,
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Database readiness check middleware
app.use((req: Request, res: Response, next: express.NextFunction) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      error: "Service Unavailable: Database connection is not established.",
      details:
        "The backend is running but cannot reach MongoDB. Please check your IP whitelist and DATABASE_URL.",
    });
    return;
  }
  next();
});

app.use(clerkMiddleware());
app.use(syncUser); // Lazily sync Clerk users on any authenticated API call

// User routes
app.use("/api/users", userRoutes);

// Resume Builder routes
app.use("/api/resume-builder", resumeBuilderRoutes);

// Resume Routes
app.use("/api/resume", resumeRoutes);

// Secure file serving — requires authentication and blocks directory traversal
app.get("/api/uploads/:filename", clerkAuth, (req: Request, res: Response) => {
  const filename = req.params.filename as string;

  // Block directory traversal attacks
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    res.status(400).json({ error: "Invalid filename." });
    return;
  }

  const filePath = path.resolve("uploads", filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: "File not found." });
    }
  });
});

import { ATSService } from "./services/ATSService.js";
import { AIProvider } from "./providers/GroqAIProvider.js";

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  throw new Error(
    "FATAL: GROQ_API_KEY environment variable is not set. Server cannot start.",
  );
}

const atsRepository = new ATSRepository();
const parserFactory = new ParserFactory();
const aiProvider = new AIProvider(); // Groq provider which reads API key from env implicitly, but we have groqApiKey checked

const atsService = new ATSService(aiProvider, parserFactory, atsRepository);

const atsController = new ATSController(
  new ATSAnalyzer(groqApiKey), // Keeps old compatibility
  parserFactory,
  atsRepository,
  atsService,
);
app.use("/api/ats", new ATSRouter(atsController).router);

// Real Dashboard Stats Route
app.get(
  "/api/dashboard/stats",
  clerkAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const totalDrafts = await ResumeDraft.countDocuments({ userId });
      const totalInterviews = await InterviewSession.countDocuments({
        clerkUserId: userId,
      });

      const completedInterviews = await InterviewSession.find({
        clerkUserId: userId,
        status: "completed",
      });
      let avgInterviewScore = 0;
      if (completedInterviews.length > 0) {
        const sum = completedInterviews.reduce(
          (acc, curr) => acc + (curr.overallScore || 0),
          0,
        );
        avgInterviewScore = Math.round(sum / completedInterviews.length);
      }

      res.status(200).json({
        success: true,
        data: {
          totalDrafts,
          totalInterviews,
          avgInterviewScore,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  },
);

// Interview routes
const interviewController = new InterviewController();
app.use("/api/interview", new InterviewRoutes(interviewController).router);

// Industry-Specific Question Bank Generator Route
app.use("/api/interview/questions", new QuestionBankRouter().router);

// Health check route
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});
app.get("/health", (req: Request, res: Response) => res.status(200).send("OK"));

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
