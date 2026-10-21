// Ambient Floating Sakura Petals Engine (Lightweight Canvas)
export class SakuraPetals {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d');
    this.petals = [];
    this.maxPetals = 22; // subtle, minimal, not distracting
    this.animId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initPetals();
    this.start();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  initPetals() {
    this.petals = [];
    for (let i = 0; i < this.maxPetals; i++) {
      this.petals.push(this.createPetal(true));
    }
  }

  createPetal(randomY = false) {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -20,
      size: 7 + Math.random() * 8,
      speedY: 0.6 + Math.random() * 0.9,
      speedX: -0.4 + Math.random() * 0.8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
      opacity: 0.25 + Math.random() * 0.45,
      color: Math.random() > 0.4 ? '#fec7d7' : '#ffdce5',
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02
    };
  }

  start() {
    const loop = () => {
      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.petals.length; i++) {
        const p = this.petals[i];
        p.wobble += p.wobbleSpeed;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.wobble) * 0.5;
        p.rotation += p.rotationSpeed;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = p.opacity;

        // Draw soft sakura petal curve
        this.ctx.beginPath();
        this.ctx.fillStyle = p.color;
        this.ctx.moveTo(0, 0);
        this.ctx.bezierCurveTo(p.size * 0.5, -p.size * 0.5, p.size, -p.size * 0.2, p.size * 0.7, p.size * 0.7);
        this.ctx.bezierCurveTo(p.size * 0.3, p.size * 0.8, -p.size * 0.2, p.size * 0.5, 0, 0);
        this.ctx.fill();

        this.ctx.restore();

        // Recycle petal when falling off screen
        if (p.y > this.height + 25 || p.x < -30 || p.x > this.width + 30) {
          this.petals[i] = this.createPetal(false);
        }
      }

      this.animId = requestAnimationFrame(loop);
    };

    loop();
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
