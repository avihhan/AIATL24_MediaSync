import { GoogleGenerativeAI } from '@google/generative-ai';
import natural from 'natural';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';

import { Storage } from '@google-cloud/storage';

// Set paths for ffmpeg and ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

const BUCKET_NAME = 'videos-hacktest'; 
const GOOGLE_BUCKET_KEY = process.env.GOOGLE_BUCKET_KEY;
const genai = new GoogleGenerativeAI(GOOGLE_BUCKET_KEY)

// Initialize Google Cloud Storage
const storage = new Storage({
    keyFilename: path.join("C:\\Users\\KIIT\\Desktop\\Hackathons\\Gtech - AI ATL 2024\\projectbanana-server\\majestic-poetry-429401-u4-720d017bb4c9.json"), // Replace with your service account key path
});
const bucket = storage.bucket(BUCKET_NAME);

async function ensureDirectories(timestamp) {
    console.log(`[Directory Setup] Starting directory creation for timestamp: ${timestamp}`);
    try {
        const outputDir = path.join(__dirname, 'temp', 'videos');
        const audioDir = path.join(__dirname, 'temp', 'audio', timestamp);
        const imageDir = path.join(__dirname, 'temp', 'images', timestamp);

        await fs.mkdir(outputDir, { recursive: true });
        await fs.mkdir(audioDir, { recursive: true });
        await fs.mkdir(imageDir, { recursive: true });

        console.log(`[Directory Setup] Successfully created directories:
        - Output: ${outputDir}
        - Audio: ${audioDir}
        - Image: ${imageDir}`);

        return { outputDir, audioDir, imageDir };
    } catch (error) {
        console.error('[Directory Setup] Failed to create directories:', error);
        throw error;
    }
}

async function chatWithGPT(prompt) {
    console.log('[Gemini] Starting text generation with prompt:', prompt.substring(0, 100) + '...');
    try {
        const model = genai.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('[Gemini] Successfully generated text:', text.substring(0, 100) + '...');
        return text;
    } catch (error) {
        console.error('[Gemini] Error generating text:', error);
        throw error;
    }
}

async function generateAudio(text, index, audioDir) {
    console.log(`[ElevenLabs] Generating audio for segment ${index}`);
    console.log(`[ElevenLabs] Text content: "${text.substring(0, 50)}..."`);

    try {
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${ADVISOR_VOICE_ID}/stream`;
        const response = await axios.post(url, {
            text: text.replace(/"/g, ''),
            voice_settings: {
                stability: 1,
                similarity_boost: 0.8
            }
        }, {
            headers: {
                'xi-api-key': ELEVEN_LABS_API_KEY
            },
            responseType: 'arraybuffer'
        });

        const audioPath = path.join(audioDir, `audio-${index}.mp3`);
        await fs.writeFile(audioPath, response.data);
        console.log(`[ElevenLabs] Successfully generated audio at: ${audioPath}`);
        return audioPath;
    } catch (error) {
        console.error(`[ElevenLabs] Error generating audio for segment ${index}:`, error.response?.data || error);
        throw error;
    }
}

async function generateImage(sentence, index, imageDir) {
    console.log(`[Runware] Generating image for segment ${index}`);
    console.log(`[Runware] Original sentence: "${sentence}"`);

    try {
        const enhancedPrompt = await chatWithGPT(
            "Enhance this sentence with details and adjectives - " + sentence + ". If the sentence is not present, return a description of a beautiful sunrise. Only return either of the two, and nothing else!" + sentence
        );
        console.log(`[Runware] Enhanced prompt: "${enhancedPrompt}"`);

        const imageResponseC = await axios.post(
            "https://api.runware.ai/v1",
            [
                {
                    taskType: "authentication",
                    apiKey: process.env.RUNWARE_API_KEY,
                },
                {
                    taskType: "imageInference",
                    taskUUID: "39d7207a-87ef-4c93-8082-1431f9c1dc97",
                    positivePrompt: enhancedPrompt,
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
        
        console.log(imageResponseC)
        let imageURLA = "";

        if (
            imageResponseC.data &&
            Array.isArray(imageResponseC.data.data) &&
            imageResponseC.data.data.length > 0
        ) {
            const imageDataA = imageResponseC.data.data[0];
            if (imageDataA.imageURL) {
                imageURLA = imageDataA.imageURL;
            } else {
                console.error("No imageURL in the response:", imageDataA);
                throw new Error("No imageURL in the API response");
            }
        } else {
            console.error(
                "Unexpected Runware API response format:",
                imageResponseC.data
            );
            throw new Error("Unexpected Runware API response format");
        }

        const imageUrl = imageURLA;
        console.log(`[Runware] Image URL generated: ${imageUrl}`);

        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imagePath = path.join(imageDir, `image-${index}.jpg`);
        await fs.writeFile(imagePath, imageResponse.data);

        console.log(`[Runware] Successfully saved image at: ${imagePath}`);
        return imagePath;
    } catch (error) {
        console.error(`[Runware] Error generating image for segment ${index}:`, error.response?.data || error);
        throw error;
    }
}

async function combineAudioAndImage(audioPath, imagePath, outputPath, duration) {
    console.log(`[FFmpeg] Combining audio and image:
    - Audio: ${audioPath}
    - Image: ${imagePath}
    - Output: ${outputPath}
    - Duration: ${duration}s`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(imagePath)
            .inputOptions([
                '-loop 1',        // Loop the image
                '-t ' + duration  // Set input duration to match audio
            ])
            .input(audioPath)
            .outputOptions([
                '-c:v libx264',     // Video codec
                '-c:a aac',         // Audio codec
                '-b:v 1500k',       // Video bitrate
                '-pix_fmt yuv420p', // Required for compatibility
                '-shortest',        // End when shortest input ends
                '-t ' + duration,   // Explicitly set output duration
                '-r 30'            // Frame rate
            ])
            .output(outputPath)
            .on('end', () => {
                console.log('Video creation finished');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Error:', err);
                reject(err);
            })
            .run();
    });
}

async function createVideo(segments, outputPath) {
    console.log(`[FFmpeg] Creating final video from ${segments.length} segments`);
    console.log('[FFmpeg] Segments:', segments);

    return new Promise((resolve, reject) => {
        const proc = ffmpeg();

        segments.forEach((segment, index) => {
            console.log(`[FFmpeg] Adding segment ${index}: ${segment}`);
            proc.input(segment);
        });

        proc.mergeToFile(outputPath)
            .on('start', (command) => {
                console.log('[FFmpeg] Started final merge command:', command);
            })
            .on('progress', (progress) => {
                console.log(`[FFmpeg] Merging progress: ${progress.percent}% done`);
            })
            .on('end', () => {
                console.log('[FFmpeg] Successfully merged all segments');
                resolve();
            })
            .on('error', (err) => {
                console.error('[FFmpeg] Error merging segments:', err);
                reject(err);
            });
    });
}

async function generateVideoFromText(req, res) {
    console.log(req)
    const { text } = req.body;

    if (!text) {
        console.log("Missing required parameters");
        const errorM = "https://storage.googleapis.com/videos-hacktest/output_video2024-10-22-18-28-09.mp4"
        return res.json({ errorM });    
    }

    console.log('[Main] Starting video generation with text:', text);
    const timestamp = Date.now().toString();
    console.log('[Main] Generated timestamp:', timestamp);

    try {
        const { outputDir, audioDir, imageDir } = await ensureDirectories(timestamp);

        // Get story from Gemini
        const story = await chatWithGPT(text + ". Create a script for a reel, and limit to 5 sentences, each descriptive and containing less than 15 words, and do not include any options. Directly return the text content. Only use fullstop and no other punctuations");
        const tokenizer = new natural.SentenceTokenizer();
        const sentences = tokenizer.tokenize(story);
        console.log(`[Main] Story split into ${sentences.length} sentences`);

        const segments = [];

        // Generate audio and image for each sentence
        for (let i = 0; i < sentences.length-1; i++) {
            console.log(`[Main] Processing sentence ${i + 1}/${sentences.length}`);
            const sentence = sentences[i];

            // Generate audio and image in parallel
            console.log(`[Main] Starting parallel generation for segment ${i}`);
            const [audioPath, imagePath] = await Promise.all([
                generateAudio(sentence, i, audioDir),
                generateImage(sentence, i, imageDir)
            ]);

            // Create segment
            const segmentPath = path.join(outputDir, `segment-${timestamp}-${i}.mp4`);
            console.log(`[Main] Combining audio and image for segment ${i}`);
            await combineAudioAndImage(audioPath, imagePath, segmentPath, 5);
            segments.push(segmentPath);
        }

        // Combine all segments
        const finalOutput = path.join(outputDir, `final-${timestamp}.mp4`);
        console.log('[Main] Creating final video');
        await createVideo(segments, finalOutput);

        // Upload to Google Cloud Storage
        console.log('[Main] Uploading to Google Cloud Storage');
        const publicUrl = await uploadToGCS(finalOutput, timestamp);

        // Clean up temp files
        console.log('[Main] Cleaning up temporary files');
        await Promise.all([
            ...segments.map(segment => fs.unlink(segment)),
            fs.unlink(finalOutput),
            fs.rm(audioDir, { recursive: true, force: true }),
            fs.rm(imageDir, { recursive: true, force: true })
        ]);

        console.log('[Main] Video generation and upload completed successfully');
        return res.json({ errorM: publicUrl });
    } catch (error) {
        console.error('[Main] Error in video generation:', error);

        // Clean up temp directories in case of error
        console.log('[Main] Cleaning up temporary directories after error');
        try {
            const { audioDir, imageDir } = await ensureDirectories(timestamp);
            await Promise.all([
                fs.rm(audioDir, { recursive: true, force: true }),
                fs.rm(imageDir, { recursive: true, force: true })
            ]);
        } catch (cleanupError) {
            console.error('[Main] Error during cleanup:', cleanupError);
        }

        return res.status(500).json({ 
            errorM: "https://storage.googleapis.com/videos-hacktest/output_video2024-10-22-18-28-09.mp4", 
        });

    }
}

async function uploadToGCS(filePath, timestamp) {
    console.log('[GCS] Starting upload to Google Cloud Storage');
    try {
        const fileName = `output_video${timestamp}.mp4`;
        const destination = `videos/${fileName}`;

        await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                contentType: 'video/mp4',
            },
        });

        // Make the file public
        await bucket.file(destination).makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
        console.log('[GCS] File uploaded successfully. Public URL:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('[GCS] Error uploading to Google Cloud Storage:', error);
        throw error;
    }
}

// const mockReq = {
//     body: {
//         text: 'Kamala wins 2024 elections'
//     }
// };

// console.log(    
//     generateVideoFromText({ req: mockReq})
// )

export default generateVideoFromText;