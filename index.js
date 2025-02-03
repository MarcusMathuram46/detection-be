const express =require("express");
const mongoose = require("mongoose");
const { MONGODB_URL, PORT } = require("./config/config");
const userRoute = require("./routes/userRoute")
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/user", userRoute);


// Create 'uploads' directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
  
const upload = multer({ storage });

// API Route to handle JSON file uploads
app.post("/upload-json", upload.single("jsonFile"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
  
    res.json({ message: "File uploaded successfully", fileName: req.file.filename });
  });
  
  // API Route to get all uploaded JSON files
  app.get("/json-files", (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: "Unable to fetch files" });
      }
      res.json({ files });
    });
  });
  
  // API Route to read a specific JSON file
  app.get("/json-files/:fileName", (req, res) => {
    const filePath = path.join(uploadDir, req.params.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    const jsonData = fs.readFileSync(filePath, "utf8");
    res.json(JSON.parse(jsonData));
  });



mongoose.connect(MONGODB_URL,{ useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>{
    console.log("Connected to MongoDB")
    app.listen(PORT,()=>{
        console.log(`Server is running on port ${PORT}`)
    })
})
.catch((error)=>{
    console.error("Error connecting to MongoDB: ", error);
})