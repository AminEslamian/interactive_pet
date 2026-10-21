// MikoMeshEngine: 2.5D WebGL Mesh Deformation Engine for Yae Miko Fox Form
// Provides real-time skeletal mesh deformation (Live2D/Spine style):
// - Multi-segment harmonic wave tail wagging
// - Independent ear twitching & spring dynamics
// - Dangling golden earring pendulums
// - 2.5D gaze-tracking eye parallax & neck tilting
// - Organic rhythmic chest breathing (grounded paws)
// - Volume-conserving mochi squash & stretch spring physics
// - Smooth blinking & happy expression crossfading with blush

export class MikoMeshEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true }) ||
              canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    if (!this.gl) {
      console.warn('WebGL not supported, falling back to 2D');
      this.isWebGL = false;
      return;
    }
    this.isWebGL = true;

    // Grid resolution (32x32 = 1024 vertices, 1922 triangles)
    this.gridX = 32;
    this.gridY = 32;
    this.numVertices = (this.gridX + 1) * (this.gridY + 1);
    this.numIndices = this.gridX * this.gridY * 6;

    // Canvas size (proportional & generous to prevent any clipping)
    this.width = 480;
    this.height = 500;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Dynamic State
    this.time = 0;
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;
    this.relativeMouseX = 0;
    this.relativeMouseY = 0;

    // Physics parameters
    this.headAngle = 0;
    this.headAngleVel = 0;
    this.leftEarSpring = 0;
    this.leftEarVel = 0;
    this.rightEarSpring = 0;
    this.rightEarVel = 0;
    this.leftEarring = 0;
    this.leftEarringVel = 0;
    this.rightEarring = 0;
    this.rightEarringVel = 0;

    // Ear twitches
    this.twitchLeft = 0;
    this.twitchRight = 0;
    this.lastTwitchTime = 0;

    // Tail motion
    this.wagSpeed = 2.4;
    this.wagAmp = 0.45;
    this.wagIntensity = 1.0;

    // Squash & Stretch
    this.scaleX = 1;
    this.scaleY = 1;
    this.velScaleX = 0;
    this.velScaleY = 0;
    this.dragX = 0;
    this.dragY = 0;
    this.isDragging = false;

    // Expressions
    this.happyWeight = 0;
    this.targetHappyWeight = 0;
    this.blushWeight = 0;
    this.targetBlushWeight = 0;
    this.isBlinking = false;
    this.blinkTimer = 0;

    // Initializing WebGL buffers & shaders
    this.initShaders();
    this.initGeometry();
    this.loadTextures();
  }

  initShaders() {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      uniform mat4 u_matrix;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_texNormal;
      uniform sampler2D u_texHappy;
      uniform float u_happyWeight;
      uniform float u_blushWeight;
      uniform float u_cuddleGlow;
      varying vec2 v_texCoord;

      void main() {
        vec4 colNormal = texture2D(u_texNormal, v_texCoord);
        vec4 colHappy = texture2D(u_texHappy, v_texCoord);
        vec4 col = mix(colNormal, colHappy, u_happyWeight);

        if (col.a < 0.02) {
          discard;
        }

        // Soft rosy cheek blush overlay
        if (u_blushWeight > 0.01) {
          float dL = distance(v_texCoord, vec2(0.43, 0.49));
          float dR = distance(v_texCoord, vec2(0.57, 0.49));
          float blush = max(smoothstep(0.08, 0.0, dL), smoothstep(0.08, 0.0, dR));
          vec3 blushColor = vec3(1.0, 0.42, 0.65);
          col.rgb = mix(col.rgb, blushColor, blush * u_blushWeight * 0.48 * col.a);
        }

        // Warm celestial cuddle aura glow
        if (u_cuddleGlow > 0.01) {
          vec3 warmAura = vec3(1.0, 0.82, 0.88);
          col.rgb = mix(col.rgb, warmAura, u_cuddleGlow * 0.16 * col.a);
        }

        gl_FragColor = col;
      }
    `;

    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      return;
    }

    // Locations
    this.aPosition = gl.getAttribLocation(this.program, 'a_position');
    this.aTexCoord = gl.getAttribLocation(this.program, 'a_texCoord');
    this.uMatrix = gl.getUniformLocation(this.program, 'u_matrix');
    this.uTexNormal = gl.getUniformLocation(this.program, 'u_texNormal');
    this.uTexHappy = gl.getUniformLocation(this.program, 'u_texHappy');
    this.uHappyWeight = gl.getUniformLocation(this.program, 'u_happyWeight');
    this.uBlushWeight = gl.getUniformLocation(this.program, 'u_blushWeight');
    this.uCuddleGlow = gl.getUniformLocation(this.program, 'u_cuddleGlow');
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  initGeometry() {
    const gl = this.gl;

    this.basePositions = new Float32Array(this.numVertices * 2);
    this.positions = new Float32Array(this.numVertices * 2);
    this.texCoords = new Float32Array(this.numVertices * 2);
    this.indices = new Uint16Array(this.numIndices);

    // Grid coordinates
    let vIdx = 0;
    for (let j = 0; j <= this.gridY; j++) {
      const v = j / this.gridY;
      for (let i = 0; i <= this.gridX; i++) {
        const u = i / this.gridX;

        // Perfectly centered character bounds (clearance for horns, ears, and paws)
        const x = (u - 0.5) * 420;
        const y = (v - 0.52) * 430 + 15;

        this.basePositions[vIdx * 2] = x;
        this.basePositions[vIdx * 2 + 1] = y;

        this.positions[vIdx * 2] = x;
        this.positions[vIdx * 2 + 1] = y;

        this.texCoords[vIdx * 2] = u;
        this.texCoords[vIdx * 2 + 1] = v;

        vIdx++;
      }
    }

    // Triangles
    let iIdx = 0;
    for (let j = 0; j < this.gridY; j++) {
      for (let i = 0; i < this.gridX; i++) {
        const row1 = j * (this.gridX + 1);
        const row2 = (j + 1) * (this.gridX + 1);

        // Quad triangles: (row1 + i, row2 + i, row1 + i + 1) and (row1 + i + 1, row2 + i, row2 + i + 1)
        this.indices[iIdx++] = row1 + i;
        this.indices[iIdx++] = row2 + i;
        this.indices[iIdx++] = row1 + i + 1;

        this.indices[iIdx++] = row1 + i + 1;
        this.indices[iIdx++] = row2 + i;
        this.indices[iIdx++] = row2 + i + 1;
      }
    }

    // WebGL Buffers
    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);

    this.texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  }

  loadTextures() {
    const gl = this.gl;

    this.texNormalObj = gl.createTexture();
    this.texHappyObj = gl.createTexture();

    this.loadTextureImage(this.texNormalObj, './miko_fox_cutout.png');
    this.loadTextureImage(this.texHappyObj, './miko_fox_happy.png');
  }

  loadTextureImage(texObj, url) {
    const gl = this.gl;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texObj);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    img.src = url;
  }

  setCursor(clientX, clientY) {
    this.cursorX = clientX;
    this.cursorY = clientY;
  }

  // Primary animation update (called every frame)
  update(dt, now) {
    this.time += dt;

    // 1. Mouse Gaze Tracking relative to Pet
    const rect = this.canvas.getBoundingClientRect();
    const petCenterX = rect.left + rect.width / 2;
    const petCenterY = rect.top + rect.height * 0.45;
    this.relativeMouseX = Math.max(-280, Math.min(280, this.cursorX - petCenterX));
    this.relativeMouseY = Math.max(-200, Math.min(200, this.cursorY - petCenterY));

    // Target head tilt based on mouse position
    const targetHead = (this.relativeMouseX / 280) * 0.12;
    const kHead = 12;
    const dHead = 3.8;
    const fHead = (targetHead - this.headAngle) * kHead - this.headAngleVel * dHead;
    this.headAngleVel += fHead * dt;
    this.headAngle += this.headAngleVel * dt;

    // 2. Random Ear Twitches (Real Fox Charm)
    if (this.time - this.lastTwitchTime > 3.2 + Math.random() * 2.8) {
      this.lastTwitchTime = this.time;
      if (Math.random() > 0.5) {
        this.twitchLeft = 1.0;
      } else {
        this.twitchRight = 1.0;
      }
    }
    if (this.twitchLeft > 0) this.twitchLeft = Math.max(0, this.twitchLeft - dt * 5.5);
    if (this.twitchRight > 0) this.twitchRight = Math.max(0, this.twitchRight - dt * 5.5);

    // Ear spring simulation
    const kEar = 35;
    const dEar = 5.2;
    const targetEarL = -this.headAngle * 0.6 + Math.sin(this.twitchLeft * Math.PI * 4) * 0.22 * this.twitchLeft;
    const fEarL = (targetEarL - this.leftEarSpring) * kEar - this.leftEarVel * dEar;
    this.leftEarVel += fEarL * dt;
    this.leftEarSpring += this.leftEarVel * dt;

    const targetEarR = this.headAngle * 0.6 + Math.sin(this.twitchRight * Math.PI * 4) * 0.22 * this.twitchRight;
    const fEarR = (targetEarR - this.rightEarSpring) * kEar - this.rightEarVel * dEar;
    this.rightEarVel += fEarR * dt;
    this.rightEarSpring += this.rightEarVel * dt;

    // Earring pendulums
    const kEarring = 45;
    const dEarring = 3.2;
    const fEarringL = (-this.headAngleVel * 0.25 - this.leftEarring) * kEarring - this.leftEarringVel * dEarring;
    this.leftEarringVel += fEarringL * dt;
    this.leftEarring += this.leftEarringVel * dt;

    const fEarringR = (-this.headAngleVel * 0.25 - this.rightEarring) * kEarring - this.rightEarringVel * dEarring;
    this.rightEarringVel += fEarringR * dt;
    this.rightEarring += this.rightEarringVel * dt;

    // 3. Squash & Stretch spring recovery when not dragging
    if (!this.isDragging) {
      const kSquash = 140;
      const dSquash = 10;
      const fY = (1.0 - this.scaleY) * kSquash - this.velScaleY * dSquash;
      this.velScaleY += fY * dt;
      this.scaleY += this.velScaleY * dt;

      const fX = (1.0 - this.scaleX) * kSquash - this.velScaleX * dSquash;
      this.velScaleX += fX * dt;
      this.scaleX += this.velScaleX * dt;

      this.dragX += (0 - this.dragX) * 12 * dt;
      this.dragY += (0 - this.dragY) * 12 * dt;
    }

    // 4. Expression Transitions
    this.happyWeight += (this.targetHappyWeight - this.happyWeight) * 8 * dt;
    this.blushWeight += (this.targetBlushWeight - this.blushWeight) * 5 * dt;

    // Natural blinking
    this.blinkTimer += dt;
    if (!this.isBlinking && this.blinkTimer > 3.5 + Math.random() * 3.0) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      const prevHappy = this.targetHappyWeight;
      this.targetHappyWeight = 1.0;
      setTimeout(() => {
        if (!this.isHolding) {
          this.targetHappyWeight = prevHappy;
        }
        this.isBlinking = false;
      }, 150);
    }

    // 5. Deform Mesh Vertices
    this.deformMesh(now);
  }

  deformMesh(now) {
    const t = this.time;
    // Breathing cycle (gentle expansion in upper chest, grounded paws)
    const breathFactor = (Math.sin(t * 1.85) * 0.5 + 0.5);

    // Tail wave parameters
    const tailSpeed = this.wagSpeed * (1 + this.happyWeight * 1.5);
    const tailAmp = this.wagAmp * (1 + this.happyWeight * 0.8);
    const tailWaveTime = t * tailSpeed;

    // Gaze parallax for 2.5D head depth
    const gazeX = (this.relativeMouseX / 280) * 7.5;
    const gazeY = (this.relativeMouseY / 200) * 5.0;

    let vIdx = 0;
    for (let j = 0; j <= this.gridY; j++) {
      const v = j / this.gridY;
      for (let i = 0; i <= this.gridX; i++) {
        const u = i / this.gridX;

        let bx = this.basePositions[vIdx * 2];
        let by = this.basePositions[vIdx * 2 + 1];

        // --- A. BREATHING DEFORMATION (Upper torso, keeping paws fixed at bottom) ---
        // Paws are at v > 0.86, chest is at v between 0.45 and 0.82
        if (v < 0.88 && v > 0.35) {
          const chestWeight = Math.sin((v - 0.35) / 0.53 * Math.PI) * Math.sin(u * Math.PI);
          by -= chestWeight * 7.5 * breathFactor;
          bx += (u - 0.5) * chestWeight * 8.0 * breathFactor;
        }

        // --- B. TAIL FLUID HARMONIC WAVE ---
        // Tail is in bottom-right region: u in [0.46, 0.96], v in [0.55, 0.98]
        if (u > 0.44 && v > 0.52) {
          const tailU = (u - 0.44) / 0.52;
          const tailV = (v - 0.52) / 0.46;
          const distAlongTail = Math.sqrt(tailU * tailU + tailV * tailV);
          const tailWeight = Math.min(1.0, distAlongTail * 1.4);

          // Sine traveling wave along the tail's curved spine
          const wave = Math.sin(tailWaveTime - distAlongTail * 3.8);
          const wagDispX = Math.sin(wave * tailAmp) * 42.0 * tailWeight;
          const wagDispY = -Math.cos(wave * tailAmp) * 14.0 * tailWeight;

          bx += wagDispX;
          by += wagDispY;
        }

        // --- C. LEFT EAR SPRING & TWITCH ---
        // Left ear: u in [0.0, 0.38], v in [0.22, 0.62]
        if (u < 0.40 && v > 0.20 && v < 0.65) {
          const earWeight = Math.min(1.0, (0.40 - u) / 0.32) * Math.min(1.0, (1.0 - Math.abs(v - 0.42) / 0.22));
          bx -= earWeight * 26.0 * this.leftEarSpring;
          by += earWeight * 34.0 * this.leftEarSpring;

          // Earring tip dangle
          if (u < 0.16 && v > 0.48) {
            bx += this.leftEarring * 12.0;
          }
        }

        // --- D. RIGHT EAR SPRING & TWITCH ---
        // Right ear: u in [0.60, 1.0], v in [0.22, 0.62]
        if (u > 0.60 && v > 0.20 && v < 0.65) {
          const earWeight = Math.min(1.0, (u - 0.60) / 0.32) * Math.min(1.0, (1.0 - Math.abs(v - 0.42) / 0.22));
          bx += earWeight * 26.0 * this.rightEarSpring;
          by -= earWeight * 34.0 * this.rightEarSpring;

          // Earring tip dangle
          if (u > 0.84 && v > 0.48) {
            bx += this.rightEarring * 12.0;
          }
        }

        // --- E. HEAD TILT & 2.5D GAZE TRACKING ---
        // Head region: v < 0.60
        if (v < 0.60) {
          const headWeight = Math.min(1.0, (0.60 - v) / 0.36);
          // Rotate around neck pivot (0, 15)
          const pivotY = 15;
          const rx = bx;
          const ry = by - pivotY;

          const cosH = Math.cos(this.headAngle * headWeight);
          const sinH = Math.sin(this.headAngle * headWeight);

          bx = rx * cosH - ry * sinH;
          by = rx * sinH + ry * cosH + pivotY;

          // 2.5D facial feature gaze parallax (eyes/nose shift slightly toward mouse)
          if (u > 0.38 && u < 0.62 && v > 0.32 && v < 0.54) {
            const faceWeight = Math.sin((u - 0.38) / 0.24 * Math.PI) * Math.sin((v - 0.32) / 0.22 * Math.PI);
            bx += gazeX * faceWeight;
            by += gazeY * faceWeight;
          }
        }

        // --- F. SQUASH & STRETCH (Global volume conservation anchored to ground) ---
        const groundAnchorY = 210;
        bx *= this.scaleX;
        by = (by - groundAnchorY) * this.scaleY + groundAnchorY + this.dragY;
        bx += this.dragX;

        this.positions[vIdx * 2] = bx;
        this.positions[vIdx * 2 + 1] = by;

        vIdx++;
      }
    }

    // Upload to WebGL GPU buffer
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions);
  }

  // Draw WebGL Scene
  render() {
    if (!this.isWebGL) return;
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.program);

    // Orthographic Projection Matrix: maps [-width/2, width/2] and [-height/2, height/2] to [-1, 1]
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const mat = [
      1 / halfW, 0, 0, 0,
      0, -1 / halfH, 0, 0, // Y inverted for screen coordinates
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    gl.uniformMatrix4fv(this.uMatrix, false, new Float32Array(mat));
    gl.uniform1f(this.uHappyWeight, this.happyWeight);
    gl.uniform1f(this.uBlushWeight, this.blushWeight);
    gl.uniform1f(this.uCuddleGlow, this.isHolding ? 1.0 : 0.0);

    // Bind Normal texture (unit 0)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texNormalObj);
    gl.uniform1i(this.uTexNormal, 0);

    // Bind Happy texture (unit 1)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texHappyObj);
    gl.uniform1i(this.uTexHappy, 1);

    // Positions
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

    // TexCoords
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.enableVertexAttribArray(this.aTexCoord);
    gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // Draw mesh
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
  }

  // Interaction handlers
  setExpression(expr) {
    if (expr === 'happy') {
      this.targetHappyWeight = 1.0;
      this.targetBlushWeight = 1.0;
      this.wagSpeed = 4.8;
      this.wagAmp = 0.75;
    } else {
      this.targetHappyWeight = 0.0;
      this.targetBlushWeight = 0.0;
      this.wagSpeed = 2.4;
      this.wagAmp = 0.45;
    }
  }

  startDrag(clientX, clientY) {
    this.isDragging = true;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
  }

  updateDrag(clientX, clientY) {
    if (!this.isDragging) return;
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;

    this.dragX = dx * 0.4;
    this.dragY = dy * 0.4;

    // Volume-preserving elastic stretch
    const stretchY = Math.max(0.68, Math.min(1.58, 1.0 - dy * 0.0035));
    this.scaleY = stretchY;
    this.scaleX = 1.0 / Math.sqrt(this.scaleY);
  }

  endDrag() {
    this.isDragging = false;
  }

  doStretchTogether() {
    this.setExpression('happy');
    const start = performance.now();
    const duration = 2400;

    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // Arching stretch wave
      const p = Math.sin(t * Math.PI);
      this.scaleY = 1.0 + p * 0.24;
      this.scaleX = 1.0 - p * 0.12;
      this.dragY = -p * 22;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        this.setExpression('normal');
      }
    };
    requestAnimationFrame(frame);
  }
}
