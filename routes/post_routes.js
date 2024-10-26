import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";

console.log("Starting script...");

// Load environment variables
dotenv.config();
console.log("Environment variables loaded.");

// Debug: Log the API key (be careful with this in production!)
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Set" : "Not set");

let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("GoogleGenerativeAI instance created successfully.");
} catch (error) {
  console.error("Error creating GoogleGenerativeAI instance:", error);
}


// Function to generate AI caption based on the text and platform
export async function generateAICaption(req, res) {
  console.log("generateAICaption function called.");
  const { text, platform } = req.body;

  console.log("Received request body:", req.body);

  if (!text || !platform) {
    console.log("Missing required parameters");
    console.error("Missing parameters!");
    res.json({ platform, errorM });
  }

  try {
    // Generate caption content using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Gemini model obtained.");
    const prompt = `Generate a social media caption for ${platform}. Here's an idea of the kind of caption I'm looking for: ${text}. Make sure the output is suitable for that specific platform. The output should be the caption only, no other details, and limit the output to 200 words.`;
    console.log("Prompt:", prompt);

    const result = await model.generateContent(prompt);
    console.log("Content generated.");
    const response = await result.response;
    const caption = response.text();
    console.log("Generated caption:", caption);
    // Send response with the generated caption
    res.json({ platform, caption });
  } catch (error) {
    const errorM = `Error generating caption: ${error}`;
    console.error("Error generating caption:", error);
    res.json({ platform, errorM });
  }
}

// Function to generate AI image based on the text and platform
export async function generateAIImage(req, res) {
  console.log("generateAIImage function called.");
  const { text, platform } = req.body;
  console.log(req.body)

  console.log("Received request body:", req.body);

  if (!text || !platform) {
    console.log("Missing required parameters");
    const errorM = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmWru8q17zpOzzzT1s475ZS_8fOL1GS0teSw&s"
    return res.json({ platform, errorM });
  }

  try {
    // Generate image description using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Gemini model obtained.");
    const prompt = `"Enhance the following event with painstaking details and adjectives (below 500 characters)-: ${text}. The image should convey a sense of professionalism. Very important: The image should not have any text! Do not include any descriptions of text in the image. Limit the image to realistic settings that can take place and images that can easily be AI generated. Make the images without any people and use only simple inanimate objects. The description should match content regularly posted on ${platform}, for example it should be professional for LinkedIn, and casual for Instagram/Twitter, and smarter for threads/reddit."`;
    console.log("Prompt:", prompt);

    const result = await model.generateContent(prompt);
    console.log("Content generated.");
    const response = await result.response;
    console.log(response)
    const imageDescription = response.text();
    console.log("\n\n\n\nGenerated image description:", imageDescription);

    // Generate image using Runware API
    let imageURL;
    console.log("Generating image...");
    try {
      const imageResponse = await axios.post(
        "https://api.runware.ai/v1",
        [
          {
            taskType: "authentication",
            apiKey: process.env.RUNWARE_API_KEY,
          },
          {
            taskType: "imageInference",
            taskUUID: "39d7207a-87ef-4c93-8082-1431f9c1dc97",
            positivePrompt: imageDescription,
            width: 512,
            height: 512,
            modelId: "runware:5@1",
            numberResults: 1,
          },
        ],
        {
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      if (
        imageResponse.data &&
        Array.isArray(imageResponse.data.data) &&
        imageResponse.data.data.length > 0
      ) {
        const imageData = imageResponse.data.data[0];
        if (imageData.imageURL) {
          imageURL = imageData.imageURL;
          console.log("Image generated:", imageURL);
        } else {
          console.error("No imageURL in the response:", imageData);
          throw new Error("No imageURL in the API response");
        }
      } else {
        console.error(
          "Unexpected Runware API response format:",
          imageResponse.data
        );
        throw new Error("Unexpected Runware API response format");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      throw new Error("Failed to generate image");
    }

    // Send response with the generated image
    res.json({ platform, imageURL });
  } catch (error) {
    console.error("Error generating image:", error);
    const errorM = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmWru8q17zpOzzzT1s475ZS_8fOL1GS0teSw&s"
    res.json({ platform, errorM });
  }
}

console.log("Script loaded successfully.");

