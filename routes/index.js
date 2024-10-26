import express from "express";
import twitterRoutes from "./twitter/index.js";
import redditRoutes from "./reddit/index.js";
import threadsRoutes from "./threads/index.js";
import { generateAICaption, generateAIImage } from "./post_routes.js";
import generateVideoFromText from "./video_routes.js";

const router = express.Router();

// Mount Reddit routes under '/reddit'
router.use("/reddit", redditRoutes);
router.use("/threads", threadsRoutes);
router.use("/twitter", twitterRoutes);

// Keep the generate_post route at the root level
// router.post("/generate_post", generatePost);

router.post("/generate_caption", generateAICaption);
router.post("/generate_image", generateAIImage);
router.post("/generate_reel", generateVideoFromText);

export default router;
