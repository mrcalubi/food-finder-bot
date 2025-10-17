module.exports = (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API running 🚀",
    env_check: {
      openai_key: process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing",
      google_key: process.env.GOOGLE_MAPS_API_KEY ? "✅ Set" : "❌ Missing"
    }
  });
};
