import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Fetches a user's profile information from Twitter API v2
 * @param {string} username - Twitter username without @ symbol
 * @returns {Promise<Object>} User profile data
 */

export async function getUserProfile(req, res) {
  try {
    const username = req.body.username; // Get username from URL parameter
    console.log(username);
    
    if (!username) {
      return res.status(400).json({
        error: "Username is required",
      });
    }

    // Twitter API v2 endpoint for user lookups
    const url = `https://api.twitter.com/2/users/by/username/${username}`;

    // Fields to retrieve - you can modify these based on your needs
    const userFields = [
      "id",
      "name",
      "username",
      "created_at",
      "description",
      "profile_image_url",
      "public_metrics",
      "verified",
      "location",
    ].join(",");

    const response = await axios({
      method: "GET",
      url: `${url}?user.fields=${userFields}`,
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    // Error handling for user not found
    if (!response.data.data) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    // Handle specific error cases
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "User not found",
      });
    } else if (error.response?.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded",
      });
    } else if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Invalid authentication credentials",
      });
    }

    // Handle general errors
    console.error("Twitter API Error:", error);
    return res.status(500).json({
      error: "Failed to fetch user profile",
      details: error.message,
    });
  }
}

// Example usage:
export async function example(req, res) {
  try {
    console.log(`twitter api testing... working...`);
    res.json({
      message: "twitter api file working",
    });
  } catch (error) {
    console.error(error.message);
  }
}