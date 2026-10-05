console.log("Extensão carregada nesta página!");

// remember where the mouse was last time, so we don't keep looking at the same place
let lastNode = null;
let lastOffset = null;

// simplified mandarim segmenter
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });

// to show our character in a little bullon we will use a tooltip
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

function hideTooltip(){
  tooltip.style.display = "none";
  lastNode = null;
  lastOffset = null;
}

document.addEventListener("mousemove", (event) => {
  // mouse position in pixels
  const x = event.clientX
  const y = event.clientY

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
  if (offset === text.length){
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

  // console.log("Character: ", text[offset], " |Word: ", hoveredWord.segment);
  const wordAndPinyin = `${hoveredWord.segment} | ${pinyinPro.pinyin(hoveredWord.segment)}`
  tooltip.textContent = wordAndPinyin;
  tooltip.style.left = x + 15 + "px";
  tooltip.style.top = y + 10 + "px";

  tooltip.style.display = "block";



});
