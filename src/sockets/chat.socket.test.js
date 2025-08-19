import { Server } from "socket.io";
import { createServer } from "http";
import registerChatSockets from "./chat.socket.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";



// Mock user data for testing
const defaultUser = {
  _id: new mongoose.Types.ObjectId(),
  fullName: "Test User",
  email: "test@example.com",
  role: "student"
};

// Generate JWT for test user
const token = jwt.sign({ _id: defaultUser._id }, process.env.ACCESS_TOKEN_SECRET || "testsecret");

let io, httpServer;

describe("Chat Socket.io Integration", () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: "testdb" });
    // Start HTTP and Socket.io server
    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: "*" } });
    registerChatSockets(io);
    httpServer.listen(0); // random available port
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoose.connection.close();
    if (io) io.close();
    if (httpServer) httpServer.close();
  }, 30000);

  it("should connect and join a conversation", (done) => {
    const client = require("socket.io-client")(`http://localhost:${httpServer.address().port}`, {
      auth: { token }
    });
    client.on("connect", () => {
      client.emit("conversation:join", { conversationId: "testconv" }, (res) => {
        expect(res.success).toBe(true);
        client.disconnect();
        done();
      });
    });
  }, 30000);

  // More tests for message:send, message:read, etc. can be added here
});
