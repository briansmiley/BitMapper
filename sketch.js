let writer;
let clearButton;
let copyButton;
let canvas, fontPreviewCanvas;
let font;
let inputs = {};
let previewArea;
let fontPreviewInput;
const [initialW, initialH] = [4, 5];
const CELL_SIZE = 50;
const X_MARGIN = 4;
const Y_MARGIN = 9;
function preload() {
  font = loadJSON("./font.json");
}
function setup() {
  gridCanvas = createCanvas(initialW * CELL_SIZE, initialH * CELL_SIZE);
  gridCanvas.parent("canvas-box");
  fontPreviewCanvas = createGraphics(
    200,
    100,
    document.getElementById("font-preview-canvas")
  );
  fontPreviewCanvas.style("display", "block");
  writer = new CharacterWriter(CELL_SIZE);

  //HTML Interface stuff
  clearButton = document.getElementById("clear-writer-button");
  clearButton.onclick = () => writer.clear();
  copyButton = document.getElementById("copy-writer-button");
  copyButton.onclick = () => writer.copy();
  inputs.w = document.getElementById("char-width-input");
  inputs.h = document.getElementById("char-height-input");
  inputs.chId = document.getElementById("char-id");
  inputs.w.value = initialW;
  inputs.h.value = initialH;
  inputs.w.addEventListener("change", () => {
    inputs.w.value = inputs.w.value || 1;
    writer.resize(inputs.w.value, writer.charHeight);
  });
  inputs.h.addEventListener("change", () => {
    inputs.h.value = inputs.h.value || 1;
    writer.resize(writer.charWidth, inputs.h.value);
  });
  previewArea = document.getElementById("array-preview");
  fontPreviewInput = document.getElementById("font-preview-input");
  fontPreviewInput.value =
    "ABCDEDFGHIJKLMNOPQRSTUVWXYZ\n1234567890\n`~!@#$%^&*())-+=_[]{}/\\|,.<>?";
}

function draw() {
  background(220);
  fontPreviewCanvas.background(255);
  writer.update();
  writer.render();

  //fetch the text from the preview input
  const fontPreviewText = fontPreviewInput.value.toUpperCase();

  //write the Test text in pixel font and save the ending offset valus
  const { _, offsetY } = drawString(
    fontPreviewText,
    X_MARGIN,
    Y_MARGIN,
    0,
    fontPreviewCanvas
  );

  //draw the currently-constructed character below the preview text
  drawCharacter(
    writer.pixels,
    X_MARGIN,
    Y_MARGIN + offsetY + 2 * font.lineHeight,
    0,
    fontPreviewCanvas
  );
  //render magnifying glass effect on preview canvas
  magnifyPreview();
}

class CharacterWriter {
  constructor(
    cellSize = CELL_SIZE,
    charHeight = initialH,
    charWidth = initialW
  ) {
    this.cellSize = cellSize;
    this.charHeight = charHeight;
    this.charWidth = charWidth;
    this.pixels = this.newPixelArray(0);
    this.dragging = false;
    this.dragSetVal = 1;
  }
  resize(newWidth, newHeight) {
    const w = Number(newWidth);
    const h = Number(newHeight);
    const widthDiff = w - this.charWidth;
    const heightDiff = h - this.charHeight;
    const dummyRow = Array(w).fill(0);
    this.charWidth = w;
    this.charHeight = h;
    if (widthDiff > 0)
      this.pixels = this.pixels.map((row) => row.concat(dummyRow));
    if (heightDiff > 0)
      this.pixels = this.pixels.concat(Array(heightDiff).fill([...dummyRow]));
    this.pixels = this.pixels.slice(0, h).map((row) => row.slice(0, w));
    gridCanvas.resize(
      this.charWidth * this.cellSize,
      this.charHeight * this.cellSize
    );
    this.render();
    // background(255);
  }

  newPixelArray(value = 0) {
    const arr = Array(this.charHeight)
      .fill(0)
      .map((_) => Array(this.charWidth).fill(value));
    return arr;
  }
  flipPixel(x, y) {
    this.pixels[y][x] = this.pixels[y][x] ? 0 : 1;
  }
  setPixel(x, y, value) {
    this.pixels[y][x] = value ? 1 : 0;
  }
  createArrayString() {
    const preArrayString = `${
      inputs.chId.value ? `"${inputs.chId.value}"` : " "
    }: `;
    const arrayString = `[${this.pixels
      .map((row) => `[${row.join(", ")}]`)
      .join(`,\n${" ".repeat(preArrayString.length + 1)}`)}],`;
    return preArrayString.concat(arrayString);
  }
  copy() {
    const str = this.createArrayString();
    window.navigator.clipboard.writeText(str + "\n");
    console.log(str);
  }
  clear() {
    this.pixels = this.newPixelArray(0);
  }
  handleClickRelease() {
    this.dragging = false;
  }
  handleClickStart() {
    const mouseXY = this.mousePositionOnThis();
    if (!mouseXY) return;
    this.startDrag(mouseXY);
  }
  startDrag({ x, y }) {
    this.dragging = true;
    this.dragSetVal = this.pixels[y][x] ? 0 : 1; //whether we are turning on/off pixels depends on starting square value
  }
  mousePositionOnThis() {
    let { x, y } = this.getMouseXY();
    if (x < 0 || x >= this.pixels[0].length || y < 0 || y >= this.pixels.length)
      return false;
    else return { x, y };
  }
  getMouseXY() {
    const x = Math.floor(mouseX / this.cellSize);
    const y = Math.floor(mouseY / this.cellSize);
    return { x, y };
  }
  handleDragging() {
    const pos = this.mousePositionOnThis();
    if (!pos) return;
    if (this.dragging) this.setPixel(pos.x, pos.y, this.dragSetVal);
  }
  update() {
    this.handleDragging();
    previewArea.value = this.createArrayString();
    previewArea.rows = this.pixels.length;
  }
  render() {
    push();
    const { x: mX, y: mY } = this.getMouseXY();
    clear();
    stroke(0);
    for (let y = 0; y < this.charHeight; y++) {
      for (let x = 0; x < this.charWidth; x++) {
        const hovered = mX == x && mY == y;
        const offColor = hovered ? 170 : 255;
        // if (x == 0 && y == 0 && !(frameCount % 10)) console.log(offColor);
        const fillColor = this.pixels[y][x] ? 50 : offColor;
        fill(fillColor);
        // if (!(frameCount % 10)) console.log(fillColor);

        rect(x * this.cellSize, y * this.cellSize, this.cellSize);
      }
    }
    pop();
  }
}
function mousePressed() {
  writer.handleClickStart();
}

function mouseClicked() {
  writer.handleClickRelease();
}

let fontPreviewMouseXY = () => {
  let gridCanvasRect = gridCanvas.elt.getBoundingClientRect();
  let fontPreviewCanvasRect = fontPreviewCanvas.elt.getBoundingClientRect();
  let xOffset = fontPreviewCanvasRect.x - gridCanvasRect.x;
  let yOffset = fontPreviewCanvasRect.y - gridCanvasRect.y;
  return { x: mouseX - xOffset, y: mouseY - yOffset };
};

function magnifyPreview() {
  const mousePos = fontPreviewMouseXY();
  //do nothing if mouse isnt hovering the preview canvas
  if (
    mousePos.x < 0 ||
    mousePos.x > fontPreviewCanvas.width ||
    mousePos.y < 0 ||
    mousePos.y > fontPreviewCanvas.height
  )
    return;
  //buffer the canvas
  const buffer = fontPreviewCanvas.get();
  const magnifierSize = 50;
  const magnifierScale = 5;
  fontPreviewCanvas.image(
    buffer, //source image
    mousePos.x, //destination for image
    mousePos.y,
    magnifierSize, //size of imaged image
    magnifierSize,
    max(mousePos.x - magnifierSize / (magnifierScale * 2), 0), //top left corner of source region in image source
    max(mousePos.y - magnifierSize / (magnifierScale * 2), 0),
    magnifierSize / magnifierScale, // dimensions of source subsection to image
    magnifierSize / magnifierScale
  );
}
