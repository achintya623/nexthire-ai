const express = require("express");
const router = express.Router();

const candidateController = require("../controllers/candidateController");
const auth = require("../middleware/authMiddleware");

// All candidate endpoints require authentication.
router.post("/", auth, candidateController.addCandidate);
router.get("/job/:jobId", auth, candidateController.getCandidates);
router.post("/:id/analyze", auth, candidateController.analyzeCandidate);
router.get("/:id/report", auth, candidateController.getReport);
router.patch("/:id/stage", auth, candidateController.updateStage);

module.exports = router;
