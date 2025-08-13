import express, { urlencoded } from "express";
import cors from "cors";
import cookieparser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import limiter from "./middlewares/rateLimit.middlewares.js";

// Swagger imports
import { swaggerSpec } from "../swagger.js";
import swaggerUi from "swagger-ui-express";

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
// Serve OpenAPI JSON
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Swagger UI (all assets from swagger-ui-express)
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Talent Bridge API Documentation',
    swaggerOptions: {
      url: '/swagger.json', // Absolute path avoids asset issues
    },
  })
);

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
        "/docs", // Swagger UI
        "/swagger.json", // Raw OpenAPI spec
      ],
    },
  });
});

// User routes
app.use("/api/v1/users", userRouter);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route does not exist" });
});

export { app };
