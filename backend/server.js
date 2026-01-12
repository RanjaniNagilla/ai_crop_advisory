const express = require("express");
const cors = require("cors");
const { HfInference } = require("@huggingface/inference");
require("dotenv").config();

const app = express();
const PORT = 3000;
const path = require("path");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Initialize Hugging Face
const hf = new HfInference(process.env.HF_TOKEN);

app.post("/api/analyze", async (req, res) => {
    try {
        console.log("📝 Received analysis request (Hugging Face - Qwen2VL)...");
        const { payload } = req.body;

        if (!payload || !payload.contents || !payload.contents[0]) {
            return res.status(400).json({ error: { message: "Invalid payload format" } });
        }

        // Extract text and image from the frontend payload structure
        const parts = payload.contents[0].parts;
        const textPrompt = parts.find(p => p.text)?.text || "Analyze this crop.";
        const imagePart = parts.find(p => p.inlineData);

        const messages = [
            {
                role: "user",
                content: [
                    { type: "text", text: "You are an advanced agricultural AI expert. Format your response in Markdown.\n\n" + textPrompt }
                ]
            }
        ];

        if (imagePart) {
            messages[0].content.push({
                type: "image_url",
                image_url: {
                    url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
                }
            });
        }

        // Qwen2.5-VL-7B is explicitly allowed by the API
        const model = "Qwen/Qwen2.5-VL-7B-Instruct";

        // Helper for retrying if model is loading (503)
        const runWithRetry = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await hf.chatCompletion({
                        model: model,
                        messages: messages,
                        max_tokens: 1000,
                    });
                } catch (err) {
                    // If error is 503 (Model Loading), wait and retry
                    if (err.message && err.message.includes("503") && i < retries - 1) {
                        console.log(`⏳ Model loading... Retrying (${i + 1}/${retries})`);
                        await new Promise(r => setTimeout(r, 5000)); // Wait 5s
                    } else {
                        throw err;
                    }
                }
            }
        };

        const chatCompletion = await runWithRetry();

        const aiText = chatCompletion.choices[0].message.content;

        // Mimic the structure our frontend expects
        const responsePayload = {
            candidates: [
                {
                    content: {
                        parts: [
                            { text: aiText }
                        ]
                    }
                }
            ]
        };

        res.json(responsePayload);

    } catch (error) {
        console.error("Hugging Face Error:", error);
        res.status(500).json({
            error: {
                message: error.message || "Error communicating with Hugging Face API"
            }
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
