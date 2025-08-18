import connectDB from './database/index.js';
import dotenv from 'dotenv';
import { app } from './app.js';
// CHAT FEATURE: socket.io imports
import { createServer } from 'http';
import { Server } from 'socket.io';
import registerChatSockets from './sockets/chat.socket.js';

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
    // CHAT FEATURE: socket.io bootstrap
    const httpServer = createServer(app);
    const io = new Server(httpServer, { 
        cors: { 
            origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000", "http://localhost:5173"],
            credentials: true 
        } 
    });
    
    // Register chat socket handlers
    registerChatSockets(io);
    
    // Make io accessible to routes
    app.set("io", io);
    
    app.on('error', (error) => {
        console.log("Error in listening the app:", error);
    });
    
    httpServer.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
        console.log(`Socket.io server is ready for chat connections`);
    });
})
.catch((error) => {
    console.log('Error connecting to MongoDB might be issue on server:', error);
    process.exit(1);
});

