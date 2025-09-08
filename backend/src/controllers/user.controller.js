import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";                 // Password hashing / verification
import crypto from "crypto";                 // Random token generation
import { Meeting } from "../models/meeting.model.js";

// -----------------------------------------------------------------------------
// Authentication & Meeting History Controller
// -----------------------------------------------------------------------------
// Exposes four handlers:
//   login           -> Validate credentials, issue session token
//   register        -> Create a new user (bcrypt hashed password)
//   getUserHistory  -> Return meetings associated with a user token
//   addToHistory    -> Persist a meeting code to user's history
// Notes:
//   * Token is a random 40‑hex string (no expiry). Consider JWT or TTL tokens.
//   * No rate limiting or brute force protection currently implemented.
//   * On duplicate user registration returns HTTP 302 (FOUND) which is
//     unconventional; a 409 CONFLICT is more semantically correct.
// -----------------------------------------------------------------------------

/**
 * POST /login
 * Body: { username, password }
 * On success: { token }
 */
const login = async (req, res) => {

    const { username, password } = req.body; // Basic credential extraction

    if (!username || !password) {
        return res.status(400).json({ message: "Please Provide" })
    }

    try {
    const user = await User.findOne({ username }); // Lookup by unique username
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" })
        }


    let isPasswordCorrect = await bcrypt.compare(password, user.password); // Constant‑time hash compare

        if (isPasswordCorrect) {
            // Generate a pseudo session token (40 hex chars)
            let token = crypto.randomBytes(20).toString("hex");

            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token: token })
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" })
        }

    } catch (e) {
    return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

/**
 * POST /register
 * Body: { name, username, password }
 * Creates a new user document with hashed password.
 */
const register = async (req, res) => {
    const { name, username, password } = req.body; // Minimal validation; enhance with schema


    try {
    const existingUser = await User.findOne({ username }); // Enforce uniqueness
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "User already exists" });
        }

    const hashedPassword = await bcrypt.hash(password, 10); // Cost factor 10

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

    res.status(httpStatus.CREATED).json({ message: "User Registered" });

    } catch (e) {
    res.json({ message: `Something went wrong ${e}` });
    }

}
/**
 * GET /get_all_activity?token=...
 * Retrieves meeting history for a user identified by session token.
 */
const getUserHistory = async (req, res) => {
    const { token } = req.query; // Token should ideally be in Authorization header

    try {
    const user = await User.findOne({ token: token });
    const meetings = await Meeting.find({ user_id: user.username });
    res.json(meetings);
    } catch (e) {
    res.json({ message: `Something went wrong ${e}` });
    }
}

/**
 * POST /add_to_activity
 * Body: { token, meeting_code }
 * Saves a meeting code to user's meeting history collection.
 */
const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body; // meeting_code naming kept for compatibility

    try {
    const user = await User.findOne({ token: token }); // Resolve user by session token

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        });

    await newMeeting.save(); // Persist new meeting document

    res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
    res.json({ message: `Something went wrong ${e}` });
    }
}

export { login, register, getUserHistory, addToHistory };