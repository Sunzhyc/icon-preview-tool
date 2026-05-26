(() => {
  const ICON_SIZE = { width: 324, height: 324 };
  const PREVIEW_SIZE = { width: 720, height: 960 };
  const STATIC_ASSETS = {
    effectOverlay: "./assets/effect-icon-overlay.png",
    mockupPanel: "./assets/icon-mockup-panel.png",
    mockupCamera: "./assets/icon-mockup-camera.png",
  };
  const MOCKUP_SPECS = {
    panel: {
      width: 1301,
      height: 2648,
      src: STATIC_ASSETS.mockupPanel,
      slots: [
        { x: 114, y: 282, width: 108, height: 107 },
        { x: 159, y: 1917, width: 174, height: 173 },
      ],
    },
    camera: {
      width: 1303,
      height: 2650,
      src: STATIC_ASSETS.mockupCamera,
      slots: [{ x: 542, y: 1990, width: 222, height: 221 }],
    },
  };

  const templates = {
    icon: [
      { id: "before-after", label: "Before / After", type: "blend", accent: ["#4b2a23", "#f9a657"] },
      { id: "swipe-before-after", label: "Swipe Before/After", type: "wipe", accent: ["#233447", "#34d6d3"], video: true },
      { id: "video-sequence", label: "Video Sequence", type: "sequence", accent: ["#151b2e", "#c06c4d"], video: true },
      { id: "single-scene", label: "Single Scene", type: "single", accent: ["#1c4b5d", "#e9b486"] },
    ],
    preview: [
      { id: "sequence-preview", label: "Sequence Preview", type: "sequence", accent: ["#205a6a", "#8f3aff"], video: true },
      { id: "slide-before-after", label: "Slide Before/After", type: "slide", accent: ["#44214e", "#25d5d8"] },
      { id: "side-by-side", label: "Side-by-Side", type: "split", accent: ["#203950", "#ecb36e"] },
    ],
  };

  const els = {
    body: document.body,
    modeTabs: [...document.querySelectorAll(".mode-tab")],
    templateGrid: document.getElementById("templateGrid"),
    templateTitle: document.getElementById("templateTitle"),
    assetInput: document.getElementById("assetInput"),
    psdInput: document.getElementById("psdInput"),
    dropzone: document.getElementById("dropzone"),
    assetGrid: document.getElementById("assetGrid"),
    clipStrip: document.getElementById("clipStrip"),
    mainCanvas: document.getElementById("mainCanvas"),
    mockupCanvas: document.getElementById("mockupCanvas"),
    editorTitle: document.getElementById("editorTitle"),
    sizePill: document.getElementById("sizePill"),
    exportAssetBtn: document.getElementById("exportAssetBtn"),
    exportMockupBtn: document.getElementById("exportMockupBtn"),
    clearBtn: document.getElementById("clearBtn"),
    playBtn: document.getElementById("playBtn"),
    progressRange: document.getElementById("progressRange"),
    timeReadout: document.getElementById("timeReadout"),
    playhead: document.getElementById("playhead"),
    durationSelect: document.getElementById("durationSelect"),
    speedRange: document.getElementById("speedRange"),
    speedReadout: document.getElementById("speedReadout"),
    scaleRange: document.getElementById("scaleRange"),
    resetTransformBtn: document.getElementById("resetTransformBtn"),
    instructionInput: document.getElementById("instructionInput"),
    instructionControl: document.getElementById("instructionControl"),
    transitionGroup: document.getElementById("transitionGroup"),
    curveGroup: document.getElementById("curveGroup"),
    mockupTabs: document.getElementById("mockupTabs"),
    phoneMockup: document.getElementById("phoneMockup"),
    mockupFrame: document.getElementById("mockupFrame"),
    effectGrid: document.getElementById("effectGrid"),
    mockupName: document.getElementById("mockupName"),
    toast: document.getElementById("toast"),
    zoomReadout: document.getElementById("zoomReadout"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    fitBtn: document.getElementById("fitBtn"),
    canvasFitBtn: document.getElementById("canvasFitBtn"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    nextClipBtn: document.getElementById("nextClipBtn"),
    customTemplateBtn: document.getElementById("customTemplateBtn"),
    figmaBtn: document.getElementById("figmaBtn"),
    psdBtn: document.getElementById("psdBtn"),
    projectBtn: document.getElementById("projectBtn"),
    formatSelect: document.getElementById("formatSelect"),
    fpsSelect: document.getElementById("fpsSelect"),
    qualityRange: document.getElementById("qualityRange"),
  };

  const ctx = els.mainCanvas.getContext("2d");
  const mockCtx = els.mockupCanvas.getContext("2d");
  const effectCanvases = [];
  const staticImages = {
    effectOverlay: null,
    panel: null,
    camera: null,
  };

  let state = {
    mode: "icon",
    templateId: "before-after",
    assets: [],
    selectedAssetId: null,
    currentTime: 0,
    isPlaying: false,
    duration: 3,
    speed: 1,
    split: 0.5,
    transition: "soft",
    curve: "ease-in-out",
    instruction: "Tap to start",
    mockup: "panel",
    zoom: 1,
  };

  let dragState = null;
  let lastTick = performance.now();
  let toastTimer = null;
  const history = [];
  const future = [];

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function easeValue(t, curve = state.curve) {
    if (curve === "linear") return t;
    if (curve === "ease-in") return t * t;
    if (curve === "ease-out") return 1 - (1 - t) * (1 - t);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function currentSize() {
    return state.mode === "icon" ? ICON_SIZE : PREVIEW_SIZE;
  }

  function currentTemplate() {
    return templates[state.mode].find((item) => item.id === state.templateId) || templates[state.mode][0];
  }

  function activeAssets() {
    return state.assets;
  }

  function selectedAsset() {
    return activeAssets().find((asset) => asset.id === state.selectedAssetId) || activeAssets()[0] || null;
  }

  function mediaReady(asset) {
    if (!asset) return false;
    if (asset.kind === "image") return asset.el && asset.el.complete;
    return asset.el && asset.el.readyState >= 2;
  }

  function mediaDimensions(asset) {
    if (!asset) return { width: 1, height: 1 };
    if (asset.kind === "image") {
      return { width: asset.el.naturalWidth || 1, height: asset.el.naturalHeight || 1 };
    }
    return { width: asset.el.videoWidth || 720, height: asset.el.videoHeight || 960 };
  }

  function makeSampleDataUrl(index, ratio = 1) {
    const width = ratio === 1 ? 640 : 720;
    const height = ratio === 1 ? 640 : 960;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    const palettes = [
      ["#243b55", "#f9a15c", "#f8e4d2"],
      ["#064f69", "#24dfd5", "#e6fff8"],
      ["#352045", "#9b5cff", "#ffe2f1"],
      ["#2b3e34", "#37e08f", "#f4ffe8"],
      ["#4c2638", "#ff7765", "#fff0de"],
    ];
    const colors = palettes[index % palettes.length];
    const grd = c.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, colors[0]);
    grd.addColorStop(0.58, colors[1]);
    grd.addColorStop(1, colors[2]);
    c.fillStyle = grd;
    c.fillRect(0, 0, width, height);

    c.save();
    c.globalAlpha = 0.24;
    c.fillStyle = "#ffffff";
    for (let i = 0; i < 16; i += 1) {
      const x = ((i * 97 + index * 53) % width) - 20;
      const y = ((i * 71 + index * 89) % height) - 20;
      c.beginPath();
      c.arc(x, y, 8 + ((i + index) % 5) * 5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    const faceX = width * (0.5 + (index - 2) * 0.018);
    const faceY = height * 0.48;
    const faceR = Math.min(width, height) * 0.23;
    const skin = ["#f3c2a2", "#e2a87c", "#f1cfaf", "#c98763", "#f5bc93"][index % 5];
    const hair = ["#2b1913", "#301b17", "#3a211c", "#181412", "#503020"][index % 5];
    c.fillStyle = hair;
    c.beginPath();
    c.ellipse(faceX, faceY + faceR * 0.03, faceR * 1.08, faceR * 1.35, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(faceX, faceY, faceR * 0.72, faceR * 0.9, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.88)";
    c.beginPath();
    c.ellipse(faceX - faceR * 0.26, faceY - faceR * 0.07, faceR * 0.08, faceR * 0.045, 0, 0, Math.PI * 2);
    c.ellipse(faceX + faceR * 0.26, faceY - faceR * 0.07, faceR * 0.08, faceR * 0.045, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#273142";
    c.beginPath();
    c.arc(faceX - faceR * 0.26, faceY - faceR * 0.07, faceR * 0.028, 0, Math.PI * 2);
    c.arc(faceX + faceR * 0.26, faceY - faceR * 0.07, faceR * 0.028, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(95,42,34,.65)";
    c.lineWidth = Math.max(4, faceR * 0.035);
    c.beginPath();
    c.moveTo(faceX - faceR * 0.15, faceY + faceR * 0.32);
    c.quadraticCurveTo(faceX, faceY + faceR * 0.4, faceX + faceR * 0.17, faceY + faceR * 0.32);
    c.stroke();

    c.fillStyle = "rgba(0,0,0,.18)";
    c.fillRect(0, height * 0.72, width, height * 0.28);
    return canvas.toDataURL("image/png");
  }

  function imageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  const sampleAssets = [];

  async function createSamples() {
    sampleAssets.length = 0;
  }

  function makeBlankDataUrl(width = 324, height = 324) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas.toDataURL("image/png");
  }

  function loadStaticImages() {
    return Promise.all([
      imageFromUrl(STATIC_ASSETS.effectOverlay).then((img) => {
        staticImages.effectOverlay = img;
      }),
      imageFromUrl(STATIC_ASSETS.mockupPanel).then((img) => {
        staticImages.panel = img;
      }),
      imageFromUrl(STATIC_ASSETS.mockupCamera).then((img) => {
        staticImages.camera = img;
      }),
    ]);
  }

  function pushHistory() {
    const snapshot = {
      mode: state.mode,
      templateId: state.templateId,
      selectedAssetId: state.selectedAssetId,
      duration: state.duration,
      speed: state.speed,
      split: state.split,
      transition: state.transition,
      curve: state.curve,
      instruction: state.instruction,
      mockup: state.mockup,
      zoom: state.zoom,
      assets: state.assets.map((asset) => ({
        id: asset.id,
        x: asset.x,
        y: asset.y,
        scale: asset.scale,
      })),
    };
    history.push(JSON.stringify(snapshot));
    if (history.length > 60) history.shift();
    future.length = 0;
  }

  function restoreSnapshot(serialized) {
    if (!serialized) return;
    const snapshot = JSON.parse(serialized);
    const assetTransforms = new Map(snapshot.assets.map((asset) => [asset.id, asset]));
    state = { ...state, ...snapshot, assets: state.assets };
    state.assets.forEach((asset) => {
      const stored = assetTransforms.get(asset.id);
      if (stored) {
        asset.x = stored.x;
        asset.y = stored.y;
        asset.scale = stored.scale;
      }
    });
    renderStaticUi();
  }

  function undo() {
    if (history.length < 2) {
      showToast("Nothing to undo yet");
      return;
    }
    future.push(history.pop());
    restoreSnapshot(history[history.length - 1]);
  }

  function redo() {
    const next = future.pop();
    if (!next) {
      showToast("Nothing to redo yet");
      return;
    }
    history.push(next);
    restoreSnapshot(next);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function drawRoundedRect(c, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + width, y, x + width, y + height, r);
    c.arcTo(x + width, y + height, x, y + height, r);
    c.arcTo(x, y + height, x, y, r);
    c.arcTo(x, y, x + width, y, r);
    c.closePath();
  }

  function roundedClip(c, width, height, radius) {
    drawRoundedRect(c, 0, 0, width, height, radius);
    c.clip();
  }

  function drawMediaCover(c, asset, width, height, options = {}) {
    if (!asset || !mediaReady(asset)) {
      drawFallback(c, width, height, options);
      return;
    }
    const { width: mw, height: mh } = mediaDimensions(asset);
    const cover = Math.max(width / mw, height / mh);
    const scale = cover * (asset.scale || 1) * (options.scale || 1);
    const dw = mw * scale;
    const dh = mh * scale;
    const x = (width - dw) / 2 + (asset.x || 0);
    const y = (height - dh) / 2 + (asset.y || 0);
    c.drawImage(asset.el, x, y, dw, dh);
  }

  function drawFallback(c, width, height, options = {}) {
    if (options.export) return;
    const cell = Math.max(12, Math.round(Math.min(width, height) / 18));
    c.save();
    c.fillStyle = "#f5f7fb";
    c.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        if ((x / cell + y / cell) % 2 === 0) {
          c.fillStyle = "#dde1ea";
          c.fillRect(x, y, cell, cell);
        }
      }
    }
    c.globalAlpha = 0.55;
    c.strokeStyle = "#8f98aa";
    c.lineWidth = Math.max(1, width * 0.006);
    c.setLineDash([Math.max(6, width * 0.035), Math.max(6, width * 0.03)]);
    drawRoundedRect(c, width * 0.08, height * 0.08, width * 0.84, height * 0.84, Math.max(18, width * 0.09));
    c.stroke();
    c.restore();
  }

  function drawSoftSplit(c, before, after, width, height, splitX, options = {}) {
    drawMediaCover(c, after, width, height, options);
    const feather = width * 0.12;
    c.save();
    c.beginPath();
    c.rect(0, 0, splitX - feather / 2, height);
    c.clip();
    drawMediaCover(c, before, width, height, options);
    c.restore();

    const fadeCanvas = document.createElement("canvas");
    fadeCanvas.width = width;
    fadeCanvas.height = height;
    const f = fadeCanvas.getContext("2d");
    drawMediaCover(f, before, width, height, options);
    f.globalCompositeOperation = "destination-in";
    const mask = f.createLinearGradient(splitX - feather / 2, 0, splitX + feather / 2, 0);
    mask.addColorStop(0, "rgba(0,0,0,1)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    f.fillStyle = mask;
    f.fillRect(splitX - feather / 2, 0, feather, height);
    c.drawImage(fadeCanvas, 0, 0);
  }

  function drawBadge(c, width, height, label = state.mode === "icon" ? "TF" : "AI") {
    const size = Math.max(54, Math.min(width, height) * 0.25);
    const x = Math.max(16, width * 0.05);
    const y = height - size - Math.max(16, height * 0.05);
    c.save();
    drawRoundedRect(c, x, y, size, size, Math.max(12, size * 0.18));
    c.fillStyle = "rgba(0,0,0,.66)";
    c.shadowColor = "rgba(0,0,0,.42)";
    c.shadowBlur = 20;
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = "#fff";
    c.font = `900 ${Math.floor(size * 0.42)}px Inter, Arial, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(label, x + size / 2, y + size / 2 + 2);
    c.restore();
  }

  function drawEffectOverlay(c, width, height) {
    if (state.mode !== "icon" || !staticImages.effectOverlay) return;
    c.save();
    c.drawImage(staticImages.effectOverlay, 0, 0, width, height);
    c.restore();
  }

  function drawSparkles(c, width, height) {
    c.save();
    c.fillStyle = "rgba(255,255,255,.92)";
    c.shadowColor = "rgba(255,188,88,.9)";
    c.shadowBlur = 12;
    const points = [
      [width * 0.88, height * 0.12, 9],
      [width * 0.93, height * 0.22, 5],
      [width * 0.87, height * 0.34, 6],
    ];
    points.forEach(([x, y, r]) => {
      c.beginPath();
      c.moveTo(x, y - r);
      c.lineTo(x + r * 0.28, y - r * 0.28);
      c.lineTo(x + r, y);
      c.lineTo(x + r * 0.28, y + r * 0.28);
      c.lineTo(x, y + r);
      c.lineTo(x - r * 0.28, y + r * 0.28);
      c.lineTo(x - r, y);
      c.lineTo(x - r * 0.28, y - r * 0.28);
      c.closePath();
      c.fill();
    });
    c.restore();
  }

  function drawInstruction(c, width) {
    c.save();
    const top = c.createLinearGradient(0, 0, 0, 240);
    top.addColorStop(0, "rgba(0,0,0,.72)");
    top.addColorStop(0.65, "rgba(0,0,0,.28)");
    top.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = top;
    c.fillRect(0, 0, width, 260);
    c.fillStyle = "#fff";
    c.font = "800 46px Inter, Arial, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "top";
    wrapText(c, state.instruction || "Tap to start", width / 2, 58, width - 96, 54, 2);
    c.restore();
  }

  function wrapText(c, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (c.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((item, index) => c.fillText(item, x, y + index * lineHeight));
  }

  function assetForTime(time) {
    const assets = activeAssets();
    if (!assets.length) return null;
    if (currentTemplate().type !== "sequence") return selectedAsset() || assets[0];
    const clipDuration = state.duration / assets.length;
    const index = Math.min(assets.length - 1, Math.floor(time / clipDuration));
    return assets[index] || assets[0];
  }

  function syncVideo(asset, localTime) {
    if (!asset || asset.kind !== "video" || !asset.el.duration || !Number.isFinite(asset.el.duration)) return;
    const videoTime = (localTime * state.speed) % asset.el.duration;
    if (Math.abs(asset.el.currentTime - videoTime) > 0.18) {
      try {
        asset.el.currentTime = videoTime;
      } catch (error) {
        // Some browsers reject quick seeks while metadata is still settling.
      }
    }
    if (state.isPlaying && asset.el.paused) {
      asset.el.play().catch(() => {});
    }
    if (!state.isPlaying && !asset.el.paused) {
      asset.el.pause();
    }
  }

  function drawTemplate(c, width, height, options = {}) {
    const template = currentTemplate();
    const assets = activeAssets();
    const first = assets[0];
    const second = assets[1] || assets[0];
    const radius = state.mode === "icon" ? Math.floor(width * 0.14) : Math.floor(width * 0.055);
    c.save();
    roundedClip(c, width, height, radius);
    c.clearRect(0, 0, width, height);

    const progress = state.duration ? (state.currentTime % state.duration) / state.duration : 0;
    const curved = easeValue(progress);
    if (!assets.length) {
      drawFallback(c, width, height, options);
    } else if (template.type === "blend") {
      if (second && second !== first) {
        drawMediaCover(c, second, width, height, options);
        c.save();
        c.globalAlpha = 0.52;
        drawMediaCover(c, first, width, height, options);
        c.restore();
      } else {
        drawMediaCover(c, first, width, height, options);
      }
    } else if (template.type === "wipe") {
      drawMediaCover(c, first, width, height, options);
      if (second && second !== first) {
        c.save();
        c.beginPath();
        c.rect(0, 0, width * curved, height);
        c.clip();
        drawMediaCover(c, second, width, height, options);
        c.restore();
        if (!options.export) {
          const edgeX = width * curved;
          const edge = c.createLinearGradient(edgeX - 20, 0, edgeX + 20, 0);
          edge.addColorStop(0, "rgba(255,255,255,0)");
          edge.addColorStop(0.5, "rgba(255,255,255,.32)");
          edge.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = edge;
          c.fillRect(edgeX - 20, 0, 40, height);
        }
      }
    } else if (template.type === "split") {
      drawSoftSplit(c, first, second, width, height, width * state.split, options);
    } else if (template.type === "slide") {
      drawMediaCover(c, second, width, height, options);
      c.save();
      c.beginPath();
      c.rect(0, 0, width * (1 - curved), height);
      c.clip();
      drawMediaCover(c, first, width, height, options);
      c.restore();
      const edgeX = width * (1 - curved);
      const edge = c.createLinearGradient(edgeX - 26, 0, edgeX + 26, 0);
      edge.addColorStop(0, "rgba(255,255,255,0)");
      edge.addColorStop(0.5, "rgba(255,255,255,.38)");
      edge.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = edge;
      c.fillRect(edgeX - 26, 0, 52, height);
    } else {
      const asset = template.type === "sequence" ? assetForTime(state.currentTime) : selectedAsset();
      const clipDuration = activeAssets().length ? state.duration / activeAssets().length : state.duration;
      syncVideo(asset, state.currentTime % clipDuration);
      drawMediaCover(c, asset, width, height, options);
      if (template.type === "sequence" && state.mode === "icon") {
        c.save();
        c.globalAlpha = 0.2;
        c.fillStyle = "#000";
        c.fillRect(0, height * 0.74, width, height * 0.26);
        c.restore();
      }
    }

    if (state.mode === "preview") {
      drawInstruction(c, width);
    }

    drawEffectOverlay(c, width, height);
    c.restore();

    if (!options.export && template.type === "split" && state.mode !== "icon") {
      drawSplitHandle(c, width, height, width * state.split);
    }
  }

  function drawSplitHandle(c, width, height, splitX) {
    c.save();
    c.strokeStyle = "rgba(255,255,255,.86)";
    c.lineWidth = Math.max(2, width * 0.006);
    c.beginPath();
    c.moveTo(splitX, 0);
    c.lineTo(splitX, height);
    c.stroke();
    c.fillStyle = "#fff";
    c.shadowColor = "rgba(0,0,0,.42)";
    c.shadowBlur = 18;
    c.beginPath();
    c.arc(splitX, height * 0.77, width * 0.045, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = "#161820";
    c.lineWidth = Math.max(2, width * 0.006);
    c.beginPath();
    c.moveTo(splitX - width * 0.018, height * 0.77);
    c.lineTo(splitX - width * 0.004, height * 0.755);
    c.moveTo(splitX - width * 0.018, height * 0.77);
    c.lineTo(splitX - width * 0.004, height * 0.785);
    c.moveTo(splitX + width * 0.018, height * 0.77);
    c.lineTo(splitX + width * 0.004, height * 0.755);
    c.moveTo(splitX + width * 0.018, height * 0.77);
    c.lineTo(splitX + width * 0.004, height * 0.785);
    c.stroke();
    c.restore();
  }

  function renderTemplateCanvas(size = currentSize()) {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    drawTemplate(canvas.getContext("2d"), size.width, size.height, { export: true });
    return canvas;
  }

  function currentMockupSpec() {
    return state.mockup === "camera" ? MOCKUP_SPECS.camera : MOCKUP_SPECS.panel;
  }

  function drawIconMockupLayer(c, spec) {
    els.mockupCanvas.width = spec.width;
    els.mockupCanvas.height = spec.height;
    c.clearRect(0, 0, spec.width, spec.height);
    const assetCanvas = renderTemplateCanvas(ICON_SIZE);
    spec.slots.forEach((slot) => {
      c.drawImage(assetCanvas, slot.x, slot.y, slot.width, slot.height);
    });
  }

  function drawMockup() {
    if (state.mode === "icon") {
      const spec = currentMockupSpec();
      if (els.mockupFrame && els.mockupFrame.getAttribute("src") !== spec.src) {
        els.mockupFrame.src = spec.src;
      }
      drawIconMockupLayer(mockCtx, spec);
      return;
    }

    const size = currentSize();
    els.mockupCanvas.width = size.width;
    els.mockupCanvas.height = size.height;
    drawTemplate(mockCtx, size.width, size.height, { export: true });
    effectCanvases.forEach((canvas, index) => {
      const c = canvas.getContext("2d");
      c.clearRect(0, 0, canvas.width, canvas.height);
      if (index === 0 || index === 6) {
        drawTemplate(c, canvas.width, canvas.height, { export: true });
      } else {
        const asset = sampleAssets[index % sampleAssets.length];
        drawMediaCover(c, asset, canvas.width, canvas.height);
        drawBadge(c, canvas.width, canvas.height, "AI");
      }
    });
  }

  function renderFrame(now = performance.now()) {
    const size = currentSize();
    if (state.isPlaying) {
      const delta = ((now - lastTick) / 1000) * state.speed;
      state.currentTime = (state.currentTime + delta) % state.duration;
    }
    lastTick = now;
    els.mainCanvas.width = size.width;
    els.mainCanvas.height = size.height;
    drawTemplate(ctx, size.width, size.height);
    drawMockup();
    updateTimeUi();
    requestAnimationFrame(renderFrame);
  }

  function updateTimeUi() {
    const progress = state.duration ? state.currentTime / state.duration : 0;
    els.progressRange.value = Math.round(progress * 1000);
    els.playhead.style.left = `${clamp(progress, 0, 1) * 82 + 4}%`;
    els.timeReadout.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
  }

  function templateThumb(template) {
    const videoBadge = template.video ? '<span class="play-badge"></span>' : "";
    const split = template.type === "split" || template.type === "slide";
    const swipe = template.type === "wipe";
    return `
      <span class="template-thumb ${swipe ? "swipe-thumb" : ""}" style="background: linear-gradient(135deg, ${template.accent[0]}, ${template.accent[1]});">
        ${split ? '<span class="thumb-split"></span>' : ""}
        ${swipe ? '<span class="thumb-wipe"></span>' : ""}
        ${videoBadge}
        <span class="check"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span>
      </span>
      <span class="label">${template.label}</span>
    `;
  }

  function renderTemplates() {
    els.templateGrid.innerHTML = "";
    templates[state.mode].forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `template-card ${state.mode === "preview" ? "preview" : ""} ${
        template.id === state.templateId ? "selected" : ""
      }`;
      button.dataset.template = template.id;
      button.innerHTML = templateThumb(template);
      button.addEventListener("click", () => {
        pushHistory();
        state.templateId = template.id;
        state.currentTime = 0;
        renderStaticUi();
      });
      els.templateGrid.appendChild(button);
    });
  }

  function mediaTile(asset, className = "asset-tile") {
    const media =
      asset.kind === "video"
        ? `<video src="${asset.url}" muted playsinline loop></video>`
        : `<img src="${asset.url}" alt="${asset.name}" />`;
    const duration = asset.kind === "video" || asset.duration > 5 ? `<span class="asset-duration">${formatDuration(asset.duration)}</span>` : "";
    return `${media}<span class="asset-menu"></span>${duration}<span class="asset-kind">${asset.kind === "video" ? videoIcon() : imageIcon()}</span>`;
  }

  function formatDuration(seconds) {
    return `00:${String(Math.round(seconds)).padStart(2, "0")}`;
  }

  function imageIcon() {
    return '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="m7 16 4-4 3 3 2-2 1 3"/></svg>';
  }

  function videoIcon() {
    return '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="12" height="12" rx="2"/><path d="m16 10 4-2v8l-4-2"/></svg>';
  }

  function renderAssets() {
    const assets = activeAssets();
    els.assetGrid.innerHTML = "";
    assets.forEach((asset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `asset-tile ${asset.id === state.selectedAssetId ? "selected" : ""}`;
      button.innerHTML = mediaTile(asset);
      button.addEventListener("click", () => {
        state.selectedAssetId = asset.id;
        renderStaticUi();
      });
      els.assetGrid.appendChild(button);
    });
    const add = document.createElement("label");
    add.className = "asset-tile add-asset";
    add.title = "Add asset";
    add.innerHTML = "+";
    add.addEventListener("click", () => els.assetInput.click());
    els.assetGrid.appendChild(add);
  }

  function renderClipStrip() {
    const assets = activeAssets();
    els.clipStrip.innerHTML = "";
    if (!assets.length) {
      const empty = document.createElement("button");
      empty.type = "button";
      empty.className = "clip-empty";
      empty.innerHTML = `
        <span class="clip-empty-icon">+</span>
        <span>
          <strong>Add media to timeline</strong>
          <small>Upload images or videos to build the sequence</small>
        </span>
      `;
      empty.addEventListener("click", () => els.assetInput.click());
      els.clipStrip.appendChild(empty);
      return;
    }
    assets.forEach((asset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `clip ${asset.id === state.selectedAssetId ? "selected" : ""}`;
      const media =
        asset.kind === "video"
          ? `<video src="${asset.url}" muted playsinline loop></video>`
          : `<img src="${asset.url}" alt="${asset.name}" />`;
      button.innerHTML = `
        <span class="clip-thumb">${media}</span>
        <span class="clip-meta">
          <strong>${asset.kind === "video" ? "Video" : "Image"}</strong>
          <small>${asset.name}</small>
          <em>${formatDuration(asset.duration || state.duration)}</em>
        </span>
      `;
      button.addEventListener("click", () => {
        state.selectedAssetId = asset.id;
        renderStaticUi();
      });
      els.clipStrip.appendChild(button);
    });
    const addClip = document.createElement("button");
    addClip.type = "button";
    addClip.className = "clip-add";
    addClip.innerHTML = "+";
    addClip.addEventListener("click", () => els.assetInput.click());
    els.clipStrip.appendChild(addClip);
  }

  function renderEffectGrid() {
    if (effectCanvases.length) return;
    for (let i = 0; i < 15; i += 1) {
      const cell = document.createElement("div");
      cell.className = "effect-cell";
      const canvas = document.createElement("canvas");
      canvas.width = 80;
      canvas.height = 80;
      cell.appendChild(canvas);
      els.effectGrid.appendChild(cell);
      effectCanvases.push(canvas);
    }
  }

  function updateModeClasses() {
    els.modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === state.mode));
    els.body.classList.toggle("preview-mode", state.mode === "preview");
    els.templateTitle.innerHTML = state.mode === "icon" ? "Templates <span>(Icon 1:1)</span>" : "Templates <span>(Preview 3:4)</span>";
    els.editorTitle.textContent = state.mode === "icon" ? "Icon Editor" : "Preview Editor";
    els.sizePill.textContent = state.mode === "icon" ? "324 x 324" : "720 x 960";
    els.exportAssetBtn.querySelector("span").textContent =
      state.mode === "icon" ? "Export icon (324 x 324)" : "Export preview (720 x 960)";
    els.instructionControl.style.display = state.mode === "preview" ? "flex" : "none";
    els.mockupTabs.style.display = state.mode === "icon" ? "grid" : "none";
    els.phoneMockup.classList.toggle("icon-frame", state.mode === "icon");
    els.phoneMockup.classList.toggle("preview-state", state.mode === "preview");
    els.phoneMockup.classList.toggle("camera-state", state.mode === "icon" && state.mockup === "camera");
    if (els.mockupFrame && state.mode === "icon") {
      els.mockupFrame.src = currentMockupSpec().src;
    }
    els.mockupName.textContent = state.mode === "icon" ? "icon preview" : "preview playback";
  }

  function renderStaticUi() {
    updateModeClasses();
    renderTemplates();
    renderAssets();
    renderClipStrip();
    els.durationSelect.value = String(state.duration);
    els.speedRange.value = String(state.speed);
    els.speedReadout.textContent = `${state.speed.toFixed(1)}x`;
    const asset = selectedAsset();
    els.scaleRange.value = String(asset?.scale || 1);
    els.instructionInput.value = state.instruction;
    els.transitionGroup.querySelectorAll("button").forEach((btn) => btn.classList.toggle("selected", btn.dataset.transition === state.transition));
    els.curveGroup.querySelectorAll("button").forEach((btn) => btn.classList.toggle("selected", btn.dataset.curve === state.curve));
    els.mockupTabs.querySelectorAll("button").forEach((btn) => btn.classList.toggle("selected", btn.dataset.mockup === state.mockup));
    updateZoom();
  }

  function updateZoom() {
    els.mainCanvas.style.transform = `scale(${state.zoom})`;
    els.zoomReadout.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  async function createAssetFromFile(file) {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/") || /\.gif$/i.test(file.name);
    if (!isVideo && !isImage) {
      const blankUrl = makeBlankDataUrl();
      return {
        id: uid(),
        name: file.name,
        kind: "image",
        url: blankUrl,
        el: await imageFromUrl(blankUrl),
        duration: 3,
        x: 0,
        y: 0,
        scale: 1,
        sourceNote: "Layered PSD placeholder",
      };
    }
    if (isVideo) {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
        video.onerror = resolve;
      });
      return {
        id: uid(),
        name: file.name,
        kind: "video",
        url,
        el: video,
        duration: Number.isFinite(video.duration) ? Math.min(Math.max(video.duration, 3), 12) : 3,
        x: 0,
        y: 0,
        scale: 1,
      };
    }
    const img = await imageFromUrl(url);
    return {
      id: uid(),
      name: file.name,
      kind: "image",
      url,
      el: img,
      duration: 3,
      x: 0,
      y: 0,
      scale: 1,
    };
  }

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    pushHistory();
    const created = [];
    for (const file of files) {
      created.push(await createAssetFromFile(file));
    }
    state.assets.push(...created);
    state.selectedAssetId = created[0].id;
    state.duration = Math.max(Number(state.duration), Math.min(12, Math.max(3, created.length * 3)));
    showToast(`${created.length} asset${created.length > 1 ? "s" : ""} added`);
    renderStaticUi();
  }

  function canvasPoint(event) {
    const rect = els.mainCanvas.getBoundingClientRect();
    const size = currentSize();
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.width,
      y: ((event.clientY - rect.top) / rect.height) * size.height,
    };
  }

  function onPointerDown(event) {
    const size = currentSize();
    const point = canvasPoint(event);
    const splitX = size.width * state.split;
    const isSplitTemplate = currentTemplate().type === "split";
    pushHistory();
    if (isSplitTemplate && Math.abs(point.x - splitX) < size.width * 0.08) {
      dragState = { type: "split" };
    } else {
      const asset = selectedAsset();
      dragState = {
        type: "asset",
        asset,
        startX: point.x,
        startY: point.y,
        baseX: asset?.x || 0,
        baseY: asset?.y || 0,
      };
    }
    els.mainCanvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragState) return;
    const size = currentSize();
    const point = canvasPoint(event);
    if (dragState.type === "split") {
      state.split = clamp(point.x / size.width, 0.18, 0.82);
      return;
    }
    if (dragState.asset && !dragState.asset.sample) {
      dragState.asset.x = dragState.baseX + point.x - dragState.startX;
      dragState.asset.y = dragState.baseY + point.y - dragState.startY;
      els.scaleRange.value = String(dragState.asset.scale);
    } else if (dragState.asset) {
      dragState.asset.x = dragState.baseX + point.x - dragState.startX;
      dragState.asset.y = dragState.baseY + point.y - dragState.startY;
    }
  }

  function onPointerUp(event) {
    dragState = null;
    try {
      els.mainCanvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture may already be released if the pointer leaves the window.
    }
  }

  function onWheel(event) {
    event.preventDefault();
    const asset = selectedAsset();
    if (!asset) return;
    pushHistory();
    const next = clamp((asset.scale || 1) + (event.deltaY > 0 ? -0.04 : 0.04), 0.5, 2.4);
    asset.scale = next;
    els.scaleRange.value = String(next);
  }

  function resetTransform() {
    const asset = selectedAsset();
    if (!asset) return;
    pushHistory();
    asset.x = 0;
    asset.y = 0;
    asset.scale = 1;
    els.scaleRange.value = "1";
    showToast("Transform reset");
  }

  function downloadCanvas(canvas, filename, formatOverride) {
    const format = formatOverride || els.formatSelect.value;
    const quality = Number(els.qualityRange.value);
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const link = document.createElement("a");
    link.download = `${filename}.${format}`;
    link.href = canvas.toDataURL(mime, quality);
    link.click();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function preferredVideoMime() {
    if (!window.MediaRecorder) return null;
    const candidates = [
      { mime: "video/mp4;codecs=h264", ext: "mp4" },
      { mime: "video/mp4", ext: "mp4" },
      { mime: "video/webm;codecs=vp9", ext: "webm" },
      { mime: "video/webm;codecs=vp8", ext: "webm" },
      { mime: "video/webm", ext: "webm" },
    ];
    return candidates.find((item) => MediaRecorder.isTypeSupported(item.mime)) || null;
  }

  async function exportVideo() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      showToast("Video export is not supported in this browser");
      return;
    }
    const picked = preferredVideoMime();
    if (!picked) {
      showToast("No supported video encoder found");
      return;
    }
    const size = currentSize();
    const fps = Number(els.fpsSelect.value) || 30;
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const exportCtx = canvas.getContext("2d");
    const stream = canvas.captureStream(fps);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: picked.mime });
    const oldTime = state.currentTime;
    const oldPlaying = state.isPlaying;
    state.isPlaying = false;

    const stopped = new Promise((resolve) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = resolve;
    });

    recorder.start();
    const started = performance.now();
    const totalMs = state.duration * 1000;

    await new Promise((resolve) => {
      const tick = (now) => {
        const elapsed = now - started;
        state.currentTime = ((elapsed / 1000) * state.speed) % state.duration;
        drawTemplate(exportCtx, size.width, size.height, { export: true });
        if (elapsed < totalMs) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });

    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    state.currentTime = oldTime;
    state.isPlaying = oldPlaying;

    const blob = new Blob(chunks, { type: picked.mime });
    const baseName = state.mode === "icon" ? "effect-icon-animation" : "effect-preview-animation";
    downloadBlob(blob, `${baseName}.${picked.ext}`);
    showToast(picked.ext === "mp4" ? "MP4 exported" : "MP4 unavailable here; WebM exported");
  }

  function exportAsset() {
    if (els.formatSelect.value === "mp4") {
      exportVideo();
      return;
    }
    const size = currentSize();
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    drawTemplate(canvas.getContext("2d"), size.width, size.height, { export: true });
    downloadCanvas(canvas, state.mode === "icon" ? "effect-icon-324" : "effect-preview-720x960");
    showToast("Asset exported");
  }

  function drawProvidedIconMockup(c, width, height) {
    const spec = currentMockupSpec();
    const frame = state.mockup === "camera" ? staticImages.camera : staticImages.panel;
    if (!frame) return;
    c.clearRect(0, 0, width, height);
    const scale = Math.min(width / spec.width, height / spec.height);
    const drawW = spec.width * scale;
    const drawH = spec.height * scale;
    const offsetX = (width - drawW) / 2;
    const offsetY = (height - drawH) / 2;
    const assetCanvas = renderTemplateCanvas(ICON_SIZE);
    spec.slots.forEach((slot) => {
      c.drawImage(
        assetCanvas,
        offsetX + slot.x * scale,
        offsetY + slot.y * scale,
        slot.width * scale,
        slot.height * scale,
      );
    });
    c.drawImage(frame, offsetX, offsetY, drawW, drawH);
  }

  function drawPhoneMockup(c, width, height) {
    if (state.mode === "icon") {
      drawProvidedIconMockup(c, width, height);
      return;
    }

    const phoneW = width * 0.42;
    const phoneH = phoneW * 2.08;
    const phoneX = (width - phoneW) / 2;
    const phoneY = height * 0.08;
    const radius = phoneW * 0.11;
    c.fillStyle = "#11131c";
    c.fillRect(0, 0, width, height);
    c.save();
    c.shadowColor = "rgba(0,0,0,.6)";
    c.shadowBlur = 45;
    drawRoundedRect(c, phoneX, phoneY, phoneW, phoneH, radius);
    c.fillStyle = "#050609";
    c.fill();
    c.restore();
    drawRoundedRect(c, phoneX + 12, phoneY + 12, phoneW - 24, phoneH - 24, radius * 0.78);
    c.save();
    c.clip();
    const bg = c.createLinearGradient(phoneX, phoneY, phoneX + phoneW, phoneY + phoneH);
    bg.addColorStop(0, "#08a8d2");
    bg.addColorStop(0.55, "#104b66");
    bg.addColorStop(1, "#09111f");
    c.fillStyle = bg;
    c.fillRect(phoneX + 12, phoneY + 12, phoneW - 24, phoneH - 24);
    const size = currentSize();
    const assetCanvas = document.createElement("canvas");
    assetCanvas.width = size.width;
    assetCanvas.height = size.height;
    drawTemplate(assetCanvas.getContext("2d"), size.width, size.height, { export: true });
    if (state.mode === "preview") {
      c.drawImage(assetCanvas, phoneX + phoneW * 0.15, phoneY + phoneH * 0.15, phoneW * 0.7, phoneW * 0.93);
    } else if (state.mockup === "camera") {
      c.drawImage(assetCanvas, phoneX + phoneW * 0.34, phoneY + phoneH * 0.25, phoneW * 0.32, phoneW * 0.32);
    } else {
      c.drawImage(assetCanvas, phoneX + phoneW * 0.12, phoneY + phoneH * 0.73, phoneW * 0.16, phoneW * 0.16);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          if (row === 0 && col === 0) continue;
          const x = phoneX + phoneW * 0.12 + col * phoneW * 0.16;
          const y = phoneY + phoneH * 0.73 + row * phoneW * 0.16;
          c.fillStyle = `hsl(${(row * 70 + col * 28) % 360} 70% 58%)`;
          drawRoundedRect(c, x, y, phoneW * 0.12, phoneW * 0.12, 7);
          c.fill();
        }
      }
    }
    c.restore();
    c.fillStyle = "#fff";
    c.font = "800 30px Inter, Arial, sans-serif";
    c.textAlign = "center";
    c.fillText(state.mode === "icon" ? "Effect Icon Mockup" : "Effect Preview Mockup", width / 2, height - 56);
  }

  function exportMockup() {
    const canvas = document.createElement("canvas");
    if (state.mode === "icon") {
      const spec = currentMockupSpec();
      canvas.width = spec.width;
      canvas.height = spec.height;
    } else {
      canvas.width = 1080;
      canvas.height = 1350;
    }
    drawPhoneMockup(canvas.getContext("2d"), canvas.width, canvas.height);
    downloadCanvas(canvas, "tiktok-mockup", els.formatSelect.value === "jpg" ? "jpg" : "png");
    showToast("Mock-up exported");
  }

  function clearAll() {
    pushHistory();
    state.assets.forEach((asset) => {
      if (asset.url?.startsWith("blob:")) URL.revokeObjectURL(asset.url);
    });
    state.assets = [];
    state.selectedAssetId = null;
    state.currentTime = 0;
    state.split = 0.5;
    state.instruction = "Tap to start";
    state.duration = 3;
    renderStaticUi();
    showToast("Workspace cleared");
  }

  function addCustomTemplate() {
    const name = window.prompt("Template name", state.mode === "icon" ? "Custom Icon" : "Custom Preview");
    if (!name) return;
    pushHistory();
    const id = `custom-${uid()}`;
    templates[state.mode].push({
      id,
      label: name.slice(0, 26),
      type: currentTemplate().type,
      accent: ["#192231", "#20e6ea"],
      video: currentTemplate().video,
    });
    state.templateId = id;
    renderStaticUi();
    showToast("Custom template saved");
  }

  function bindEvents() {
    els.modeTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        if (state.mode === tab.dataset.mode) return;
        pushHistory();
        state.mode = tab.dataset.mode;
        state.templateId = templates[state.mode][0].id;
        state.currentTime = 0;
        state.mockup = "panel";
        renderStaticUi();
      });
    });

    els.assetInput.addEventListener("change", (event) => handleFiles(event.target.files));
    els.psdInput.addEventListener("change", (event) => handleFiles(event.target.files));
    ["dragenter", "dragover"].forEach((type) => {
      els.dropzone.addEventListener(type, (event) => {
        event.preventDefault();
        els.dropzone.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      els.dropzone.addEventListener(type, (event) => {
        event.preventDefault();
        els.dropzone.classList.remove("dragging");
      });
    });
    els.dropzone.addEventListener("drop", (event) => handleFiles(event.dataTransfer.files));

    els.mainCanvas.addEventListener("pointerdown", onPointerDown);
    els.mainCanvas.addEventListener("pointermove", onPointerMove);
    els.mainCanvas.addEventListener("pointerup", onPointerUp);
    els.mainCanvas.addEventListener("pointercancel", onPointerUp);
    els.mainCanvas.addEventListener("wheel", onWheel, { passive: false });

    els.playBtn.addEventListener("click", () => {
      state.isPlaying = !state.isPlaying;
      lastTick = performance.now();
      els.playBtn.innerHTML = state.isPlaying
        ? '<svg viewBox="0 0 24 24"><path d="M8 5h3v14H8z"/><path d="M13 5h3v14h-3z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    });

    els.progressRange.addEventListener("input", () => {
      state.currentTime = (Number(els.progressRange.value) / 1000) * state.duration;
    });

    els.durationSelect.addEventListener("change", () => {
      pushHistory();
      state.duration = Number(els.durationSelect.value);
      state.currentTime = Math.min(state.currentTime, state.duration);
      renderStaticUi();
    });

    els.speedRange.addEventListener("input", () => {
      state.speed = Number(els.speedRange.value);
      els.speedReadout.textContent = `${state.speed.toFixed(1)}x`;
    });

    els.scaleRange.addEventListener("input", () => {
      const asset = selectedAsset();
      if (!asset) return;
      asset.scale = Number(els.scaleRange.value);
    });
    els.scaleRange.addEventListener("change", pushHistory);
    els.resetTransformBtn.addEventListener("click", resetTransform);

    els.instructionInput.addEventListener("input", () => {
      state.instruction = els.instructionInput.value;
    });
    els.instructionInput.addEventListener("change", pushHistory);

    els.transitionGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-transition]");
      if (!button) return;
      pushHistory();
      state.transition = button.dataset.transition;
      renderStaticUi();
    });

    els.curveGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-curve]");
      if (!button) return;
      pushHistory();
      state.curve = button.dataset.curve;
      renderStaticUi();
    });

    els.mockupTabs.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-mockup]");
      if (!button) return;
      state.mockup = button.dataset.mockup;
      renderStaticUi();
    });

    els.zoomInBtn.addEventListener("click", () => {
      state.zoom = clamp(state.zoom + 0.1, 0.6, 1.6);
      updateZoom();
    });
    els.zoomOutBtn.addEventListener("click", () => {
      state.zoom = clamp(state.zoom - 0.1, 0.6, 1.6);
      updateZoom();
    });
    els.fitBtn.addEventListener("click", () => {
      state.zoom = 1;
      updateZoom();
    });
    els.canvasFitBtn.addEventListener("click", resetTransform);

    els.exportAssetBtn.addEventListener("click", exportAsset);
    els.exportMockupBtn.addEventListener("click", exportMockup);
    els.clearBtn.addEventListener("click", clearAll);
    els.undoBtn.addEventListener("click", undo);
    els.redoBtn.addEventListener("click", redo);
    els.nextClipBtn.addEventListener("click", () => {
      const assets = activeAssets();
      const index = assets.findIndex((asset) => asset.id === state.selectedAssetId);
      state.selectedAssetId = assets[(index + 1) % assets.length]?.id || state.selectedAssetId;
      renderStaticUi();
    });
    els.customTemplateBtn.addEventListener("click", addCustomTemplate);
    els.figmaBtn.addEventListener("click", () => els.psdInput.click());
    els.psdBtn.addEventListener("click", () => els.psdInput.click());
    els.projectBtn.addEventListener("click", () => showToast("Project workspace is local and ready"));
  }

  async function init() {
    await loadStaticImages();
    await createSamples();
    bindEvents();
    renderStaticUi();
    pushHistory();
    requestAnimationFrame(renderFrame);
  }

  init();
})();
