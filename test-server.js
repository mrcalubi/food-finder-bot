import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Test server working!", timestamp: new Date().toISOString() });
});

app.get("/test", (req, res) => {
  res.json({ message: "Test endpoint working!", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
});
