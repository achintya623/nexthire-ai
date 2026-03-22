const express = require("express");
const router = express.Router();

const jobController = require("../controllers/jobController");
const auth = require("../middleware/authMiddleware");

// All job endpoints require authentication.
router.post("/", auth, jobController.createJob);
router.get("/", auth, jobController.getJobs);
router.delete("/:id", auth, jobController.deleteJob);

module.exports = router;
