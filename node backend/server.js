require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT;

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const candidateRoutes = require("./routes/candidateRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/candidates", candidateRoutes);

// Boots the API server after middleware and routes are mounted.
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
