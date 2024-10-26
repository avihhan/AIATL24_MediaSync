import express from "express";
import { example, getUserProfile } from "./get_twitter.js";

const twitterRouter = express.Router();

twitterRouter.post("/test-twitter", example);
twitterRouter.post("/user_info", getUserProfile);

export default twitterRouter;