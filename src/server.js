import connectDB from './database/index.js';
import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config({
    path: './.env'
});

// Validate environment variables
if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
}

// Connect to MongoDB
connectDB()
.then(() => {
    app.on('error', (error) => {
        console.log("Error in listening the app:", error);
    });
    
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
})
.catch((error) => {
    console.log('Error connecting to MongoDB might be issue on server:', error);
    process.exit(1);
});

