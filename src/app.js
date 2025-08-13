import express, { urlencoded } from "express";
import cors from "cors";
import cookieparser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import limiter from "./middlewares/rateLimit.middlewares.js";
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// middlewares - Configure CORS for production
app.use(
  cors({
    origin: process.env.CORS_ORIGIN === '*' 
      ? true 
      : process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  })
);

app.options("*", cors());

// Rate limiting applied
app.use(limiter)

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

// For Vercel, serve static files from Public directory
app.use(express.static("public"));

app.use(cookieparser());

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Add before export
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Talent Bridge API is  running!",
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      availableEndpoints: [
        '/api/v1/users',
        '/api/v1/api-docs'
      ]
    }
  });
});

// Creating User Api 
app.use('/api/v1/users' , userRouter ) 

// Add 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route does not exists' });
});

export { app };