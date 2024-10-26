import snoowrap from "snoowrap";
import dotenv from "dotenv";

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

export const redditFetchComment = async (req, res) => {
  const submissionId = req.params.id;
  const { limit = 100, depth = 5 } = req.query;

  try {
    const submission = await r.getSubmission(submissionId).expandReplies({
      limit: parseInt(limit, 10),
      depth: parseInt(depth, 10),
    });

    const processedComments = submission.comments.map((comment) => ({
      id: comment.id,
      author: comment.author.name,
      body: comment.body,
      score: comment.score,
      created_utc: comment.created_utc,
      replies: comment.replies ? comment.replies.map((reply) => reply.id) : [],
    }));

    res.json({
      postId: submissionId,
      title: submission.title,
      author: submission.author.name,
      commentCount: submission.num_comments,
      ups: submission.ups,
      upvote_ratio: submission.upvote_ratio,
      created_utc: submission.created_utc,
      comments: processedComments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      error: "Failed to fetch comments",
      details: error.message,
    });
  }
};

export const getUserprofile = async (req, res) => {
  try {
    // Get the username from the request body
    const username = req.body.username;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch the user profile
    const user = await r.getUser(username).fetch();

    console.log(user);

    // Construct the user profile object
    const userProfile = {
      name: user.name,
      id: user.id,
      created: new Date(user.created_utc * 1000),
      linkKarma: user.link_karma,
      commentKarma: user.comment_karma,
      isMod: user.is_mod,
      isGold: user.is_gold,
      isSuspended: user.is_suspended,
      verified: user.verified,
      hasVerifiedEmail: user.has_verified_email,
    };

    // Send the response
    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      error: "Failed to fetch user profile",
      details: error.message,
    });
  }
};

export const getUserPastPosts = async (req, res) => {
  try {
    const username = req.body.username;
    const limit = req.body.limit;
    console.log(`limit: `, limit);

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch the user profile
    const user = await r.getUser(username).fetch();

    // Fetch the user's submissions (posts)
    const submissions = await r
      .getUser(username)
      .getSubmissions({ limit: limit });

    // Process the submissions
    const recentPosts = submissions.map((post) => ({
      id: post.id,
      title: post.title,
      subreddit: post.subreddit.display_name,
      score: post.score,
      url: post.url,
      created_utc: post.created_utc,
      num_comments: post.num_comments,
    }));

    // Construct the user profile object
    const userProfile = {
      name: user.name,
      id: user.id,
      created: new Date(user.created_utc * 1000),
      linkKarma: user.link_karma,
      commentKarma: user.comment_karma,
      totalKarma: user.total_karma,
      isMod: user.is_mod,
      isGold: user.is_gold,
      isSuspended: user.is_suspended,
      verified: user.verified,
      hasVerifiedEmail: user.has_verified_email,
      recentPosts: recentPosts,
    };

    // Send the response
    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      error: "Failed to fetch user profile",
      details: error.message,
    });
  }
};
