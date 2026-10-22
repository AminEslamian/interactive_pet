// MikoVideoPet: Real-time GPU Chroma-Key Video Player for Yae Miko Pet
// Seamlessly plays and transitions between AI-generated animations:
// 1. General Movement (Idle & Living locomotion loop)
// 2. Head Pat Reaction (Petting & cuddle reaction)
// Removes studio grey background in real-time on GPU with zero artifacts.

export class MikoVideoPet {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true }) ||
              canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

    if (!this.gl) {
      console.error('WebGL context could not be initialized for video pet.');
      return;
    }

    // Balanced desktop pet resolution (200x155)
    this.width = 200;
    this.height = 155;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Video State
    this.mode = 'general'; // 'general' | 'reaction'
    this.isReactionPlaying = false;
    this.blushAmount = 0.0;
    this.targetBlush = 0.0;

    // Gaze tracking / subtle tilt
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;
    this.tilt = 0;
    this.targetTilt = 0;

    this.initVideos();
    this.initWebGL();
    this.startLoop();
  }

  initVideos() {
    // 1. General Movement Video (Looping Idle)
    this.videoGeneral = document.createElement('video');
    this.videoGeneral.src = './miko_new_design/general_movement.mp4';
    this.videoGeneral.loop = true;
    this.videoGeneral.muted = true;
    this.videoGeneral.playsInline = true;
    this.videoGeneral.crossOrigin = 'anonymous';
    this.videoGeneral.autoplay = true;

    // 2. Head Pat Reaction Video (On Click / Pet / Hold)
    this.videoReaction = document.createElement('video');
    this.videoReaction.src = './miko_new_design/head_pat_reaction.mp4';
    this.videoReaction.loop = false;
    this.videoReaction.muted = true;
    this.videoReaction.playsInline = true;
    this.videoReaction.crossOrigin = 'anonymous';

    // When reaction video ends, return to general movement
    this.videoReaction.addEventListener('ended', () => {
      this.isReactionPlaying = false;
      this.targetBlush = 0.0;
      this.mode = 'general';
    });

    // Start general video playback safely
    const playGeneral = () => {
      this.videoGeneral.play().catch(() => {
        // Autoplay policy fallback: resume on first user interaction
        const resume = () => {
          this.videoGeneral.play();
          window.removeEventListener('click', resume);
          window.removeEventListener('touchstart', resume);
        };
        window.addEventListener('click', resume, { once: true });
        window.addEventListener('touchstart', resume, { once: true });
      });
    };

    if (this.videoGeneral.readyState >= 2) {
      playGeneral();
    } else {
      this.videoGeneral.addEventListener('loadeddata', playGeneral, { once: true });
    }
  }

  initWebGL() {
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
      uniform sampler2D u_video;
      uniform float u_blush;
      uniform float u_aura;
      varying vec2 v_texCoord;

      // Neutral studio grey background reference [162, 162, 162]
      const vec3 BG_COLOR = vec3(0.6353, 0.6353, 0.6353);

      void main() {
        vec4 col = texture2D(u_video, v_texCoord);
        
        // Measure Euclidean color distance from neutral grey
        float diff = distance(col.rgb, BG_COLOR);
        
        // Crisp, anti-aliased edge falloff
        float alpha = clamp((diff - 0.046) / 0.052, 0.0, 1.0);

        if (alpha < 0.02) {
          discard;
        }

        // Soft rosy cheek blush overlay on petting / reaction
        if (u_blush > 0.01) {
          float dL = distance(v_texCoord, vec2(0.44, 0.52));
          float dR = distance(v_texCoord, vec2(0.56, 0.52));
          float blushSpot = max(smoothstep(0.08, 0.0, dL), smoothstep(0.08, 0.0, dR));
          vec3 blushColor = vec3(1.0, 0.45, 0.68);
          col.rgb = mix(col.rgb, blushColor, blushSpot * u_blush * 0.42 * alpha);
        }

        // Soft golden-cherry aura pulse
        if (u_aura > 0.01) {
          vec3 auraColor = vec3(1.0, 0.85, 0.90);
          col.rgb = mix(col.rgb, auraColor, u_aura * 0.12 * alpha);
        }

        gl_FragColor = vec4(col.rgb, alpha);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    this.aPosition = gl.getAttribLocation(this.program, 'a_position');
    this.aTexCoord = gl.getAttribLocation(this.program, 'a_texCoord');
    this.uMatrix = gl.getUniformLocation(this.program, 'u_matrix');
    this.uVideo = gl.getUniformLocation(this.program, 'u_video');
    this.uBlush = gl.getUniformLocation(this.program, 'u_blush');
    this.uAura = gl.getUniformLocation(this.program, 'u_aura');

    // Quad geometry (4 vertices, 2 triangles)
    // 1920x1440 has aspect ratio 4:3 (1.333)
    const quadW = 190;
    const quadH = 142;

    const positions = new Float32Array([
      -quadW / 2, -quadH / 2 + 5,
       quadW / 2, -quadH / 2 + 5,
      -quadW / 2,  quadH / 2 + 5,
       quadW / 2,  quadH / 2 + 5
    ]);

    const texCoords = new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0
    ]);

    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    this.texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Texture for video frames
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  setCursor(clientX, clientY) {
    this.cursorX = clientX;
    this.cursorY = clientY;
  }

  playReaction() {
    this.mode = 'reaction';
    this.isReactionPlaying = true;
    this.targetBlush = 1.0;

    try {
      this.videoReaction.currentTime = 0;
      this.videoReaction.play().catch(() => {});
    } catch {}
  }

  stopReaction() {
    this.targetBlush = 0.0;
    // Let reaction finish naturally or reset
    if (this.videoReaction.currentTime > 1.2) {
      this.isReactionPlaying = false;
      this.mode = 'general';
    }
  }

  startLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  update(dt) {
    // Smooth cheek blush transition
    this.blushAmount += (this.targetBlush - this.blushAmount) * 6 * dt;

    // Subtle gaze tilt toward cursor
    const rect = this.canvas.getBoundingClientRect();
    const petCenterX = rect.left + rect.width / 2;
    const dx = this.cursorX - petCenterX;
    this.targetTilt = Math.max(-0.04, Math.min(0.04, (dx / window.innerWidth) * 0.12));
    this.tilt += (this.targetTilt - this.tilt) * 5 * dt;
  }

  render() {
    if (!this.gl) return;
    const gl = this.gl;

    // Pick active video element
    const activeVideo = (this.mode === 'reaction' && this.isReactionPlaying && this.videoReaction.readyState >= 2)
      ? this.videoReaction
      : this.videoGeneral;

    // Only upload texture if video has valid frame
    if (activeVideo.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, activeVideo);
      } catch {}
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.program);

    // Matrix with subtle gaze tilt
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const cosT = Math.cos(this.tilt);
    const sinT = Math.sin(this.tilt);

    const mat = [
      cosT / halfW, sinT / halfW, 0, 0,
      -sinT / halfH, -cosT / halfH, 0, 0, // Y flipped for canvas coords
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    gl.uniformMatrix4fv(this.uMatrix, false, new Float32Array(mat));
    gl.uniform1f(this.uBlush, this.blushAmount);
    gl.uniform1f(this.uAura, this.targetBlush > 0 ? 1.0 : 0.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uVideo, 0);

    // Bind Attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.enableVertexAttribArray(this.aTexCoord);
    gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // Draw Quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
