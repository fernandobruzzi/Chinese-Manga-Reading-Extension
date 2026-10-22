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


console.log("Service worker started!");
// Messages from content scripts (one per tab) all arrive here
chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>{
    // runs every time any content script sends a message
    if(message.type !== "captureRegion"){
        return;
    }
    const rect = message.rect;
    const screenRatio = message.screenRatio;
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })

    .then((dataUrl) => {
    // runs later, when the screenshot is ready
        cropScreenshot(dataUrl, rect, screenRatio)
        .then((croppedImageUrl)=> {
                    // console.log(`Here is your result!: ${croppedImageUrl}`);
                    console.log(`Here is the size of the crop: ${croppedImageUrl.lenght}`)
                })
        // catches any cropping errors
        .catch((error)=>{
                    console.error(error);
                });
    })
    // catches any permission errors
    .catch((error)=>{
        console.error(error);
    })

    
});