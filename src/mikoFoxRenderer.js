// High-Fidelity Living Procedural Canvas Engine for Yae Miko (Fox Form)
// Renders Miko with continuous organic curves, multi-bone Verlet fluid tail,
// dynamic spring ears, dangling pendulum earrings, gaze-tracking purple eyes,
// and natural animal locomotion.

export class MikoFoxRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // Dimensions
    this.width = 460;
    this.height = 460;
    this.setupResolution();

    // Locomotion & Physics Nodes
    this.baseX = this.width / 2;
    this.baseY = this.height * 0.76;

    // Squash & Stretch
    this.scaleX = 1;
    this.scaleY = 1;
    this.velScaleX = 0;
    this.velScaleY = 0;
    this.offsetY = 0;
    this.offsetX = 0;

    // Spine & Head nodes
    this.headAngle = 0;
    this.targetHeadAngle = 0;
    this.headBob = 0;
    this.breath = 0;

    // Gaze tracking
    this.cursorX = this.width / 2;
    this.cursorY = this.height / 2;
    this.eyeLookX = 0;
    this.eyeLookY = 0;
    this.blinkProgress = 0; // 0 = open, 1 = closed
    this.isBlinking = false;
    this.blinkTimer = 0;
    this.isHappyEyes = false;

    // Ear spring physics
    this.leftEarAngle = 0;
    this.leftEarVel = 0;
    this.rightEarAngle = 0;
    this.rightEarVel = 0;
    this.earTwitchTimer = 0;

    // Earring pendulums
    this.leftEarringAngle = 0;
    this.leftEarringVel = 0;
    this.rightEarringAngle = 0;
    this.rightEarringVel = 0;

    // Multi-segment Verlet Fluid Tail (9 vertebrae)
    this.tailSegments = [];
    const tailLength = 9;
    const segDist = 18;
    for (let i = 0; i < tailLength; i++) {
      this.tailSegments.push({
        x: this.baseX + 40 + i * segDist * 0.8,
        y: this.baseY - 10 - i * 4,
        oldX: this.baseX + 40 + i * segDist * 0.8,
        oldY: this.baseY - 10 - i * 4,
        radius: 26 - i * 1.8 // tapers towards tip
      });
    }

    // Emotions / Interactions
    this.blushOpacity = 0.2;
    this.isPurring = false;
    this.stretchProgress = 0;
    this.isStretching = false;
  }

  setupResolution() {
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  setCursor(x, y, rect) {
    if (!rect) return;
    this.cursorX = (x - rect.left) * (this.width / rect.width);
    this.cursorY = (y - rect.top) * (this.height / rect.height);
  }

  // Update loop (called every frame)
  update(dt, time) {
    // 1. Organic Breathing Rhythm
    this.breath = Math.sin(time * 0.0022) * 4;

    // 2. Head Tilt & Cursor Gaze Tracking
    const headPivotX = this.baseX + this.offsetX;
    const headPivotY = this.baseY - 120 + this.offsetY + this.breath;

    const dx = this.cursorX - headPivotX;
    const dy = this.cursorY - headPivotY;
    const angleToMouse = Math.atan2(dy, dx);
    this.targetHeadAngle = Math.max(-0.25, Math.min(0.25, (angleToMouse - Math.PI / 2) * 0.22));

    // Smooth lerp head tilt
    this.headAngle += (this.targetHeadAngle - this.headAngle) * 8 * dt;

    // Pupil look-at offset
    const dist = Math.hypot(dx, dy);
    const maxLook = 6.0;
    const targetLookX = Math.cos(angleToMouse) * Math.min(dist * 0.02, maxLook);
    const targetLookY = Math.sin(angleToMouse) * Math.min(dist * 0.02, maxLook);
    this.eyeLookX += (targetLookX - this.eyeLookX) * 12 * dt;
    this.eyeLookY += (targetLookY - this.eyeLookY) * 12 * dt;

    // 3. Natural Eye Blinks
    this.blinkTimer += dt;
    if (!this.isBlinking && this.blinkTimer > 3.2 + Math.random() * 2.5) {
      this.isBlinking = true;
      this.blinkTimer = 0;
    }
    if (this.isBlinking) {
      this.blinkProgress += dt * 14;
      if (this.blinkProgress >= 1) {
        this.blinkProgress = 0;
        this.isBlinking = false;
      }
    }

    // 4. Ear Spring Physics & Secondary Lag
    const earStiffness = 180;
    const earDamp = 14;

    // Occasional subtle ear twitch
    this.earTwitchTimer += dt;
    let twitch = 0;
    if (this.earTwitchTimer > 4.5) {
      twitch = Math.sin((this.earTwitchTimer - 4.5) * 30) * 0.12;
      if (this.earTwitchTimer > 4.8) this.earTwitchTimer = 0;
    }

    const leftTarget = -this.headAngle * 0.5 + twitch;
    const rightTarget = -this.headAngle * 0.5 - twitch;

    const leftForce = (leftTarget - this.leftEarAngle) * earStiffness - this.leftEarVel * earDamp;
    this.leftEarVel += leftForce * dt;
    this.leftEarAngle += this.leftEarVel * dt;

    const rightForce = (rightTarget - this.rightEarAngle) * earStiffness - this.rightEarVel * earDamp;
    this.rightEarVel += rightForce * dt;
    this.rightEarAngle += this.rightEarVel * dt;

    // 5. Earring Pendulum Physics (Gravity & Momentum)
    const g = 18;
    const leftAcc = -g * Math.sin(this.leftEarringAngle) - 4 * this.leftEarringVel + this.leftEarVel * 2;
    this.leftEarringVel += leftAcc * dt;
    this.leftEarringAngle += this.leftEarringVel * dt;

    const rightAcc = -g * Math.sin(this.rightEarringAngle) - 4 * this.rightEarringVel + this.rightEarVel * 2;
    this.rightEarringVel += rightAcc * dt;
    this.rightEarringAngle += this.rightEarringVel * dt;

    // 6. Spring-mass Squash and Stretch Recovery
    if (!this.isDragging && !this.isStretching) {
      const k = 160;
      const d = 12;
      const fY = (1.0 - this.scaleY) * k - this.velScaleY * d;
      this.velScaleY += fY * dt;
      this.scaleY += this.velScaleY * dt;

      const fX = (1.0 - this.scaleX) * k - this.velScaleX * d;
      this.velScaleX += fX * dt;
      this.scaleX += this.velScaleX * dt;

      this.offsetX += (0 - this.offsetX) * 10 * dt;
      this.offsetY += (0 - this.offsetY) * 10 * dt;
    }

    // 7. Multi-Bone Fluid Verlet Tail Physics
    this.updateTail(dt, time);
  }

  updateTail(dt, time) {
    // Tail root anchors near right hip/rump
    const tailRootX = this.baseX + 35 * this.scaleX + this.offsetX;
    const tailRootY = this.baseY - 25 * this.scaleY + this.offsetY + this.breath * 0.4;

    this.tailSegments[0].x = tailRootX;
    this.tailSegments[0].y = tailRootY;

    // Sine wave pulse traveling through tail
    const wagSpeed = this.isHappyEyes ? 0.007 : 0.003;
    const wagAmp = this.isHappyEyes ? 22 : 9;

    // Verlet integration for remaining segments
    for (let i = 1; i < this.tailSegments.length; i++) {
      const seg = this.tailSegments[i];
      const vx = (seg.x - seg.oldX) * 0.88;
      const vy = (seg.y - seg.oldY) * 0.88;

      seg.oldX = seg.x;
      seg.oldY = seg.y;

      // Natural curled posture + rhythmic wave
      const naturalAngle = 0.35 + Math.sin(time * wagSpeed - i * 0.45) * 0.25;
      const lift = Math.cos(time * wagSpeed * 0.7) * 2;

      seg.x += vx + Math.cos(naturalAngle) * 0.5;
      seg.y += vy + 0.3 + lift; // slight buoyancy
    }

    // Solve distance constraints (so bones don't stretch apart)
    const targetDist = 18;
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 1; i < this.tailSegments.length; i++) {
        const p1 = this.tailSegments[i - 1];
        const p2 = this.tailSegments[i];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const currentDist = Math.hypot(dx, dy) || 1;
        const diff = (currentDist - targetDist) / currentDist;

        p2.x -= dx * diff * 0.75;
        p2.y -= dy * diff * 0.75;
      }
    }
  }

  // Master Render Method
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const ctx = this.ctx;
    ctx.save();

    // 1. Soft Ground Drop Shadow
    const shadowY = this.baseY + 30;
    const shadowW = 120 * this.scaleX * Math.max(0.6, 1.8 - this.scaleY);
    const shadowH = 22;
    const shadowGrad = ctx.createRadialGradient(this.baseX, shadowY, 0, this.baseX, shadowY, shadowW);
    shadowGrad.addColorStop(0, 'rgba(30, 15, 25, 0.45)');
    shadowGrad.addColorStop(0.6, 'rgba(30, 15, 25, 0.2)');
    shadowGrad.addColorStop(1, 'rgba(30, 15, 25, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(this.baseX + this.offsetX * 0.3, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Multi-Segment Fluid Tail (Curves forward naturally)
    this.drawFluidTail(ctx);

    // 3. Draw Body & Sitting Front Paws
    this.drawBody(ctx);

    // 4. Draw Head with Golden Horns, Fennec Ears, Earrings & Face
    this.drawHead(ctx);

    ctx.restore();
  }

  // Draw smooth, continuous organic tail
  drawFluidTail(ctx) {
    const segs = this.tailSegments;
    if (segs.length < 3) return;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Build left & right envelope points around vertebrae
    const leftPoints = [];
    const rightPoints = [];

    for (let i = 0; i < segs.length; i++) {
      const curr = segs[i];
      const next = segs[i + 1] || curr;
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const angle = Math.atan2(dy, dx) + Math.PI / 2;

      // Voluminous fluffy width
      const r = (32 - i * 2.2) * this.scaleX;

      leftPoints.push({
        x: curr.x + Math.cos(angle) * r,
        y: curr.y + Math.sin(angle) * r
      });
      rightPoints.push({
        x: curr.x - Math.cos(angle) * r,
        y: curr.y - Math.sin(angle) * r
      });
    }

    // Outer pink tail body
    ctx.beginPath();
    ctx.moveTo(leftPoints[0].x, leftPoints[0].y);

    for (let i = 1; i < leftPoints.length; i++) {
      const xc = (leftPoints[i].x + leftPoints[i - 1].x) / 2;
      const yc = (leftPoints[i].y + leftPoints[i - 1].y) / 2;
      ctx.quadraticCurveTo(leftPoints[i - 1].x, leftPoints[i - 1].y, xc, yc);
    }

    const tip = segs[segs.length - 1];
    ctx.lineTo(tip.x, tip.y);

    for (let i = rightPoints.length - 1; i > 0; i--) {
      const xc = (rightPoints[i].x + rightPoints[i - 1].x) / 2;
      const yc = (rightPoints[i].y + rightPoints[i - 1].y) / 2;
      ctx.quadraticCurveTo(rightPoints[i].x, rightPoints[i].y, xc, yc);
    }
    ctx.closePath();

    // Miko pastel pink tail gradient
    const tailGrad = ctx.createLinearGradient(segs[0].x, segs[0].y, tip.x, tip.y);
    tailGrad.addColorStop(0, '#f9bcc5');
    tailGrad.addColorStop(0.7, '#fed2d8');
    tailGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = tailGrad;
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 4.5;
    ctx.fill();
    ctx.stroke();

    // Distinct White Fluffy Tip at the end of the tail
    const tipBase = segs[segs.length - 3];
    ctx.beginPath();
    ctx.moveTo(leftPoints[segs.length - 3].x, leftPoints[segs.length - 3].y);
    ctx.quadraticCurveTo(tipBase.x + 8, tipBase.y - 8, tip.x, tip.y);
    ctx.quadraticCurveTo(tipBase.x - 8, tipBase.y + 8, rightPoints[segs.length - 3].x, rightPoints[segs.length - 3].y);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // Draw continuous organic torso and front sitting paws
  drawBody(ctx) {
    ctx.save();
    const bx = this.baseX + this.offsetX;
    const by = this.baseY + this.offsetY;
    const sx = this.scaleX;
    const sy = this.scaleY;
    const breath = this.breath;

    // Pear-shaped sitting body
    ctx.beginPath();
    ctx.moveTo(bx - 55 * sx, by + 20 * sy);
    // Left hip to neck
    ctx.bezierCurveTo(bx - 70 * sx, by - 40 * sy, bx - 45 * sx, by - 100 * sy + breath, bx - 30 * sx, by - 120 * sy + breath);
    // Neck bridge
    ctx.lineTo(bx + 30 * sx, by - 120 * sy + breath);
    // Right neck to right hip
    ctx.bezierCurveTo(bx + 45 * sx, by - 100 * sy + breath, bx + 70 * sx, by - 40 * sy, bx + 55 * sx, by + 20 * sy);
    // Bottom sitting base
    ctx.bezierCurveTo(bx + 40 * sx, by + 32 * sy, bx - 40 * sx, by + 32 * sy, bx - 55 * sx, by + 20 * sy);
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(bx, by - 120, bx, by + 30);
    bodyGrad.addColorStop(0, '#ffe4e8');
    bodyGrad.addColorStop(0.6, '#fed0d7');
    bodyGrad.addColorStop(1, '#fbaebb');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 5;
    ctx.fill();
    ctx.stroke();

    // White Chest Fluff
    ctx.beginPath();
    ctx.moveTo(bx - 22 * sx, by - 110 * sy + breath);
    ctx.quadraticCurveTo(bx, by - 60 * sy, bx - 8 * sx, by + 5 * sy);
    ctx.quadraticCurveTo(bx, by + 12 * sy, bx + 8 * sx, by + 5 * sy);
    ctx.quadraticCurveTo(bx, by - 60 * sy, bx + 22 * sx, by - 110 * sy + breath);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Front Sitting Paws
    this.drawPaw(ctx, bx - 22 * sx, by + 5 * sy, 18, 25);
    this.drawPaw(ctx, bx + 22 * sx, by + 5 * sy, 18, 25);

    ctx.restore();
  }

  drawPaw(ctx, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.5, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe5e9';
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();

    // Toe indents
    ctx.beginPath();
    ctx.moveTo(x - 3, y + h * 0.3);
    ctx.lineTo(x - 3, y + h * 0.85);
    ctx.moveTo(x + 3, y + h * 0.3);
    ctx.lineTo(x + 3, y + h * 0.85);
    ctx.strokeStyle = '#502a3d';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // Draw Head, Golden Horns, Earrings, and Expressive Face
  drawHead(ctx) {
    ctx.save();
    const hx = this.baseX + this.offsetX;
    const hy = this.baseY - 120 + this.offsetY + this.breath;

    ctx.translate(hx, hy);
    ctx.rotate(this.headAngle);

    // 1. Golden Ceremonial Shrine Horns (Pinned behind the ears)
    this.drawGoldenHorns(ctx);

    // 2. Wide Fennec Fox Ears
    this.drawEars(ctx);

    // 3. Dangling Golden Earrings (Pendulum Physics)
    this.drawEarrings(ctx);

    // 4. Fox Head Contour with Cheek Fur Tufts (3 on each side)
    ctx.beginPath();
    // Top of head between ears
    ctx.moveTo(-50, -40);
    ctx.quadraticCurveTo(0, -52, 50, -40);
    // Right temple to right cheek tufts
    ctx.bezierCurveTo(70, -10, 85, 10, 78, 24);
    ctx.lineTo(92, 22); // tuft 1
    ctx.lineTo(82, 34);
    ctx.lineTo(95, 33); // tuft 2
    ctx.lineTo(80, 45);
    ctx.lineTo(90, 48); // tuft 3
    // Right cheek to cute chin
    ctx.quadraticCurveTo(45, 75, 0, 75);
    // Chin to left cheek tufts
    ctx.quadraticCurveTo(-45, 75, -80, 48);
    ctx.lineTo(-90, 48); // left tuft 3
    ctx.lineTo(-82, 34);
    ctx.lineTo(-95, 33); // left tuft 2
    ctx.lineTo(-78, 24);
    ctx.lineTo(-92, 22); // left tuft 1
    // Left temple to top of head
    ctx.bezierCurveTo(-85, 10, -70, -10, -50, -40);
    ctx.closePath();

    const headGrad = ctx.createLinearGradient(0, -50, 0, 75);
    headGrad.addColorStop(0, '#ffe8eb');
    headGrad.addColorStop(0.65, '#fed2d8');
    headGrad.addColorStop(1, '#fbaec0');

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 5;
    ctx.fill();
    ctx.stroke();

    // 5. Cheek Blush (Increases when petted/loved)
    const blushAlpha = this.isHappyEyes ? 0.75 : this.blushOpacity;
    ctx.fillStyle = `rgba(255, 110, 145, ${blushAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-48, 38, 14, 8, -0.1, 0, Math.PI * 2);
    ctx.ellipse(48, 38, 14, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 6. Eyes (Purple Anime Eyes with specular shine OR Happy closed curves)
    this.drawEyes(ctx);

    // 7. Cute Black Rounded Fox Nose & Cat Mouth ":3"
    // Nose
    ctx.beginPath();
    ctx.moveTo(-5, 32);
    ctx.quadraticCurveTo(0, 30, 5, 32);
    ctx.quadraticCurveTo(0, 40, -5, 32);
    ctx.closePath();
    ctx.fillStyle = '#2d1424';
    ctx.fill();
    // Nose gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1, 33, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Smiling Cat Mouth ":3"
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(0, 45);
    ctx.quadraticCurveTo(-7, 54, -14, 49);
    ctx.moveTo(0, 45);
    ctx.quadraticCurveTo(7, 54, 14, 49);
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // Draw Golden Sacred Shrine Horns (Headdress)
  drawGoldenHorns(ctx) {
    ctx.save();
    // Gold Gradient
    const goldGrad = ctx.createLinearGradient(0, -100, 0, 0);
    goldGrad.addColorStop(0, '#fff4bb');
    goldGrad.addColorStop(0.4, '#f7d770');
    goldGrad.addColorStop(1, '#db9b2d');

    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = '#6f4a18';
    ctx.lineWidth = 3.5;

    // Left Horn
    ctx.save();
    ctx.translate(-40, -25);
    ctx.rotate(-0.15 + this.leftEarAngle * 0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-25, -40, -35, -80, -10, -105);
    ctx.bezierCurveTo(15, -75, 10, -40, 10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Horn gold detail ridge
    ctx.beginPath();
    ctx.moveTo(-8, -45);
    ctx.quadraticCurveTo(0, -70, -5, -95);
    ctx.strokeStyle = '#fff8cf';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Right Horn
    ctx.save();
    ctx.translate(40, -25);
    ctx.rotate(0.15 + this.rightEarAngle * 0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(25, -40, 35, -80, 10, -105);
    ctx.bezierCurveTo(-15, -75, -10, -40, -10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6f4a18';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Horn gold detail ridge
    ctx.beginPath();
    ctx.moveTo(8, -45);
    ctx.quadraticCurveTo(0, -70, 5, -95);
    ctx.strokeStyle = '#fff8cf';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Draw Fennec Fox Ears with White Fluffy Ruffles
  drawEars(ctx) {
    ctx.save();

    // Left Ear
    ctx.save();
    ctx.translate(-45, -28);
    ctx.rotate(-0.55 + this.leftEarAngle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-45, -25, -110, -30, -130, -20);
    ctx.bezierCurveTo(-100, 30, -40, 35, 0, 18);
    ctx.closePath();

    const leftEarGrad = ctx.createLinearGradient(0, 0, -120, 0);
    leftEarGrad.addColorStop(0, '#fed0d7');
    leftEarGrad.addColorStop(1, '#f9a7b6');
    ctx.fillStyle = leftEarGrad;
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 4.5;
    ctx.fill();
    ctx.stroke();

    // Inner Ear Warm Pink
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.bezierCurveTo(-45, -15, -95, -20, -105, -12);
    ctx.bezierCurveTo(-75, 18, -30, 20, -10, 8);
    ctx.closePath();
    ctx.fillStyle = '#ffccd5';
    ctx.fill();

    // White Fluffy Fur Ruffles along lower ear edge
    ctx.beginPath();
    ctx.moveTo(-20, 15);
    ctx.quadraticCurveTo(-45, 26, -65, 20);
    ctx.quadraticCurveTo(-85, 24, -115, -8);
    ctx.quadraticCurveTo(-95, 2, -60, 4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right Ear
    ctx.save();
    ctx.translate(45, -28);
    ctx.rotate(0.55 + this.rightEarAngle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(45, -25, 110, -30, 130, -20);
    ctx.bezierCurveTo(100, 30, 40, 35, 0, 18);
    ctx.closePath();

    const rightEarGrad = ctx.createLinearGradient(0, 0, 120, 0);
    rightEarGrad.addColorStop(0, '#fed0d7');
    rightEarGrad.addColorStop(1, '#f9a7b6');
    ctx.fillStyle = rightEarGrad;
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 4.5;
    ctx.fill();
    ctx.stroke();

    // Inner Ear Warm Pink
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.bezierCurveTo(45, -15, 95, -20, 105, -12);
    ctx.bezierCurveTo(75, 18, 30, 20, 10, 8);
    ctx.closePath();
    ctx.fillStyle = '#ffccd5';
    ctx.fill();

    // White Fluffy Fur Ruffles along lower ear edge
    ctx.beginPath();
    ctx.moveTo(20, 15);
    ctx.quadraticCurveTo(45, 26, 65, 20);
    ctx.quadraticCurveTo(85, 24, 115, -8);
    ctx.quadraticCurveTo(95, 2, 60, 4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Draw Dangling Golden Earrings (Pendulum Physics)
  drawEarrings(ctx) {
    ctx.save();
    const goldGrad = ctx.createLinearGradient(0, 0, 0, 30);
    goldGrad.addColorStop(0, '#fff4bb');
    goldGrad.addColorStop(0.5, '#f7d770');
    goldGrad.addColorStop(1, '#db9b2d');

    // Left Earring
    ctx.save();
    ctx.translate(-62, 10);
    ctx.rotate(this.leftEarringAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 14);
    ctx.strokeStyle = '#c49733';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Golden Diamond / Rhombus Pendant
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-7, 24);
    ctx.lineTo(0, 34);
    ctx.lineTo(7, 24);
    ctx.closePath();
    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = '#6f4a18';
    ctx.lineWidth = 2.2;
    ctx.fill();
    ctx.stroke();
    // Inner sparkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 24, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Earring
    ctx.save();
    ctx.translate(62, 10);
    ctx.rotate(this.rightEarringAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 14);
    ctx.strokeStyle = '#c49733';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Golden Diamond / Rhombus Pendant
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-7, 24);
    ctx.lineTo(0, 34);
    ctx.lineTo(7, 24);
    ctx.closePath();
    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = '#6f4a18';
    ctx.lineWidth = 2.2;
    ctx.fill();
    ctx.stroke();
    // Inner sparkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 24, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // Draw Purple Anime Eyes (or Happy Curved ^ ^ Eyes)
  drawEyes(ctx) {
    ctx.save();

    // When happy or blinking: draw closed joyful eyelashes
    if (this.isHappyEyes || this.blinkProgress > 0.4) {
      // Left eye happy arch
      ctx.beginPath();
      ctx.arc(-34, 14, 12, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.strokeStyle = '#431934';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Right eye happy arch
      ctx.beginPath();
      ctx.arc(34, 14, 12, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.strokeStyle = '#431934';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Open Eyes
    const lx = -34;
    const rx = 34;
    const eyeY = 12;

    this.drawSingleEye(ctx, lx, eyeY, false);
    this.drawSingleEye(ctx, rx, eyeY, true);

    ctx.restore();
  }

  drawSingleEye(ctx, x, y, isRight) {
    ctx.save();
    // Sclera / Eye Socket
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 17, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdfa';
    ctx.strokeStyle = '#4e2a3c';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Iris (Gaze Shifted)
    const px = x + this.eyeLookX;
    const py = y + this.eyeLookY;

    ctx.save();
    // Clip to sclera
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 16, 0, 0, Math.PI * 2);
    ctx.clip();

    // Deep Violet to Lilac Iris Gradient
    const irisGrad = ctx.createRadialGradient(px, py - 3, 2, px, py, 14);
    irisGrad.addColorStop(0, '#e59bf5');
    irisGrad.addColorStop(0.45, '#963c95');
    irisGrad.addColorStop(0.85, '#4e194c');
    irisGrad.addColorStop(1, '#2c0c2e');

    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(px, py, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large Sparkle Shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px - 3.5, py - 4.5, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Secondary Small Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(px + 4, py + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fluttery Anime Winged Eyelashes
    ctx.beginPath();
    if (!isRight) {
      ctx.arc(x, y - 2, 14, 1.2 * Math.PI, 1.95 * Math.PI);
      ctx.lineTo(x + 14, y - 6);
    } else {
      ctx.arc(x, y - 2, 14, 1.05 * Math.PI, 1.8 * Math.PI);
      ctx.lineTo(x - 14, y - 6);
    }
    ctx.strokeStyle = '#431934';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
}
