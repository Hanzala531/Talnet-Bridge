import connectDB from './database/index.js';
import dotenv from 'dotenv';
import { app } from './app.js';
// CHAT FEATURE: socket.io imports
import { createServer } from 'http';
import { Server } from 'socket.io';
import registerChatSockets from './sockets/chat.socket.js';
import { initNotificationSocket } from './sockets/notification.socket.js';

dotenv.config({
    path: './.env'
});

// Validate environment variables
if (!process.env.MONGODB_URI) {process.exit(1);
}

// Connect to MongoDB
connectDB()
.then(() => {
    // CHAT FEATURE: socket.io bootstrap
    console.log(`[${new Date().toISOString()}] 🚀 Initializing HTTP Server with Socket.IO support`);
    const httpServer = createServer(app);
    const io = new Server(httpServer, { 
        cors: { 
            origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000", "http://localhost:5173"],
            credentials: true 
        } 
    });
    
    console.log(`[${new Date().toISOString()}] 🔌 Registering chat socket handlers`);
    // Register chat socket handlers
    registerChatSockets(io);
    
    console.log(`[${new Date().toISOString()}] 🔔 Initializing notification socket handlers`);
    // Register notification socket handlers
    initNotificationSocket(io);
    
    // Make io accessible to routes
    app.set("io", io);
    
    app.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] ❌ Server error:`, error);
    });
    const port = process.env.PORT || 4000
    httpServer.listen(port, () => {
    console.log(`[${new Date().toISOString()}] 🎉 Server is running on : http://localhost:${port}`)
    console.log(`[${new Date().toISOString()}] 🌐 Socket.IO server ready for connections`);
    console.log(`[${new Date().toISOString()}] 📡 WebSocket endpoint: ws://localhost:${port}/socket.io/`);
});
})
.catch((error) => {process.exit(1);
});

