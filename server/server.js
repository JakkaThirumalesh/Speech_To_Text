const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const { AssemblyAI } = require("assemblyai");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Allow frontend origin
app.use(
  cors({
    origin: ["https://speech-to-text-7qhw.vercel.app/"],
    methods: ["POST", "GET"],
    credentials: false,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1>Welcome to Backend</h1>");
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize AssemblyAI client
const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

// API endpoint to transcribe audio
app.post("/api/transcribe", async (req, res) => {
  try {
    if (!req.body.audio || !req.body.filename) {
      console.error("❌ No audio file provided");
      return res.status(400).json({ error: "No audio file provided" });
    }

    const { audio, filename } = req.body;

    // Convert base64 to Buffer
    const audioBuffer = Buffer.from(audio, "base64");

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from("audio-files")
      .upload(`transcriptions/${Date().toString()}${filename}`, audioBuffer, {
        contentType: "audio/mpeg",
      });

    if (uploadError) {
      console.error("❌ Supabase Upload Error:", uploadError);
      return res.status(500).json({ error: "Supabase file upload failed" });
    }

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/audio-files/${data.path}`;

    // Transcribe with AssemblyAI
    const transcript = await assemblyai.transcripts.transcribe({
      audio_url: publicUrl,
      language_code: "en",
    });

    res.json({
      text: transcript.text,
      audioUrl: publicUrl,
    });
  } catch (error) {
    console.error("❌ Backend Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/transcribe", async (req, res) => {
  return res.send("Backend is Running");
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
