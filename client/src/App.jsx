import { useState } from "react";
import { Mic, Upload, FileAudio, Loader2 } from "lucide-react";

export default function App() {
  const [file, setFile] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const [audioChunks, setAudioChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const audioMimeTypes = [
        "audio/wav",
        "audio/mpeg",
        "audio/ogg",
        "audio/webm",
        "audio/flac",
        "audio/aac",
        "audio/mp4",
      ];

      // Filter only audio MIME types
      const validAudioTypes = audioMimeTypes.filter((type) =>
        type.startsWith("audio/")
      );

      // Select a format dynamically (e.g., MP3 or the first available format)
      const selectedType = validAudioTypes.includes("audio/mpeg")
        ? "audio/mpeg"
        : validAudioTypes[0];

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: selectedType });
        setAudioChunks(chunks);
        setFile(
          new File([audioBlob], `recording.${selectedType.split("/")[1]}`, {
            type: selectedType,
          })
        );
      };

      recorder.start();
      setRecordingStatus("recording");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecordingStatus("inactive");
      // Stop all audio tracks
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select or record an audio file first");
      return;
    }

    setLoading(true);
    setError("");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const base64Audio = reader.result.split(",")[1]; // Extract base64 data
        const response = await fetch(
          `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/transcribe`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audio: base64Audio,
              filename: file.name,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        setTranscription(data.text);
      } catch (err) {
        console.error("Error transcribing audio:", err);
        setError("Failed to transcribe audio. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  };

  const handleSave = async () => {
    if (!transcription) {
      setError("No transcription to save");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: transcription,
            filename: file?.name || "transcription.txt",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      alert("Transcription saved successfully!");
    } catch (err) {
      console.error("Error saving transcription:", err);
      setError("Failed to save transcription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Speech to Text Converter
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Upload an audio file or record your voice to convert speech to text
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800">
              Convert Audio to Text
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload an audio file or record your voice to get started
            </p>
          </div>

          <div className="p-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === "upload"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("upload")}
              >
                Upload Audio
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === "record"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("record")}
              >
                Record Audio
              </button>
            </div>

            {/* Upload Tab Content */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="audio-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileAudio className="w-8 h-8 mb-3 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        WAV, MP3, or M4A (MAX. 10MB)
                      </p>
                    </div>
                    <input
                      id="audio-upload"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {file && file.name.includes("upload") && (
                  <p className="text-sm text-gray-500">
                    Selected file: {file.name}
                  </p>
                )}
              </div>
            )}

            {/* Record Tab Content */}
            {activeTab === "record" && (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="mb-4">
                  {recordingStatus === "inactive" ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Mic className="w-4 h-4" />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse" />
                      Stop Recording
                    </button>
                  )}
                </div>
                {file && file.name === "recording.wav" && (
                  <div className="w-full">
                    <p className="text-sm text-gray-500 mb-2">
                      Recording saved
                    </p>
                    <audio controls className="w-full">
                      <source
                        src={URL.createObjectURL(file)}
                        type="audio/wav"
                      />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
                {error}
              </div>
            )}

            {/* Transcribe Button */}
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Transcribe Audio
                  </>
                )}
              </button>
            </div>

            {/* Transcription Result */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcription Result
              </label>
              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Transcription will appear here..."
                className="w-full min-h-[150px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={!transcription || loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Transcription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
