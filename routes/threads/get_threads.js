import dotenv from "dotenv";
import axios from "axios";
// Load environment variables
dotenv.config();

async function threadUserInsights(req, res) {
  const access_token = process.env.THREAD_ACCESS_TOKEN;

  try {
    const { since: sinceRequest, until: untilRequest } = req.body;
    const since = sinceRequest ? Math.floor(new Date(sinceRequest).getTime() / 1000) : Math.floor(new Date('2024-04-19').getTime() / 1000);

    // Default to the current date for 'until' if not provided in request
    const until = untilRequest ? Math.floor(new Date(untilRequest).getTime() / 1000) : Math.floor(new Date().getTime() / 1000);

    // Call the Threads API
    const response = await axios.get(
      "https://graph.threads.net/v1.0/27125279160449718/threads_insights",
      {
        params: {
          metric: "views,likes,replies,reposts,quotes,followers_count",
          access_token,
          since,
          until
        }
      }
    );

    const data = response.data.data;

    // Initialize totals for each metric
    let totalViews = 0;
    let totalLikes = 0;
    let totalReplies = 0;
    let totalReposts = 0;
    let totalQuotes = 0;
    let totalFollowers = 0;

    // Parse insights data
    const parsedInsights = data.map(insight => {
      const metric = insight.name;

      // If the metric is "views", sum up the time series data
      if (metric === "views" && insight.values && insight.values.length > 0) {
        totalViews = insight.values.reduce((total, valueEntry) => {
          return total + (valueEntry.value || 0);
        }, 0);
      }

      // For other metrics, extract the total_value directly
      if (metric === "likes") totalLikes = insight.total_value?.value || 0;
      if (metric === "replies") totalReplies = insight.total_value?.value || 0;
      if (metric === "reposts") totalReposts = insight.total_value?.value || 0;
      if (metric === "quotes") totalQuotes = insight.total_value?.value || 0;
      if (metric === "followers_count") totalFollowers = insight.total_value?.value || 0;

      return {
        metric: insight.name,
        period: insight.period,
        description: insight.description,
        values: insight.values || [], // Only relevant for "views"
        total: insight.total_value?.value || null, // For non-timeseries metrics
      };
    });

    // Send parsed data and individual totals as response
    res.json({ 
      parsedInsights, 
      totalViews, 
      totalLikes, 
      totalReplies, 
      totalReposts, 
      totalQuotes, 
      totalFollowers 
    });
  } catch (error) {
    console.error("Error fetching insights:", error.message);
    console.log(error)
    res.status(500).json({ error: "Failed to fetch insights" });
  }
}

export default threadUserInsights;
