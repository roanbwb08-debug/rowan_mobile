require("dotenv").config();

const express = require("express");
const cors = require("cors");

const researchRouter = require("./routes/research");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "rowan-ai-backend",
  });
});

app.use("/api", researchRouter);

app.listen(PORT, () => {
  console.log(`Rowan AI backend running on http://localhost:${PORT}`);
});