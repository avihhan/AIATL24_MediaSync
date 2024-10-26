import express from "express";
import threadUserInsights from "./get_threads.js";

const threadsRoutes = express.Router();

threadsRoutes.post("/user_info", threadUserInsights);

export default threadsRoutes;
