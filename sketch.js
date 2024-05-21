let writer;
let clearButton;
let copyButton;
let canvas, fontPreviewCanvas;
let font;
let inputs = {};
let charErrorLogged = {};
let previewArea;
let fontPreviewInput;
const [initialW, initialH] = [4, 5];
const CELL_SIZE = 50;
function preload() {
  font = loadJSON("./font.json");
}
function setup() {
  canvas = createCanvas(initialW * CELL_SIZE, initialH * CELL_SIZE);
  canvas.parent("canvas-box");
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
  fontPreviewInput.value = "ABCD";
}

function draw() {
  background(220);
  fontPreviewCanvas.background(255);
  writer.update();
  writer.render();
  // drawString("1 2 3 1\n11AA 0 0 123", 10, 10, color("black"));
  const fontPreviewText = fontPreviewInput.value;
  drawString(fontPreviewText, 5, 5, 0, fontPreviewCanvas);
}

function drawCharacter(char, charX, charY, charColor, targetGraphics) {
  targetGraphics.loadPixels();
  const pixels = getFontChar(char);
  /* charX, charY should be bottom left corner of character
  so pixel position is charX + pixelX (normal)
  and charY - (charHeight - pixelY); i.e. start at bottom corner then move up
  */
  for (let [pixelY, row] of pixels.entries()) {
    for (let [pixelX, pixel] of row.entries()) {
      if (pixel)
        targetGraphics.set(
          charX + pixelX,
          charY - (pixels.length - 1 - pixelY),
          charColor
        );
    }
  }
  targetGraphics.updatePixels();
}
function getFontChar(char) {
  let ret;
  try {
    ret = font.chars[char];
    if (!ret) {
      ret = font.chars["█"];
      if (!charErrorLogged[char]) {
        charErrorLogged[char] = true;
        throw new Error(`${char} is not in the font`);
      }
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    return ret;
  }
}
function drawString(str, x, y, charColor, targetGraphics) {
  let offsetX = 0;
  let offsetY = 0;
  for (char of str) {
    if (char == "\n") {
      offsetY += font.lineHeight;
      offsetX = 0;
      continue;
    }

    drawCharacter(char, x + offsetX, y + offsetY, charColor, targetGraphics);
    const characterWidth = getFontChar(char)[0].length;
    offsetX += characterWidth;
  }
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
    canvas.resize(
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
