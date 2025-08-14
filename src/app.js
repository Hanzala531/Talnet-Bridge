import express, { urlencoded } from "express";
import cors from "cors";
import cookieparser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import courseRouter from "./routes/courses.routes.js";
import schoolRouter from "./routes/school.routes.js";
import limiter from "./middlewares/rateLimit.middlewares.js";

// Swagger imports
import { setupSwagger } from "../swagger.js";

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route does not exist" });
});

export { app };
