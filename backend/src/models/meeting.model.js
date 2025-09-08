import mongoose, { Schema } from "mongoose";

// -----------------------------------------------------------------------------
// Meeting Schema
// -----------------------------------------------------------------------------
// Represents a historical record that a user joined/created a meeting.
// Fields:
//   user_id     -> Username reference (string denormalized for simplicity)
//   meetingCode -> Short code / path segment identifying meeting URL
//   date        -> Timestamp when record created (default now)
// Potential Enhancements:
//   * Add compound index { user_id: 1, date: -1 }
//   * Add duration / endedAt fields
//   * Reference user ObjectId instead of duplicating username
// -----------------------------------------------------------------------------
const meetingSchema = new Schema({
    user_id: { type: String },
    meetingCode: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true }
});

const Meeting = mongoose.model("Meeting", meetingSchema);
export { Meeting };