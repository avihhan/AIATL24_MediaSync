import express from "express";
import dotenv from "dotenv";
import cors from "cors"; // Import cors
dotenv.config();
import api_routes from "./routes/index.js";

const app = express();

// Enable CORS for all routes
app.use(cors()); // Add CORS middleware

// Middleware to parse incoming JSON requests
app.use(express.json());

// Start the server on port 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Sample route for the root URL
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Use the API routes
app.use("/api", api_routes);

// 404 Error Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).send("Route not found");
});

// General Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong");
});
