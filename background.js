// URL to acess gemini
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
// const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

// Prompt that we send to gemini in order to get the words in the image
const OCR_PROMPT = "I want you to transcribe the simplified Mandarin text on the image. If the text is vertical, read it in columns from top to bottom, starting from the rightmost column. Don't give me the translation, nor the pinyin, nor any explanation and any formatting(don't give me any text written in bold). Return only the chinese text. DON'T ADD ANYTHING ELSE. Transcribe character by character exactly as written, even if a word looks unusual. Do not correct or replace characters with more common words.";

// Crops the screenshot to the selected region.
// rect is in CSS pixels; the screenshot is in device pixels, so we scale by ratio.
async function cropScreenshot(dataUrl, rect, ratio) {
  // dataUrl (text) -> blob (image file) -> ImageBitmap (decoded pixels)
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const image = await createImageBitmap(blob);

  //convert the rect to device pixels: multiply each value by ratio
  //     and round it, since a pixel can't be split
  const x = Math.round(rect.left * ratio);
  const y = Math.round(rect.top * ratio);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);

  // a canvas exactly the size of the region, with only that part drawn on it
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  context.drawImage(image, x, y, width, height, 0, 0, width, height);

  // back to a data URL, so we can look at it (and later send it to Gemini)
  const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(croppedBlob);
}

// Converts a blob to a data URL. FileReader uses callbacks instead of promises,
// so we wrap it in a Promise to be able to use await with it.
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Sends our text prompt and the image to Gemini and returns the response object
async function callGemini(prompt) {
    const apiKey = (await chrome.storage.local.get('apiKey')).apiKey; 

    const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: prompt,
    }),
  });

  // fetch only fails on network errors; an HTTP error (wrong key, rate limit)
  // still "succeeds", so we check the status ourselves
  if (!response.ok) {
    throw new Error(`Gemini error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// gets the generated text out of a gemini response, searching by type
// instead of assuming positions, so extra steps don't break it
function getGeminiText(response){
    const outputStep = response.steps.find((s) => s.type==="model_output");
    const text = outputStep.content.find((t)=> t.type === "text").text;
    return text;
}

// Full flow for one selection: screenshot, crop, Gemini, recognized text.
// A single try/catch handles errors from any step.
async function handleCaptureRegion(rect, screenRatio, senderTab) {
  try {
    const screenshot = await chrome.tabs.captureVisibleTab(senderTab.windowId, { format: "png" });
    const cropped = await cropScreenshot(screenshot, rect, screenRatio);      
    const base64Data = cropped.split(",")[1];   // the part of cropped after the comma (.split)

    const response = await callGemini([
      {type: "text", text: OCR_PROMPT},
      {type: "image", data: base64Data, mime_type: "image/png"}
    ]);

    const text = getGeminiText(response);
    await chrome.tabs.sendMessage(senderTab.id, {type: "ocrResult", text: text});
  } catch (error) {
    // we send the error too so it can be displayed instead of an endless "Reading" in our ocrPanel
    console.error(error);
    chrome.tabs.sendMessage(senderTab.id, {type: "ocrError", error:error.message});
  }
}


console.log("Service worker started!");
// Messages from content scripts (one per tab) all arrive here
// Not async on purpose! The value returned by an onMessage listener has a meaning, so the async work runs in handleCaptureRegion
chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>{
    // runs every time any content script sends a message
    if(message.type !== "captureRegion"){
        return;
    }
    const rect = message.rect;
    const screenRatio = message.screenRatio;
    handleCaptureRegion(rect, screenRatio, sender.tab);
});