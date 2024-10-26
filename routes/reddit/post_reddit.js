import snoowrap from 'snoowrap';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Reddit API credentials
const r = new snoowrap({
  userAgent: "MyApp/1.0.0",
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

export const redditPost = async (req, res) => {
  try {
    const { subreddit, title, text, mediaUrl } = req.body;

    if (!subreddit || !title || (!text && !mediaUrl)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let submissionPromise;

    if (mediaUrl) {
      submissionPromise = r.submitLink({
        subredditName: subreddit,
        title: title,
        url: mediaUrl,
      });
    } else {
      submissionPromise = r.submitSelfpost({
        subredditName: subreddit,
        title: title,
        text: text,
      });
    }

    const submission = await submissionPromise;
    const fetchedSubmission = await r.getSubmission(submission.name).fetch();

    console.log("Fetched submission:", fetchedSubmission);
    res.json({
      message: "Post submitted successfully",
      postId: fetchedSubmission.id,
      postTitle: fetchedSubmission.title,
      subredditId: fetchedSubmission.subreddit_id,
      url: fetchedSubmission.permalink,
      author: fetchedSubmission.author.name,
      created_utc: fetchedSubmission.created_utc,
    });
  } catch (error) {
    console.error("Error submitting or fetching post:", error);
    res.status(500).json({
      error: "Failed to submit or fetch post",
      details: error.message,
    });
  }
};