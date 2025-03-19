const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const punycode = require("punycode");
const fs = require("fs");
const path = require("path");
const { AssemblyAI } = require("assemblyai");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Configure CORS
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize AssemblyAI client
const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

// API endpoint to transcribe audio
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const filePath = req.file.path;

    // Read file as buffer
    const audioFile = fs.readFileSync(filePath);

    // Submit for transcription
    const transcript = await assemblyai.transcripts.transcribe({
      audio: audioFile,
      language_code: "en",
    });

    // Return the transcription
    return res.json({
      text: transcript.text,
      audioId: req.file.filename,
      audioUrl: req.file.path,
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

// API endpoint to save transcription
app.post("/api/save", async (req, res) => {
  try {
    const { text, filename } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Save text to Supabase
    const { data, error } = await supabase.from("transcriptions").insert([
      {
        text,
        filename,
        created_at: new Date(),
      },
    ]);

    if (error) {
      throw error;
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Error saving transcription:", error);
    return res.status(500).json({ error: "Failed to save transcription" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
