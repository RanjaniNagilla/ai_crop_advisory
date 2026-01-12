// Helper to read file as Base64
const fileToGenerativePart = async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        };
        reader.readAsDataURL(file);
    });
};

document.getElementById("cropForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const outputDiv = document.getElementById("output");
    outputDiv.classList.remove("hidden");
    outputDiv.innerHTML = "🌱 <b>Analyzing soil and crop data...</b>";

    // Gather Inputs
    const location = document.getElementById("location").value;
    const season = document.getElementById("season").value;
    const soil = document.getElementById("soil").value;
    const crop = document.getElementById("crop").value;

    const nitrogen = document.getElementById("nitrogen").value || "N/A";
    const phosphorus = document.getElementById("phosphorus").value || "N/A";
    const potassium = document.getElementById("potassium").value || "N/A";
    const water = document.getElementById("water").value || "Normal";

    const imageInput = document.getElementById("imageInput");
    const imageFile = imageInput.files[0];

    // Construct Prompt
    let promptText = `
    You are an advanced agricultural AI expert.
    
    **Context:**
    - Location: ${location}
    - Season: ${season}
    - Soil Type: ${soil}
    - Crop: ${crop}
    - Nutrients (N-P-K): ${nitrogen}-${phosphorus}-${potassium}
    - Water Level: ${water}

    **Request:**
    1. Analyze the suitability of the crop for these conditions.
    2. Recommend precise fertilizer adjustments based on N-P-K levels.
    3. Suggest irrigation schedule.
    `;

    if (imageFile) {
        promptText += `
        4. **DISEASE DETECTION:** Analyze the uploaded crop image. Identify any visible diseases, pests, or deficiencies.
        5. Provide organic and chemical remedies for identified issues.
        `;
    } else {
        promptText += `
        4. List common diseases to watch out for in this region/season.
        `;
    }

    promptText += "\nPlease format the output with clear headings and bullet points using Markdown.";

    try {
        const payload = {
            contents: [
                {
                    parts: [{ text: promptText }]
                }
            ]
        };

        // If image exists, add it to payload
        if (imageFile) {
            const imagePart = await fileToGenerativePart(imageFile);
            payload.contents[0].parts.push(imagePart);
        }

        // Call our Backend Server
        const response = await fetch("http://localhost:3000/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || "Server Error");
        }

        if (data.candidates && data.candidates.length > 0) {
            const rawText = data.candidates[0].content.parts[0].text;
            // Simple markdown formatter
            const formattedText = rawText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>')
                .replace(/- /g, '• ');
            outputDiv.innerHTML = formattedText;
        } else {
            // If no candidates but no error, it might be a safety block
            console.log(data); // Log full response for debugging
            outputDiv.innerText = "⚠️ The AI processed the request but returned no content. This might be due to safety filters. Try a different image or description.";
        }

    } catch (error) {
        console.error(error);
        outputDiv.innerHTML = `❌ <b>Error:</b> ${error.message}<br><br>Please check your internet connection or API Key quota.`;
    }
});
