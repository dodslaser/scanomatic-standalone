export default function CanvasState(canvas) {
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(
      document.defaultView.getComputedStyle(canvas, null).paddingLeft,
      10,
    ) || 0;
    this.stylePaddingTop = parseInt(
      document.defaultView.getComputedStyle(canvas, null).paddingTop,
      10,
    ) || 0;
    this.styleBorderLeft = parseInt(
      document.defaultView.getComputedStyle(canvas, null).borderLeftWidth,
      10,
    ) || 0;
    this.styleBorderTop = parseInt(
      document.defaultView.getComputedStyle(canvas, null).borderTopWidth,
      10,
    ) || 0;
  }
  const html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  this.needsRender = true;
  this.shapes = [];
  this.dragging = false;
  this.selection = null;
  this.dragoffx = 0;
  this.dragoffy = 0;

  canvas.addEventListener(
    'selectstart',
    (e) => { e.preventDefault(); return false; },
    false,
  );

  canvas.addEventListener('mousedown', (e) => {
    const mouse = this.getMouse(e);
    const mx = mouse.x;
    const my = mouse.y;
    const { shapes } = this;
    const l = shapes.length;
    for (let i = l - 1; i >= 0; i -= 1) {
      if (shapes[i].contains(mx, my)) {
        const mySel = shapes[i];
        this.dragoffx = mx - mySel.x;
        this.dragoffy = my - mySel.y;
        this.dragging = true;
        this.selection = mySel;
        this.needsRender = true;
        return;
      }
    }
    // Haven't returned means we have failed to select anything.
    // If there was an object selected, we deselect it
    if (this.selection) {
      this.selection = null;
      this.needsRender = true; // Need to clear the old selection border
    }
  }, true);
  canvas.addEventListener('mousemove', (e) => {
    if (this.dragging) {
      const mouse = this.getMouse(e);
      this.selection.x = mouse.x - this.dragoffx;
      this.selection.y = mouse.y - this.dragoffy;
      this.needsRender = true; // Something's dragging so we must redraw
    }
  }, true);
  canvas.addEventListener('mouseup', () => {
    this.dragging = false;
  }, true);

  this.selectionColor = '#CC0000';
  this.selectionWidth = 2;
  this.interval = 30;
  setInterval(() => { this.draw(); }, this.interval);
}

CanvasState.prototype.addShape = function addShape(Blob) {
  this.shapes.push(Blob);
  this.needsRender = true;
};

CanvasState.prototype.clear = function clear() {
  this.ctx.clearRect(0, 0, this.width, this.height);
};

CanvasState.prototype.draw = function draw() {
  if (this.needsRender) {
    const { ctx } = this;
    const { shapes } = this;
    this.clear();

    const l = shapes.length;
    for (let i = 0; i < l; i += 1) {
      const Blob = shapes[i];
      if (!(
        Blob.x > this.width
        || Blob.y > this.height
        || Blob.x + Blob.w < 0
        || Blob.y + Blob.h < 0
      )) {
        shapes[i].draw(ctx);
      }
    }

    if (this.selection != null) {
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = this.selectionWidth;
      const mySel = this.selection;
      ctx.strokeRect(mySel.x, mySel.y, mySel.w, mySel.h);
    }

    this.needsRender = false;
  }
};

CanvasState.prototype.getMouse = function getMouse(e) {
  const element = this.canvas;
  let offsetX = 0;
  let offsetY = 0;

  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element === element.offsetParent));
  }

  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  const mx = e.pageX - offsetX;
  const my = e.pageY - offsetY;

  return { x: mx, y: my };
};
