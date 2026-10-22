console.log("Extensão carregada nesta página!");

// remember where the mouse was last time, so we don't keep looking at the same place
let lastNode = null;
let lastOffset = null;

// Chinese word segmenter
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });

// to show our character in a little balloon we will use a tooltip
const tooltip = document.createElement("div");
tooltip.style.position = "fixed";
tooltip.style.background = "#222";
tooltip.style.color = "#fff";
tooltip.style.padding = "4px 8px";
tooltip.style.borderRadius = "6px";
tooltip.style.fontSize = "18px";
tooltip.style.zIndex = "999999";
tooltip.style.pointerEvents = "none";
tooltip.style.display = "none";
document.body.appendChild(tooltip);

// dictionary reading (smaller than the sandhi reading)
const dictReadLine = document.createElement("div");
dictReadLine.style.color = "#999";
dictReadLine.style.fontSize = "14px";
tooltip.appendChild(dictReadLine);

// tone sandhi reading 
const sandhiReadLine = document.createElement("div");
sandhiReadLine.style.color = "#f80000";
sandhiReadLine.style.fontSize = "16px";
tooltip.appendChild(sandhiReadLine);

// to check if the following character of 一 is an ordinal for our tone sandhi function
const YI_ORDINAL_NEXT = ["月", "号", "世", "楼", "室", "单元", "弄", "巷", "级", "届", "品", "流", "档", "阶"];

// our regex so we only check chinese characters, with this we can skip punctuation, numbers and alphabetical letters
const CHINESE_CHAR_REGEX = /\p{Script=Han}/u;

// whether the user is currently selecting a region on the page
let isSelecting = false;

// rectangle drawn after the user enters selection mode
const selectionBox = document.createElement("div");
selectionBox.style.position = "fixed";
selectionBox.style.border = "2px dashed #f46666";
selectionBox.style.background = "rgba(248,0,0,0.1)";
selectionBox.style.zIndex = "999999";
selectionBox.style.pointerEvents = "none";
selectionBox.style.display = "none";
document.body.appendChild(selectionBox);
// where the rectangle started! null when no rectangle has been started
let startDragX = null;
let startDragY = null;

// Hides the balloon and forgets the last hovered character. Without this reset,
// moving back onto the same character would not show anything
function hideTooltip(){
  tooltip.style.display = "none";
  lastNode = null;
  lastOffset = null;
}

// Takes a list of characters and their dictionary tones ("1"-"4", "0" for neutral,
// "" for non-Chinese) and returns a new list with tone sandhi applied.
// The original tones list is not modified.
function applySandhi(chars, tones) {
  const result = [...tones];

  for (let i = 0; i < chars.length; i++) {

    // 不 becomes 2nd tone before a 4th tone (不是 bú shì)
    if (chars[i] === "不" && i + 1 < chars.length && tones[i + 1] === "4") {
      result[i] = "2";
    }

    // 一 keeps 1st tone in ordinals (第一, 一月), otherwise
    // becomes 2nd before a 4th tone (一个) and 4th before 1st/2nd/3rd (一天)
    if (chars[i] === "一") {
      if (i - 1 >= 0 && chars[i - 1] === "第") {
        result[i] = "1";
      } else if (i + 1 < chars.length && YI_ORDINAL_NEXT.includes(chars[i + 1])) {
        result[i] = "1";
      } else if (tones[i + 1] === "4") {
        result[i] = "2";
      } else if (["1", "2", "3"].includes(tones[i + 1])) {
        result[i] = "4";
      }
    }

    // A 3rd tone becomes 2nd before another 3rd tone (你好 ní hǎo).
    // Punctuation has an empty tone, so a pause naturally breaks the rule.
    if (tones[i] === "3" && i + 1 < chars.length && tones[i + 1] === "3") {
      result[i] = "2";
    }
  }

  return result;
}

// function to test if we are getting the proper sandhi out of a text. applied on the console
function testSandhi(texto) {
  const tons = pinyinPro.pinyin(texto, { pattern: "num", type: "array", toneSandhi: false });
  return applySandhi(texto, tons);
}

// gets a list of syllables and the tone for each of the syllables and returns a string with the corresponding pinyin 
function buildPinyin(syllables, tones){
  const parts = [];
  for(let i = 0; i < syllables.length; i++){
    if(tones[i] === ""){
      continue;
    }
    const syllableAndTone = syllables[i] + tones[i];
    parts.push(pinyinPro.convert(syllableAndTone, {format: "numToSymbol"}));
  }
  return parts.join(" ");
}

// takes a chinese text and returns, for every character its toneless 
// syllable, its dictionary tone and its tone after sandhi
function getReadings(text){
  const syllables = pinyinPro.pinyin(text, {toneType: "none", type: "array"});
  const dictTones = pinyinPro.pinyin(text, {pattern: "num", type: "array", toneSandhi:false});
  const sandhiTones = applySandhi(text, dictTones);
  return {syllables:syllables, dictTones:dictTones, sandhiTones:sandhiTones};
}

// The mouse can move in any direction from the first click, so the click is not
// always the top-left corner. Math.min picks the top left corner (CSS places a box by its left corner),
// and Math.abs gives the size (a width or height can't be negative)
function getPositionSelectionBox(event){
  const left = Math.min(startDragX, event.clientX);
  const top = Math.min(event.clientY, startDragY);
  const width = Math.abs(startDragX - event.clientX);
  const height = Math.abs(event.clientY - startDragY);
  return {left:left, top: top, width: width, height:height};
}

// leaves selectionMode and clears anything that may be displayed
function exitSelectionMode(){
  selectionBox.style.display = "none";
  startDragX = null;
  startDragY = null;
  isSelecting = false;
  document.documentElement.style.cursor = "";
}

// here we have our pinyin box that shows the correct readings
document.addEventListener("mousemove", (event) => {
  
  // we shouldn't have any pinyin balloons while selecting!
  // that'w why we check on the beggining so we don't have any work
  if(isSelecting){
    hideTooltip();
    return;
  }

  // mouse position in pixels
  const x = event.clientX;
  const y = event.clientY;

  // convert the pixel coordinates into a location in the text
  const caret = document.caretPositionFromPoint(x,y)
  if(caret===null){
    hideTooltip();
    return;
  }

  // we only want text nodes that have some text
  const node = caret.offsetNode;
  if (node.nodeType !== Node.TEXT_NODE || node.textContent.length === 0){
    hideTooltip();
    return;
  }

  const text = node.textContent;
  let offset = caret.offset;

  // our offset can land after the character that is actually under the mouse, we need to fix it
  if (offset >= text.length){
    offset -= 1;
  }

  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset + 1);
  let rect = range.getBoundingClientRect();
  // if our mouse is actually pointing to the previous character we fix the offset
  if (x < rect.left && offset > 0){
    offset -= 1;
    // since the offset changed we measure the new character
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    rect = range.getBoundingClientRect();
  }

  // the caret can jump into the nearest text even if our mouse is far from it so we need to avoid the balloon to be displayed
  const isInside = 
    x >= rect.left && x <= rect.right &&
    y >= rect.top && y <= rect.bottom;
  if (!isInside){
    hideTooltip();
    return;
  }


  // skip if we are still on the same character as before
  if (node === lastNode && offset === lastOffset){
    return;
  }
  lastNode = node;
  lastOffset = offset;

  // find the word containing the corrected offset
  const segments = [...segmenter.segment(text)];
  const hoveredWord = segments.find(
    (s) => s.index <= offset && offset < s.index + s.segment.length
  );

  if (hoveredWord === undefined){
    hideTooltip();
    return;
  }

  // check whether we are looking at a chinese character or something that is not, like a punctuation sign
  if(!CHINESE_CHAR_REGEX.test(hoveredWord.segment)){
    hideTooltip();
    return;
  }

  // compute readings for the whole node so sandhi can see neighboring words
  const readings = getReadings(text);

  const start = hoveredWord.index;
  const end = start + hoveredWord.segment.length;

  const wordSyllables = readings.syllables.slice(start,end);
  const wordDictTones = readings.dictTones.slice(start,end);
  const wordSandhiTones = readings.sandhiTones.slice(start, end);

  dictReadLine.textContent = `${hoveredWord.segment} | ${buildPinyin(wordSyllables, wordDictTones)}`;
  sandhiReadLine.textContent = `${hoveredWord.segment} | ${buildPinyin(wordSyllables,wordSandhiTones)}`;

  tooltip.style.left = x + 15 + "px";
  tooltip.style.top = y + 10 + "px";
  
  tooltip.style.display = "block";

});

// we enter or exit our selection mode
document.addEventListener("keydown", (e)=> {

  // if we press escape key we should exit the selection mode
  if(e.key === "Escape" &&  isSelecting) {
      exitSelectionMode();
      return;  
  }

  if(e.key !== "r" || !e.ctrlKey){
    return;
  }

  if(isSelecting){  
    exitSelectionMode();
  }
  else{
    isSelecting = true;
    document.documentElement.style.cursor = "crosshair";
  }
});
 

// Some browser actions like selecting text start on mousedown, before "click" arrives,
// so they must be blocked here while selecting.
document.addEventListener("mousedown", (e) =>{
  if(!isSelecting){
    return
  }

  e.preventDefault();
  e.stopPropagation();
} ,{capture:true});

// Handles the selection clicks (first and second).
// We use "click" because it is the last event of a mouse click, so selection
// mode is still on when it arrives and we can stop links from opening.
// We use capture so our listener runs before the page's own click listeners.
document.addEventListener("click", (e) => {

  if (!isSelecting){return;}

  // stop the browser from following links
  e.preventDefault();
  // stop the page's own click listeners from receiving this click
  e.stopPropagation();

  // first click
  if(startDragX === null){
    startDragX = e.clientX;
    startDragY = e.clientY;
    selectionBox.style.left = startDragX + "px";
    selectionBox.style.top = startDragY + "px";
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    selectionBox.style.display = "block";
  }
  // second click
  else{
    const rect= getPositionSelectionBox(e);
    const message = {type: "captureRegion", rect: rect, screenRatio: devicePixelRatio};
    chrome.runtime.sendMessage(message);
    exitSelectionMode();
  }
}, {capture: true});

// here we define the shape of our selection box after moving our cursor while in selection mode
document.addEventListener("mousemove", (e) => {
  if (startDragX === null){
    return;
  }

  const rect = getPositionSelectionBox(e);
  selectionBox.style.left = rect.left + "px";
  selectionBox.style.top = rect.top + "px";
  selectionBox.style.width = rect.width + "px";
  selectionBox.style.height = rect.height + "px";
    
});

