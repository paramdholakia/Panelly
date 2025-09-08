import { Router } from "express";
import { addToHistory, getUserHistory, login, register } from "../controllers/user.controller.js";

// -----------------------------------------------------------------------------
// User / Auth Routes (Versioned under /api/v1/users in app.js)
// -----------------------------------------------------------------------------
// POST /login             → Authenticate credentials, returns token
// POST /register          → Create new user
// POST /add_to_activity   → Append meeting code to history
// GET  /get_all_activity  → Fetch meeting history for token
// NOTE: These endpoints trust token supplied in body/query. For production:
//   - Move token to Authorization: Bearer <token>
//   - Add middleware to validate & attach user context
// -----------------------------------------------------------------------------
const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);

export default router;