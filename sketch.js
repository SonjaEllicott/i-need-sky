//setup the p5.js file in HTML and DOM
// Phase 1 (fixed): Origin-based cloud generator
// - Each cloud is generated in local space around (0,0), then placed via translate(originX, originY)
// - No noLoop/redraw issues: we render on demand via renderScene()

let seed = 1;
let showOrigin = false;

function getCanvasSize() {
  const wrap = document.getElementById("canvasWrap");
  const w = wrap ? wrap.clientWidth : window.innerWidth;

  // Keep a nice aspect ratio (3:2). Clamp so it doesn't get enormous.
  const cw = Math.min(w, 980);
  const ch = Math.round(cw * 2 / 3);
  return { cw, ch };
}

function setup() {
  const { cw, ch } = getCanvasSize();
  const c = createCanvas(cw, ch);
  c.parent("canvasWrap");

  const ui = select("#ui");
  
  createButton("Generate Cumulus").parent(ui).mousePressed(renderCumulus);
  createButton("Generate Cirrus").parent(ui).mousePressed(renderCirrus);
  createButton("Save PNG").parent(ui).mousePressed(() => saveCanvas("cloud", "png"));

  renderCumulus();
}

function windowResized() {
  const { cw, ch } = getCanvasSize();
  resizeCanvas(cw, ch);
  renderCumulus(); // or re-render your "last generated" cloud
}

// functions below
function renderCumulus() {
  // draw cloud
}

function renderCirrus() {
  // draw cloud
}

function reseed() {
  seed++;
  randomSeed(seed);
  noiseSeed(seed);
}

function renderScene(drawCloudFn) {
  reseed();
  drawSky();

  // Choose a cloud origin on the canvas
  const originX = random(width * 0.25, width * 0.75);
  const originY = random(height * 0.25, height * 0.55);

  push();
  translate(originX, originY);

  if (showOrigin) drawOriginCross();

  // Draw cloud in LOCAL SPACE around (0,0)
  drawCloudFn();

  pop();

}

function renderCumulus() {
  renderScene(() => {
    const w = random(320, 520);
    const h = w * random(0.35, 0.55);
    drawCumulusLocal(w, h);
  });
}

function renderCirrus() {
  renderScene(() => {
    const len = random(520, 820);
    const thickness = random(40, 90);
    const angle = random(-0.25, 0.25);
    rotate(angle);
    drawCirrusLocal(len, thickness);
  });
}

// ---------------- SKY ----------------
function drawSky() {
  // simple gradient sky
  const topCol = color(160, 205, 255);
  const botCol = color(235, 250, 255);

  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    stroke(lerpColor(topCol, botCol, t));
    line(0, y, width, y);
  }
}

function drawOriginCross() {
  push();
  stroke(255, 80);
  strokeWeight(2);
  line(-12, 0, 12, 0);
  line(0, -12, 0, 12);
  pop();
}

// ---------------- CUMULUS (LOCAL SPACE) ----------------
// We build a cohesive cloud by sampling points inside an ellipse centered at (0,0).
// All puffs are positioned relative to origin and constrained into a soft silhouette.
function drawCumulusLocal(w, h) {
  push();
  noStroke();

  // Underbelly shadow layer
  drawPuffClusterLocal(w * 0.98, h * 0.85, color(210, 225, 240, 120), 260, 0, h * 0.10);

  // Main body
  drawPuffClusterLocal(w, h, color(255, 255, 255, 170), 320, 0, 0);

  // Highlights (slightly up/left)
  drawPuffClusterLocal(w * 0.75, h * 0.65, color(255, 255, 255, 150), 200, -w * 0.06, -h * 0.16);

  // Misty edge softening
  softMistLocal(w, h);

  pop();
}

function drawPuffClusterLocal(w, h, col, count, offsetX, offsetY) {
  fill(col);

  // Sample positions INSIDE an ellipse so it stays cohesive.
  for (let i = 0; i < count; i++) {
    const p = samplePointInEllipse(w * 0.52, h * 0.52);

    // Local position relative to origin
    const px = p.x + offsetX + randomGaussian(0, w * 0.03);
    const py = p.y + offsetY + randomGaussian(0, h * 0.03);

    // Use noise to vary puff sizes across the shape
    const n = noise((px + 1000) * 0.006, (py + 1000) * 0.006);
    const r = lerp(w * 0.06, w * 0.15, n) * random(0.7, 1.15);

    ellipse(px, py, r * 1.25, r);
  }
}

function samplePointInEllipse(rx, ry) {
  // Rejection sampling for uniform-ish distribution in ellipse
  // (fast enough for this use case)
  while (true) {
    const x = random(-rx, rx);
    const y = random(-ry, ry);
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
      return { x, y };
    }
  }
}

function softMistLocal(w, h) {
  // Sprinkle translucent dots around the perimeter band to soften edges
  for (let i = 0; i < 1600; i++) {
    const ang = random(TWO_PI);

    // perimeter-ish radius band
    const rrX = random(0.45, 0.75) * (w * 0.5);
    const rrY = random(0.45, 0.75) * (h * 0.5);

    const px = cos(ang) * rrX + randomGaussian(0, w * 0.02);
    const py = sin(ang) * rrY + randomGaussian(0, h * 0.02);

    const n = noise((px + 2000) * 0.01, (py + 2000) * 0.01);
    const a = lerp(0, 45, n);

    noStroke();
    fill(255, 255, 255, a);
    const s = random(6, 18);
    ellipse(px, py, s, s);
  }
}

// ---------------- CIRRUS (LOCAL SPACE) ----------------
// Cirrus = a bunch of wispy filaments spanning along x-axis in local coords.
function drawCirrusLocal(len, thickness) {
  push();

  // Filaments
  for (let i = 0; i < 280; i++) {
    const yBase = randomGaussian(0, thickness * 0.28);

    const x0 = -len * 0.5 + random(-40, 40);
    const x1 = len * 0.5 + random(-40, 40);

    const wav = random(8, 26);
    const steps = int(random(30, 54));

    noFill();
    beginShape();
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = lerp(x0, x1, t);

      const n = noise((x + 5000) * 0.004, (yBase + 5000) * 0.02);
      const y = yBase + (n - 0.5) * wav;

      // fade ends so it looks wispy
      const edge = smoothstep(0.0, 0.14, t) * (1.0 - smoothstep(0.86, 1.0, t));
      const alpha = 90 * edge;

      stroke(255, 255, 255, alpha);
      strokeWeight(1);
      vertex(x, y);
    }
    endShape();
  }

  // Haze layer
  noStroke();
  for (let i = 0; i < 1200; i++) {
    const x = random(-len * 0.55, len * 0.55);
    const y = randomGaussian(0, thickness * 0.35);
    const n = noise((x + 7000) * 0.006, (y + 7000) * 0.02);
    const a = lerp(0, 55, n);

    fill(255, 255, 255, a);
    ellipse(x, y, random(3, 12), random(3, 10));
  }

  pop();
}

// ---------------- POST ----------------


function smoothstep(edge0, edge1, x) {
  const t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
