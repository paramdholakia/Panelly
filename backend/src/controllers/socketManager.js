import { Server } from "socket.io";

// -----------------------------------------------------------------------------
// In‑Memory Signalling State (Ephemeral)
// -----------------------------------------------------------------------------
// connections:  { [roomPath: string]: string[] }  -> list of socket ids in room
// messages:     { [roomPath: string]: Array<{ sender, data, 'socket-id-sender' }> }
// timeOnline:   { [socketId: string]: Date }      -> connection timestamp
// These structures are NOT persisted; a server restart wipes state.
// For scale / durability use Redis or another external store.
// -----------------------------------------------------------------------------
let connections = {};
let messages = {};
let timeOnline = {};

/**
 * Attaches a Socket.IO signalling layer to the provided HTTP/S server.
 * @param {import('http').Server} server Underlying HTTP server instance.
 * @returns {import('socket.io').Server} Configured Socket.IO server.
 */
export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",            // TODO: Restrict to known frontend origin in production
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    // New client connection ----------------------------------------------------
    io.on("connection", (socket) => {
        console.log(`[Socket.IO] Connected: ${socket.id}`);

        // -----------------------------------------------------------------------
        // join-call: A client announces intent to join a logical room.
        // The 'path' value is the full meeting URL (used as unique key).
        // After joining: broadcast 'user-joined' (roster) to all in room.
        // Replay stored chat history (if any) to the newly joined client.
        // -----------------------------------------------------------------------
        socket.on("join-call", (path) => {
            if (!connections[path]) connections[path] = [];
            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            // Notify every client in the room (including the newcomer) with the
            // full array of socket IDs so they can initiate WebRTC offers.
            for (let i = 0; i < connections[path].length; i++) {
                io.to(connections[path][i]).emit("user-joined", socket.id, connections[path]);
            }

            // Replay historical chat so late joiners see previous conversation
            if (messages[path]) {
                for (let i = 0; i < messages[path].length; i++) {
                    const msg = messages[path][i];
                        io.to(socket.id).emit(
                        "chat-message",
                        msg['data'],
                        msg['sender'],
                        msg['socket-id-sender']
                    );
                }
            }
        });

        // -----------------------------------------------------------------------
        // signal: Generic transport for SDP descriptions & ICE candidates.
        // The frontend constructs JSON blobs and forwards them here with the
        // destination peer's socket id.
        // -----------------------------------------------------------------------
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // -----------------------------------------------------------------------
        // chat-message: Broadcast a text message to everyone in the sender's room
        // and persist it in memory so that future joiners receive the backlog.
        // -----------------------------------------------------------------------
        socket.on("chat-message", (data, sender) => {
            // Find the first room where this socket currently resides.
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ["", false]);

            if (!found) return; // Socket not in any registered room

            if (!messages[matchingRoom]) messages[matchingRoom] = [];
            messages[matchingRoom].push({ 'sender': sender, 'data': data, 'socket-id-sender': socket.id });
            console.log(`[Chat] (${matchingRoom}) ${sender}: ${data}`);

            // Fan out message to all peers in the room
            connections[matchingRoom].forEach(peerSocketId => {
                io.to(peerSocketId).emit("chat-message", data, sender, socket.id);
            });
        });

        // -----------------------------------------------------------------------
        // disconnect: Clean up membership; notify remaining peers.
        // -----------------------------------------------------------------------
        socket.on("disconnect", () => {
            const connectedAt = timeOnline[socket.id];
            const uptimeMs = connectedAt ? Math.abs(connectedAt - new Date()) : 0;
            console.log(`[Disconnect] ${socket.id} (uptime ${uptimeMs}ms)`);

            // Iterate over all rooms to remove this socket wherever present.
            for (const [roomKey, memberList] of Object.entries({ ...connections })) {
                if (!memberList.includes(socket.id)) continue;

                // Notify remaining members
                memberList.forEach(memberId => io.to(memberId).emit('user-left', socket.id));

                // Remove socket id from the room
                const idx = connections[roomKey].indexOf(socket.id);
                if (idx > -1) connections[roomKey].splice(idx, 1);

                // If room empty, purge its state
                if (connections[roomKey].length === 0) {
                    delete connections[roomKey];
                    delete messages[roomKey]; // free chat history memory early
                }
            }

            delete timeOnline[socket.id];
        });
    });

    return io;
};

