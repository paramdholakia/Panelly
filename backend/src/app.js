// -----------------------------------------------------------------------------
// Application Bootstrap (Express + Socket.IO + MongoDB)
// -----------------------------------------------------------------------------
// This file is the single entry point for the backend runtime. It:
//   1. Creates an Express application
//   2. Binds an HTTP server (necessary so Socket.IO can share the same port)
//   3. Attaches the Socket.IO signalling layer used by WebRTC peers
//   4. Connects to MongoDB (Users + Meetings collections)
//   5. Registers REST endpoints under /api/v1/users
//
// IMPORTANT (Security / Production Readiness):
//   * The Mongo connection string is hard‑coded – move it to a .env file (MONGO_URI)
//   * Add rate limiting / helmet for HTTP hardening
//   * Add authentication middleware for protected endpoints if expanded
//   * Replace in‑memory signalling state with a distributed store (Redis) for horizontal scale
// -----------------------------------------------------------------------------

import express from "express";                 // Web framework
import { createServer } from "node:http";      // Native HTTP server wrapper
import mongoose from "mongoose";               // ODM for MongoDB
import { connectToSocket } from "./controllers/socketManager.js"; // Socket bootstrapper
import cors from "cors";                       // Cross‑origin resource sharing
import userRoutes from "./routes/users.routes.js"; // Auth & history endpoints

// --- Core Instances ---------------------------------------------------------
const app = express();
const server = createServer(app);              // Create raw HTTP server
const io = connectToSocket(server);            // Initialize Socket.IO (side effect)

// Configure port (allow override via environment)
app.set("port", (process.env.PORT || 8000));

// --- Middleware -------------------------------------------------------------
app.use(cors());                               // Allow all origins (tighten in prod)
app.use(express.json({ limit: "40kb" }));      // Parse JSON bodies (40kb safety limit)
app.use(express.urlencoded({                   // Support HTML form posts
    limit: "40kb",
    extended: true
}));

// --- Routes -----------------------------------------------------------------
// Mount versioned user routes (login/register/history)
app.use("/api/v1/users", userRoutes);

// --- Startup Logic ----------------------------------------------------------
/**
 * Starts the application life‑cycle:
 *  1. Connect to MongoDB
 *  2. Start HTTP + Socket.IO server
 * If Mongo connection fails the process will terminate (allowing container/PM2
 * supervision to restart). For resilience introduce retry w/ exponential backoff.
 */
const start = async () => {
    // Reserved key for potential tracing/auditing (not used yet)
    app.set("mongo_user");

    // TODO: Replace with environment variable (process.env.MONGO_URI)
    const MONGO_URI = "mongodb+srv://imdigitalashish:imdigitalashish@cluster0.cujabk4.mongodb.net/";

    try {
        const connectionDb = await mongoose.connect(MONGO_URI);
        console.log(`[MongoDB] Connected → Host: ${connectionDb.connection.host}`);
    } catch (err) {
        console.error("[MongoDB] Connection failed", err);
        process.exit(1); // Hard exit – prefer graceful strategy in production
    }

    server.listen(app.get("port"), () => {
        console.log(`[Server] Listening on :${app.get("port")} (HTTP + Socket.IO)`);
    });
};

start();