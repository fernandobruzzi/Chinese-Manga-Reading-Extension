// Grab the page elements we need to read from or write to
const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("save");
const statusText = document.getElementById("status");

// When the page opens, load the saved key (if any) into the input field.
// Reading from storage is not instant, so .then runs once the result arrives.
chrome.storage.local.get("apiKey").then((result) => {
  // result is an object like { apiKey: "..." }, or {} if nothing was saved yet
  if (result.apiKey !== undefined) {
    apiKeyInput.value = result.apiKey;
  }
});

// When the user clicks Save, store whatever is typed in the input field
saveButton.addEventListener("click", (event) => {
  const typedValue = apiKeyInput.value;

  // Saving is also not instant, so we only show the message after it finishes
  chrome.storage.local.set({ apiKey: typedValue }).then(() => {
    statusText.textContent = "Key successfully saved!";
  });
});