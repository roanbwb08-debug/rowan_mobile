const TAVILY_URL = "https://api.tavily.com/search";

async function searchTavily(query) {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  if (!query || !query.trim()) {
    throw new Error("Research query cannot be empty");
  }

  const response = await fetch(TAVILY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: query.trim(),
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Tavily HTTP ${response.status}: ${errorText}`
    );
  }

  return await response.json();
}

module.exports = {
  searchTavily,
};