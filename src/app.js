import express, { urlencoded } from "express";
import cors from "cors";
import cookieparser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import courseRouter from "./routes/courses.routes.js";
import schoolRouter from "./routes/school.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import webhookRouter from "./routes/webhook.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import limiter from "./middlewares/rateLimit.middlewares.js";
import employerRouter from "./routes/employer.routes.js";
import jobsRouter from "./routes/jobs.routes.js";
import studentRouter from "./routes/student.routes.js";
import kycRouter from "./routes/kyc.routes.js";
import enrollmentRouter from "./routes/enrollment.routes.js";
// Swagger imports
import { setupSwagger } from "../swagger.js";

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

import { connectRedis } from "./config/redis.config.js"; // adjust path

(async () => {
  await connectRedis();
})();


// ---------- Middlewares ---------- //

// Configure CORS for production & local dev
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN === "*"
        ? true
        : process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

app.options("*", cors());

// Apply rate limiting
app.use(limiter);

// Parse JSON and URL-encoded data
app.use(
  express.json({
    limit: "30kb",
  })
);

app.use(
  urlencoded({
    extended: true,
    limit: "16kb",
  })
);

// Serve static files (for Vercel)
app.use(express.static("public"));

// Cookie parser
app.use(cookieparser());

// ---------- Swagger Docs ---------- //
setupSwagger(app); // Adds /docs and /swagger.json routes

// ---------- Routes ---------- //

// Root API health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Talent Bridge API is running!",
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      availableEndpoints: [
        "/api/v1/users",
        "/api/v1/courses",
        "/api/v1/schools",
        "/api/v1/employer",
        "/api/v1/jobs",
        "/api/v1/students",
        "/api/v1/kyc",
        "/api/v1/enrollments",
        "/api/v1/subscriptions",
        "/api/v1/payments",
        "/api/v1/webhooks",
        "/api/v1/notifications",
        "/api/v1/chat", // CHAT FEATURE: chat endpoints
        "/docs", // Swagger UI
        "/swagger.json", // Raw OpenAPI spec
      ],
    },
  });
});

// User routes
app.use("/api/v1/users", userRouter);

// Course routes
app.use("/api/v1/courses", courseRouter);

// Training provider/school routes
app.use("/api/v1/schools", schoolRouter);

// company routes
app.use("/api/v1/employer", employerRouter);

// jobs routes
app.use("/api/v1/jobs", jobsRouter);

// Student routes
app.use("/api/v1/students", studentRouter );

// KYC routes
app.use("/api/v1/kyc", kycRouter);

// Enrollment routes
app.use("/api/v1/enrollments", enrollmentRouter);

// Subscription routes
app.use("/api/v1/subscriptions", subscriptionRouter);

// Payment routes
app.use("/api/v1/payments", paymentRouter);

// Webhook routes (Note: /webhooks/stripe should be before other middleware for raw body parsing)
app.use("/api/v1/webhooks", webhookRouter);

// Notification routes
app.use("/api/v1/notifications", notificationRouter);

// CHAT FEATURE: mount chat routes
import chatConversationRouter from "./routes/chat.conversation.routes.js";
import chatMessageRouter from "./routes/chat.message.routes.js";
app.use("/api/v1/chat", chatConversationRouter);
app.use("/api/v1/chat", chatMessageRouter);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route does not exist" });
});

export { app };
