const express = require("express");
const { PORT } = require("./config/config");
const sequelize = require("./config/db"); // MySQL connection
const userRoute = require("./routes/userRoute");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { Event } = require("./model/Event"); // Import Event model

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/user", userRoute);

// Ensure necessary directories exist
const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "Output_images");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Multer setup for JSON file uploads
const jsonStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const jsonUpload = multer({ storage: jsonStorage });

// API Route to upload JSON files
app.post("/upload-json", jsonUpload.single("jsonFile"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ message: "File uploaded successfully", fileName: req.file.filename });
});

// API Route to get all uploaded JSON files
app.get("/json-files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ error: "Unable to fetch files" });
    res.json({ files });
  });
});

// API Route to read a specific JSON file
app.get("/json-files/:fileName", (req, res) => {
  const filePath = path.join(uploadDir, req.params.fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  const jsonData = fs.readFileSync(filePath, "utf8");
  res.json(JSON.parse(jsonData));
});

// Multer setup for event image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, outputDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const imageUpload = multer({ storage: imageStorage });

// API Route to upload event images (with metadata)
app.post("/upload-event", imageUpload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { category, description } = req.body;

  try {
    const timestamp = new Date(); // Ensure valid date

    if (isNaN(timestamp.getTime())) {
      return res.status(400).json({ error: "Invalid timestamp generated" });
    }

    const newEvent = await Event.create({
      filename: req.file.filename,
      category: category || "Auto-Detected",
      description: description || "Newly detected event",
      timestamp, // Ensure MySQL-friendly format
    });

    res.json({ message: "Event image uploaded", event: newEvent });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Error saving event metadata" });
  }
});


// API Route to fetch event images with metadata (sorted by latest first)
app.get("/api/event-images", async (req, res) => {
  try {
    const events = await Event.findAll({
      order: [["timestamp", "DESC"]] // Sort by latest timestamp first
    });

    const imageList = events.map(event => ({
      src: `/Output_images/${event.filename}`,
      category: event.category,
      description: event.description,
      timestamp: event.timestamp.toISOString() // Ensure timestamp is in a sortable format
    }));

    res.json(imageList);
  } catch (error) {
    res.status(500).json({ error: "Error fetching event images" });
  }
});

// Serve static images
app.use("/Output_images", express.static(outputDir));

/**
 * Automatically detect new images in the Output_images folder
 * and store them in the database with extracted timestamps.
 */

// Pattern for filenames: ch1_Fall_Detection_YYYY-MM-DD_HH-MM-SS
const imagePattern = /^ch\d+_[A-Za-z_]+_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/;

// Function to parse timestamp from filename
const parseTimestamp = (filename) => {
  const match = filename.match(imagePattern);
  if (!match) return new Date(); // Default to current date if no match

  // Convert 'YYYY-MM-DD_HH-MM-SS' → 'YYYY-MM-DDTHH:MM:SS' (ISO format)
  const timestampStr = match[1].replace(/_/g, " ").replace(/-/g, ":").replace(" ", "T");

  const timestamp = new Date(timestampStr);
  if (isNaN(timestamp.getTime())) {
    console.error(`❌ Invalid date format for filename: ${filename}`);
    return new Date(); // Fallback to current time
  }

  return timestamp;
};



// Function to scan and update database with new images
const scanOutputImages = async () => {
  fs.readdir(outputDir, async (err, files) => {
    if (err) return console.error("Error reading output directory:", err);

    for (const file of files) {
      const exists = await Event.findOne({ where: { filename: file } });
      if (!exists) {
        const timestamp = parseTimestamp(file);
        await Event.create({
          filename: file,
          category: "Auto-Detected",
          description: "Newly detected event",
          timestamp
        });
        console.log(`📸 New event detected: ${file}`);
      }
    }
  });
};

// Run scan periodically (every 3 seconds)
setInterval(scanOutputImages, 3000);

// Sync MySQL Database & Start Server
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to MySQL");

    await sequelize.sync({ alter: true }); // Ensures tables are created/updated
    console.log("✅ Database Synced!");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

    // Initial scan when the server starts
    scanOutputImages();
  } catch (error) {
    console.error("❌ Error connecting to MySQL:", error);
  }
})();
