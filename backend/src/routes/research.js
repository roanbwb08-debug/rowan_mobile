const express = require("express");
const { searchTavily } = require("../services/tavilyService");

const router = express.Router();

router.post("/research", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        error: "Research query is required",
      });
    }

    const results = await searchTavily(query);

    res.json({
      success: true,
      query,
      answer: results.answer || null,
      results: results.results || [],
    });
  } catch (error) {
    console.error("Research error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;