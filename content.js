console.log("Extensão carregada nesta página!");

document.addEventListener("mousemove", (event) => {
  // we get the positions of the cursor (in pixels)
  const x = event.clientX
  const y = event.clientY
  // we convert the pixel coords to a location in the text
  const position_block = document.caretPositionFromPoint(x,y)
  if(position_block===null){
    // if we don't have any text under our cursor we don't want to do anything
    return;
  }

  console.log(position_block.offsetNode.textContent[position_block.offset]);
});