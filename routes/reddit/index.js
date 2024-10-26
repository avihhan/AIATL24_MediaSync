import express from "express";
import { redditFetchComment, getUserprofile, getUserPastPosts } from "./get_reddit.js";
import { redditPost } from "./post_reddit.js";

const redditRouter = express.Router();

redditRouter.post("/post", redditPost);
redditRouter.post("/user_info", getUserprofile);
redditRouter.post("/user-past-posts/", getUserPastPosts);
redditRouter.get("/comments/:id", redditFetchComment);

export default redditRouter;
