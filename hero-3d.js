const sequence = document.querySelector("#scroll-sequence");
const stage = document.querySelector(".hero-stage");
const canvas = document.querySelector("#product-canvas");
const poster = document.querySelector("#model-poster");
const progressLine = document.querySelector("#progress-line");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const smallScreen = window.matchMedia("(max-width: 700px)");
const ticks = [...document.querySelectorAll(".chapter-tick")];
const reviewOptions = new URLSearchParams(location.search);
const forceStatic = reviewOptions.get('motion') === 'static';

const chapters = [
  { key: "ESKA_ERG_H1", title: "ESKA ERG-H1", detail: "Təzyiq tənzimlənməsi", status: "KONSEPTUAL KƏSİK · RƏSMİ SXEMƏ ƏSASLANIR", mode: "section" },
  { key: "PLUM_MACBAT_5", title: "PLUM MacBAT 5", detail: "Həcm korrektorı · qapaq və daxili elektronika", status: "ED.25 · DAXİLİ GÖРÜNÜŞ · CAD DEYİL", mode: "lid" },
  { key: "HONEYWELL_ELSTER_EK280", title: "ELSTER EK280", detail: "Həcm korrektorı · batareya və terminal lövhəsi", status: "RƏSMİ TƏLİMAT · ŞƏKİL 8 / 30", mode: "case" },
  { key: "ESKA_EGV1025_REFERENCE", title: "ESKA EGV", detail: "Avtomatik bağlama klapanı · xarici görünüş", status: "KONSEPTUAL XARİCİ FORMA · VARİANT TƏSDİQLƏNMƏYİB", mode: "exterior" },
  { key: "BROEN_BALLOMAX_REFERENCE", title: "BROEN Ballomax · DN65", detail: "BBM60461 · 8600416065 010", status: "İSTEHSALÇININ STEP MODELİ · XARİCİ GÖRÜNÜŞ", mode: "exterior" },
  { key: "NATEK_AG4TC_CATALOG_REFERENCE", title: "NATEK AG4TC", detail: "Membranlı qaz sayğacı · xarici görünüş", status: "XARİCİ GÖRÜNÜŞ · AG4TC VARİANTI DƏQİQLƏŞMƏYİB", mode: "exterior" }
];

const copy = {
  az: {
    details: ["Qaz təzyiq tənzimləyicisi", "Həcm korrektorı", "Həcm korrektorı", "Avtomatik bağlama klapanı", "Kürəvi klapan · DN65", "Membranlı qaz sayğacı"],
    conceptual: "KONSEPTUAL DAXİLİ GÖRÜNÜŞ · İSTEHSALÇI CAD MODELİ DEYİL",
    exterior: "XARİCİ FORMA ÜZRƏ VİZUAL TƏDQİQAT",
    cad: "İSTEHSALÇININ STEP MODELİ · XARİCİ FORMA",
    scroll: "3D · AŞAĞI SÜRÜŞDÜRÜN", static: "HƏRƏKƏTSİZ BAXIŞ",
    heading: "Altı məhsul üzrə 3D baxış",
    description: "Sürüşdürərək modellərə baxın və ya məhsul seçin. Açılan daxili görünüşlər konseptual vizual tədqiqatdır; istehsalçının CAD yığımı deyil.",
    evidence: "Texniki mənbələr və məhdudiyyətlər"
  },
  en: {
    details: ["Gas pressure regulator", "Volume corrector", "Volume corrector", "Automatic shut-off valve", "Ball valve · DN65", "Diaphragm gas meter"],
    conceptual: "CONCEPTUAL INTERIOR · NOT MANUFACTURER CAD",
    exterior: "EXTERIOR VISUAL STUDY", cad: "MANUFACTURER STEP MODEL · EXTERIOR",
    scroll: "3D · SCROLL TO EXPLORE", static: "STATIC VIEW",
    heading: "Six 3D product studies",
    description: "Scroll through the models or select a product. Opening views are conceptual visual studies; they are not manufacturer CAD assemblies.",
    evidence: "Engineering sources and limitations"
  },
  tr: {
    details: ["Gaz basınç regülatörü", "Hacim düzeltici", "Hacim düzeltici", "Otomatik kapatma vanası", "Küresel vana · DN65", "Diyaframlı gaz sayacı"],
    conceptual: "KAVRAMSAL İÇ GÖRÜNÜM · ÜRETİCİ CAD MODELİ DEĞİL",
    exterior: "DIŞ GÖRÜNÜM ÇALIŞMASI", cad: "ÜRETİCİ STEP MODELİ · DIŞ GÖRÜNÜM",
    scroll: "3D · KEŞFETMEK İÇİN KAYDIRIN", static: "SABİT GÖRÜNÜM",
    heading: "Altı 3D ürün çalışması",
    description: "Modelleri kaydırarak inceleyin veya bir ürün seçin. Açılan iç görünümler kavramsaldır; üreticinin CAD montajı değildir.",
    evidence: "Teknik kaynaklar ve sınırlamalar"
  },
  ru: {
    details: ["Регулятор давления газа", "Корректор объёма", "Корректор объёма", "Автоматический запорный клапан", "Шаровой кран · DN65", "Мембранный счётчик газа"],
    conceptual: "КОНЦЕПТУАЛЬНЫЙ РАЗРЕЗ · НЕ CAD ПРОИЗВОДИТЕЛЯ",
    exterior: "ВИЗУАЛИЗАЦИЯ ВНЕШНЕГО ВИДА", cad: "STEP-МОДЕЛЬ ПРОИЗВОДИТЕЛЯ · ВНЕШНИЙ ВИД",
    scroll: "3D · ПРОКРУТИТЕ ДЛЯ ПРОСМОТРА", static: "СТАТИЧНЫЙ ВИД",
    heading: "Шесть 3D-моделей продукции",
    description: "Прокрутите модели или выберите продукт. Внутренние виды являются концептуальными и не представляют собой CAD-сборки производителя.",
    evidence: "Технические источники и ограничения"
  },
  ka: {
    details: ["გაზის წნევის რეგულატორი", "მოცულობის კორექტორი", "მოცულობის კორექტორი", "ავტომატური ჩამკეტი სარქველი", "ბურთულიანი სარქველი · DN65", "მემბრანული გაზის მრიცხველი"],
    conceptual: "კონცეპტუალური შიდა ხედი · არაა მწარმოებლის CAD",
    exterior: "გარე ფორმის ვიზუალური კვლევა", cad: "მწარმოებლის STEP მოდელი · გარე ფორმა",
    scroll: "3D · გადაახვიეთ დასათვალიერებლად", static: "სტატიკური ხედი",
    heading: "ექვსი პროდუქტის 3D მიმოხილვა",
    description: "დაათვალიერეთ მოდელები გადახვევით ან აირჩიეთ პროდუქტი. შიდა ხედები კონცეპტუალურია და არ წარმოადგენს მწარმოებლის CAD აწყობას.",
    evidence: "ტექნიკური წყაროები და შეზღუდვები"
  }
};
const languageCopy = () => copy[window.AzTexnoI18n?.language || document.documentElement.lang] || copy.az;

// Keep the mobile product beside the end of the translated introduction.
// Its position follows text wrapping instead of assuming one language's height.
function positionMobileModel() {
  if (!smallScreen.matches) return;
  const hero = stage.querySelector('.hero');
  const copy = hero.querySelector('.hero-copy');
  const offset = Math.max(260, Math.round(copy.getBoundingClientRect().bottom - hero.getBoundingClientRect().top - 105));
  hero.style.setProperty('--mobile-model-offset', `${offset}px`);
}
if ('ResizeObserver' in window) {
  const mobileCopyObserver = new ResizeObserver(positionMobileModel);
  mobileCopyObserver.observe(stage.querySelector('.hero-copy'));
  mobileCopyObserver.observe(stage.querySelector('h1'));
}
window.addEventListener('aztexnogaz:languagechange', positionMobileModel);
window.addEventListener('resize', positionMobileModel, { passive: true });
positionMobileModel();

const $ = (selector) => document.querySelector(selector);
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

let renderer, scene, camera, pmrem, floorShadow;
let loaded = false;
let scheduled = false;
let raf = 0;
let progress = 0;
let lastTriangles = 0;
let exporting = false;
let exportRenderer;
const frameTimes = [];
const groups = [];
const hooks = new Map();
let baseTransforms = new WeakMap();

function headerOffset() {
  return document.querySelector(".contact-rail").offsetHeight + document.querySelector(".site-header").offsetHeight;
}

function getProgress() {
  if (!sequence || reducedMotion.matches || forceStatic) return 0;
  const { start, travel } = progressRange();
  return clamp((window.scrollY - start) / travel);
}

function progressRange() {
  if (smallScreen.matches) {
    const hero = stage.querySelector('.hero');
    return {
      start: hero.getBoundingClientRect().top + window.scrollY - headerOffset(),
      travel: Math.max(1, hero.offsetHeight - canvas.clientHeight + 12)
    };
  }
  return {
    start: sequence.getBoundingClientRect().top + window.scrollY - document.querySelector('.site-header').offsetHeight,
    travel: Math.max(1, sequence.offsetHeight - stage.offsetHeight)
  };
}

function saveBase(object) {
  if (!object) return null;
  if (baseTransforms.has(object)) return baseTransforms.get(object);
  baseTransforms.set(object, {
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone()
  });
  return baseTransforms.get(object);
}

function setTransform(object, { position, rotation, scale } = {}) {
  if (!object) return;
  const base = saveBase(object);
  if (position) object.position.set(base.position.x + position[0], base.position.y + position[1], base.position.z + position[2]);
  else object.position.copy(base.position);
  if (rotation) object.rotation.set(base.rotation.x + rotation[0], base.rotation.y + rotation[1], base.rotation.z + rotation[2]);
  else object.rotation.copy(base.rotation);
  if (scale) object.scale.set(base.scale.x * scale[0], base.scale.y * scale[1], base.scale.z * scale[2]);
  else object.scale.copy(base.scale);
}

function opacityOf(group, alpha) {
  group.traverse((object) => {
    if (!object.isMesh) return;
    object.material.forEach ? object.material.forEach((material) => setMaterialOpacity(material, alpha)) : setMaterialOpacity(object.material, alpha);
  });
}

function setMaterialOpacity(material, alpha) {
  if (!material) return;
  material.opacity = alpha;
  material.transparent = alpha < 0.999;
  material.depthWrite = alpha > 0.985;
  material.needsUpdate = true;
}

function cacheHooks(root) {
  const get = (name) => root.getObjectByName(name);
  const sectionInternals = [];
  root.traverse((object) => {
    if (object.name.startsWith("ERG_SECTION ")) {
      object.visible = false;
      sectionInternals.push(object);
    }
  });
  hooks.set(root.userData.chapterIndex, {
    sectionAssembly: get('ERG_SECTION_FRONT_ASSEMBLY'),
    sectionLower: get("ERG_SECTION_FRONT_LOWER"),
    sectionChamber: get("ERG_SECTION_FRONT_CHAMBER"),
    sectionBonnet: get("ERG_SECTION_FRONT_BONNET"),
    topCap: get("ERG upper adjustment lid"),
    macbatHinge: get("MACBAT_HINGE"),
    ekCover: get("EK280_COVER"),
    broenHandle: get("BROEN_HANDLE"),
    ekFasteners: [...Array(4)].map((_, i) => get(`EK280 cover fastener ${i + 1}`)),
    ergSpring: get("ERG_SECTION main spring"),
    sectionInternals
  });
  for (const object of hooks.get(root.userData.chapterIndex).ekFasteners) saveBase(object);
}

function setLabel(index, local) {
  const chapter = chapters[index];
  if (!chapter) return;
  const localized = languageCopy();
  $("#caption-index").innerHTML = `${String(index + 1).padStart(2, "0")} <span>/ 06</span>`;
  $("#caption-title").textContent = chapter.title;
  $("#caption-detail").textContent = localized.details[index];
  $("#caption-status").textContent = chapter.mode === "exterior" ? (index === 4 ? localized.cad : localized.exterior) : localized.conceptual;
  $("#model-disclosure").textContent = reducedMotion.matches || forceStatic ? localized.static : localized.scroll;
  ticks.forEach((tick, i) => tick.classList.toggle("is-active", i === index));
}

function localizePanel() {
  const localized = languageCopy();
  $("#film-heading").textContent = localized.heading;
  $("#film-description").textContent = localized.description;
  $("#evidence-link").textContent = localized.evidence;
  setLabel(Math.min(chapters.length - 1, Math.floor(progress * chapters.length)), 0);
}

function animateChapter(index, local) {
  const chapter = chapters[index];
  const root = groups[index];
  const h = hooks.get(index) || {};
  if (!root) return;
  const orbit = Math.sin(local * Math.PI * 2) * 0.14;
  root.rotation.y = orbit;
  root.rotation.x = Math.sin(local * Math.PI) * 0.018;

  // The ESKA opening reveals only parts and placement visible in ESKA's official
  // cross-section drawing. The cut halves move out of the exact reverse path.
  const open = smooth(.32, .54, local) * (1 - smooth(.78, .94, local));
  root.scale.setScalar(index === 1 ? 1 - open * (smallScreen.matches ? .42 : .36) : index === 2 ? 1 - open * .39 : 1);
  root.position.x = index === 1 ? (smallScreen.matches ? .90 : .53) * open : index === 2 ? -.62 * open : -.10;
  if (chapter.mode === "section") {
    h.sectionInternals?.forEach((object) => { object.visible = open > .035; });
    setTransform(h.sectionAssembly, { position: [.86 * open, 0, .28 * open] });
  } else if (chapter.mode === "lid") {
    // Manufacturer interior drawing identifies the display/keyboard in the cover,
    // three main batteries and terminal/connectivity groups in the base.
    setTransform(h.macbatHinge, { rotation: [0, -2.70 * open, 0] });
  } else if (chapter.mode === "case") {
    // The official instructions identify four cover screws. Release them first,
    // then move the plate diagonally out of the inspection window.
    h.ekFasteners.forEach((object, i) => setTransform(object, {
      position: [0, 0, (.045 + (i % 2) * .012) * open],
      rotation: [0, Math.PI * 2.15 * open, 0]
    }));
    setTransform(h.ekCover, { position: [1.95 * open, 0, .34 * open], rotation: [0, -.20 * open, 0] });
  }

  // Exterior-only products receive a deliberate camera reveal, not invented internals.
  const focus = Math.sin(local * Math.PI * 2) * (chapter.mode === "exterior" ? .24 : .11);
  const detailPush = smooth(.17, .38, local) * (1 - smooth(.72, .93, local));
  const angle = (.34 + focus) * (1 - open * .72);
  const radius = (smallScreen.matches ? 9.15 : 7.6) - detailPush * .24;
  camera.position.set(Math.sin(angle) * radius, 1.35 + .08 * Math.sin(local * Math.PI), Math.cos(angle) * radius);
  camera.lookAt(0, .04, 0);
}

function updateScene() {
  scheduled = false;
  if (!renderer || !loaded || document.hidden || exporting) return;
  progress = getProgress();
  renderAt(progress);
}

function renderAt(value, targetRenderer = renderer, isExport = false) {
  progress = clamp(value);
  const q = progress * chapters.length;
  let active = Math.min(chapters.length - 1, Math.floor(q + 0.00001));
  let local = clamp(q - active);

  // At the exact end of the sequence hold the last complete exterior.
  if (progress >= 0.99999) { active = chapters.length - 1; local = 1; }
  // Keep product silhouettes clean. Each chapter fades through the stage color;
  // transparent models never overlap as a ghosted double exposure.
  groups.forEach((group, i) => {
    group.visible = i === active;
  });
  const transitionIn = active > 0 ? smooth(0, .10, local) : 1;
  const transitionOut = active < chapters.length - 1 ? 1 - smooth(.90, 1, local) : 1;
  const transitionOpacity = Math.min(transitionIn, transitionOut);
  canvas.style.opacity = String(transitionOpacity);
  $(".model-caption").style.opacity = String(transitionOpacity);
  setLabel(active, local);

  if (!isExport && (reducedMotion.matches || forceStatic)) {
    active = 0;
    local = 0;
    groups.forEach((group, i) => {
      group.visible = i === 0;
      group.rotation.set(0, 0, 0);
    });
    animateChapter(0,0);
  } else {
    animateChapter(active, local);
  }
  if (progressLine) progressLine.style.transform = `scaleX(${progress})`;
  if (!isExport && $('#review-timeline')) $('#review-timeline').value = String(progress);
  const start = performance.now();
  targetRenderer.render(scene, camera);
  frameTimes.push(performance.now()-start);
  if(frameTimes.length>180) frameTimes.shift();
  lastTriangles = targetRenderer.info.render.triangles;
  stage.dataset.chapter = String(active + 1);
  stage.dataset.localProgress = local.toFixed(4);
  stage.dataset.progress = progress.toFixed(6);
  stage.dataset.triangles = String(lastTriangles);
  stage.dataset.renderMs = (frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length).toFixed(2);
  stage.dataset.pose = JSON.stringify(groups[active].children[0].children.filter(o=>o.name.includes('COVER')||o.name.includes('HINGE')||o.name.includes('FRONT_ASSEMBLY')).map(o=>({n:o.name,p:o.position.toArray(),r:o.rotation.toArray()})));
}

function invalidate() {
  if (scheduled) return;
  scheduled = true;
  raf = requestAnimationFrame(updateScene);
}

function resize() {
  if (!renderer || !camera) return;
  groups.forEach((holder, index) => {
    const source = holder.children[0];
    const center = holder.userData.center;
    const maxDimension = holder.userData.maxDimension;
    if (!source || !center || !maxDimension) return;
    const fit = productFitLimit(index) / maxDimension;
    source.scale.setScalar(fit);
    source.position.set(-center.x * fit, -center.y * fit, -center.z * fit);
  });
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen.matches ? 1 : 1.1));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  invalidate();
}

function productFitLimit(index) {
  if (smallScreen.matches) {
    const mobileScale = Math.min(1, Math.max(.82, window.innerWidth / 390));
    return [2.95, 2.75, 2.68, 2.50, 2.72, 2.77][index] * mobileScale;
  }
  // Wide valves need more room beside the unchanged headline at tablet widths.
  if (window.innerWidth <= 1100) return [2.70, 2.70, 2.60, 2.55, 2.25, 2.50][index];
  if (window.innerWidth <= 1400) return [2.80, 2.70, 2.62, 2.50, 2.45, 2.45][index];
  return 2.95;
}

function addGrainTexture(THREE) {
  const size = 128;
  const grain = document.createElement("canvas");
  grain.width = grain.height = size;
  const context = grain.getContext("2d", { willReadFrequently: true });
  const image = context.createImageData(size, size);
  let seed = 21421;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = 105 + (seed % 48);
    image.data[i] = value; image.data[i + 1] = value; image.data[i + 2] = value; image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(grain);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function styleProduct(root, grain) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.material = Array.isArray(object.material) ? object.material.map((m) => m.clone()) : object.material.clone();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const mat of materials) {
      const label = (mat.name || "").toLowerCase();
      mat.bumpMap = grain;
      mat.bumpScale = label.includes("graphite") || label.includes("polymer") ? .0015 : label.includes("powder") ? .004 : .0025;
      if (label.includes("powder") || label.includes("coated")) mat.roughness = Math.max(.55, mat.roughness || .55);
      if (label.includes("satin") || label.includes("zinc") || label.includes("steel")) mat.roughness = Math.max(.39, mat.roughness || .4);
      mat.needsUpdate = true;
      // Object-space microtexture also works on CAD faces without UVs.
      if (!label.includes('glass') && !label.includes('lcd')) {
        mat.onBeforeCompile = shader => {
          shader.vertexShader = 'varying vec3 vSurfacePoint;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfacePoint = position;');
          shader.fragmentShader = 'varying vec3 vSurfacePoint;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nfloat grain = fract(sin(dot(floor(vSurfacePoint * 360.0),vec3(12.9898,78.233,37.719))) * 43758.5453);\nroughnessFactor = clamp(roughnessFactor + (grain-.5)*.052,.25,.95);');
        };
      }
    }
  });
}

async function boot() {
  try {
    localizePanel();
    window.addEventListener("aztexnogaz:languagechange", localizePanel);
    setupReviewControls();
    if (forceStatic) document.body.classList.add('static-review');
    if (reviewOptions.get('webgl') === 'off' || forceStatic || reducedMotion.matches) {
      document.body.classList.add('static-review');
      $('#model-disclosure').textContent=languageCopy().static;
      return;
    }
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    scene = new THREE.Scene();
    scene.background = null;
    scene.add(new THREE.HemisphereLight(0xe5edf5, 0x122035, .38));
    const key = new THREE.DirectionalLight(0xfff4e5, 1.65);
    key.position.set(-4.6, 6.2, 5.3); scene.add(key);
    key.castShadow = true;
    key.shadow.mapSize.set(smallScreen.matches ? 512 : 1024, smallScreen.matches ? 512 : 1024);
    Object.assign(key.shadow.camera,{left:-3.2,right:3.2,top:3.2,bottom:-3.2,near:.1,far:18});
    key.shadow.bias=-.00015; key.shadow.normalBias=.008; key.shadow.radius=2;
    const fill = new THREE.DirectionalLight(0xaebdd0, .48);
    fill.position.set(5.8, 2.8, 4.1); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x8ac5da, .90);
    rim.position.set(-1.8, 4.5, -5.0); scene.add(rim);
    const warm = new THREE.DirectionalLight(0xffd5a1, .12);
    warm.position.set(-5.5, 1.2, 1.4); scene.add(warm);

    camera = new THREE.PerspectiveCamera(31, 1, .1, 100);
    camera.position.set(3.1, 2.1, 7.8);
    camera.lookAt(0, .05, 0);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !smallScreen.matches, powerPreference: "high-performance", preserveDrawingBuffer: false });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .88;
    // The photographic plate and CSS stage supply contact shading; real-time
    // shadow-map passes would double the draw cost on low-power devices.
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = true;

    // A real-time studio environment provides broad, controlled reflections on the metal.
    const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
    pmrem = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    scene.environment = pmrem.fromScene(env, .04).texture;
    scene.environmentIntensity = .52;
    env.dispose();

    const grain = addGrainTexture(THREE);
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync("assets/3d/aztexnoqaz-six-product-studies.glb?v=1");
    for (let index = 0; index < chapters.length; index++) {
      const source = gltf.scene.getObjectByName(chapters[index].key);
      if (!source) throw new Error(`Missing 3D scene: ${chapters[index].key}`);
      const holder = new THREE.Group();
      holder.name = `Chapter ${index + 1} · ${chapters[index].key}`;
      holder.userData.chapterIndex = index;
      scene.add(holder);
      source.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(source);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      const fitLimit = productFitLimit(index);
      const fit = fitLimit / maxDimension;
      holder.userData.center = center;
      holder.userData.maxDimension = maxDimension;
      source.scale.setScalar(fit);
      source.position.set(-center.x * fit, -center.y * fit, -center.z * fit);
      holder.add(source);
      holder.visible = false;
      styleProduct(source, grain);
      groups.push(holder);
      cacheHooks(holder);
    }
    groups[0].visible = true;
    poster.hidden = true;
    canvas.classList.add("is-ready");
    loaded = true;
    resize();
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) invalidate(); });
    reducedMotion.addEventListener?.("change", invalidate);
    smallScreen.addEventListener?.("change", resize);
    invalidate();
    const preset = Number(reviewOptions.get('frame'));
    if(reviewOptions.has('frame') && Number.isFinite(preset)) goToProgress(preset);

    window.aztexnoqazPreview = {
      products: chapters.map(({ key, title, mode }) => ({ key, title, mode })),
      get triangles() { return lastTriangles; },
      get dpr() { return renderer.getPixelRatio(); },
      get progress() { return progress; },
      get loaded() { return loaded; },
      setProgress(value) {
        const { start, travel } = progressRange();
        window.scrollTo({ top: start + clamp(value) * travel, behavior: "instant" });
        invalidate();
      },
      dispose() { cancelAnimationFrame(raf); renderer.dispose(); pmrem?.dispose(); }
    };
    window.dispatchEvent(new CustomEvent("aztexnoqaz-preview-ready"));
  } catch (error) {
    $("#model-disclosure").textContent = `STATİK 3D POSTER · ${String(error?.message || error).slice(0, 68)}`;
    console.error("The local 3D catalog could not load; the rendered 3D poster remains visible.", error);
  }
}

window.addEventListener("scroll", invalidate, { passive: true });
window.addEventListener("resize", invalidate, { passive: true });

function goToProgress(value) {
  const { start, travel } = progressRange();
  window.scrollTo({top:start + clamp(value)*travel,behavior:'instant'});
  invalidate();
}

function setupReviewControls() {
  document.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>goToProgress((Number(button.dataset.chapter)+.62)/6)));
  $('#review-timeline')?.addEventListener('input',e=>goToProgress(Number(e.target.value)));
}
boot();
