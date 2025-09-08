import mongoose, { Schema } from "mongoose";

// -----------------------------------------------------------------------------
// User Schema
// -----------------------------------------------------------------------------
// Fields:
//   name       -> Display name for UI
//   username   -> Unique credential identifier (no email enforced here)
//   password   -> Bcrypt hash (NEVER store plaintext)
//   token      -> Session token (random hex); ephemeral until logout/new login
// Indexes:
//   Mongoose automatically creates unique index for 'username' on first model init.
// Security:
//   Consider: password min length, lastLogin, failedAttempt counters, token expiry.
// -----------------------------------------------------------------------------
const userScheme = new Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String }
});

const User = mongoose.model("User", userScheme);
export { User };