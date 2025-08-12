import express, { urlencoded } from "express";
import cors from "cors";
import cookieparser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import limiter from "./middlewares/rateLimit.middlewares.js"
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

// Add before export
app.get('/', (req, res) => {
  res.json({ message: 'Talent Bridge API is running!' });
});

// Creating User Api 
app.use('/api/v1/users' , userRouter ) 

// Add 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route does not exists' });
});

export { app };