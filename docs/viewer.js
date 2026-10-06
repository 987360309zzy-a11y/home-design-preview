const section = document.querySelector('#model');
const viewer = document.querySelector('#home-model');
const status = document.querySelector('#viewer-status');
const progress = document.querySelector('#viewer-progress');
const cover = document.querySelector('#viewer-cover');
const startButton = document.querySelector('#viewer-start');
const retryButton = document.querySelector('#viewer-retry');
const download = document.querySelector('#viewer-download');
const modelButtons = [...document.querySelectorAll('[data-model]')];
const viewButtons = [...document.querySelectorAll('[data-view]')];
const zoomButtons = [...document.querySelectorAll('[data-zoom]')];
const models = {
  cutaway: {file: 'apartment-design-cutaway.glb', label: '全屋切面'},
  full: {file: 'apartment-design-full.glb', label: '完整模型'},
  joinery: {file: 'joinery-only.glb', label: '仅柜体'},
  appliances: {file: 'appliances-only.glb', label: '仅电器'}
};
// Linear RGBA from the original V10 Blender material diffuse/Principled colors.
// Procedural textures are not present in glTF. Only these six named materials
// receive a display approximation. The floor texture and GLB files stay intact.
const materialColors = {
  Reference03_walnut: [0.13, 0.0575, 0.027, 1],
  Study_warm_walnut_desktop: [0.225, 0.1425, 0.0815, 1],
  'Natural oak': [0.45, 0.31, 0.17, 1],
  Master_ochre_linen: [0.53, 0.34, 0.13, 1],
  'Warm limestone': [0.64, 0.59, 0.49, 1],
  V10_BathA_light_warm_grey_tile_appearance: [0.57, 0.55, 0.51, 1]
};
let selected = 'cutaway';
let busy = false;
let started = false;
let libraryPromise;
let timeout;
function setBusy(value) {
  busy = value;
  modelButtons.forEach(button => {button.disabled = value;});
  viewButtons.forEach(button => {button.disabled = value || !viewer.loaded;});
  zoomButtons.forEach(button => {button.disabled = value || !viewer.loaded;});
  section.setAttribute('aria-busy', String(value));
}
function fail() {
  clearTimeout(timeout);
  setBusy(false);
  section.dataset.loadState = 'error';
  progress.hidden = true;
  status.textContent = '3D未能加载，请重试或下载模型。';
  retryButton.hidden = false;
  cover.hidden = false;
  startButton.hidden = false;
  startButton.textContent = '重新加载3D';
}
function resetView(orbit = '45deg 35deg 105%') {
  viewer.cameraTarget = 'auto auto auto';
  viewer.cameraOrbit = orbit;
  viewer.fieldOfView = '30deg';
  viewer.jumpCameraToGoal();
}
async function loadModel(key) {
  if (busy || !models[key]) return;
  selected = key;
  started = true;
  setBusy(true);
  section.dataset.loadState = 'loading';
  delete section.dataset.loadedModel;
  retryButton.hidden = true;
  startButton.hidden = true;
  status.textContent = `正在加载${models[key].label}…`;
  progress.hidden = false;
  progress.value = 0;
  download.href = models[key].file;
  download.textContent = `下载${models[key].label} GLB`;
  modelButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.model === key)));
  timeout = setTimeout(fail, 120000);
  try {
    libraryPromise ??= import('./vendor/model-viewer-4.3.1.min.js').catch(error => {
      libraryPromise = undefined;
      throw error;
    });
    await libraryPromise;
    await customElements.whenDefined('model-viewer');
    viewer.cameraTarget = 'auto auto auto';
    viewer.cameraOrbit = '45deg 35deg 105%';
    cover.hidden = true;
    // Removing src allows a genuine retry after a failed load of the same URL.
    viewer.removeAttribute('src');
    await viewer.updateComplete;
    viewer.src = models[key].file;
  } catch (error) {
    console.error('3D viewer loading failed', error);
    fail();
  }
}
viewer.addEventListener('progress', event => {
  if (busy) progress.value = event.detail.totalProgress;
});
viewer.addEventListener('load', () => {
  if (!viewer.loaded || viewer.src !== models[selected].file) return;
  clearTimeout(timeout);
  for (const material of viewer.model?.materials ?? []) {
    const color = materialColors[material.name];
    if (color) material.pbrMetallicRoughness.setBaseColorFactor(color);
  }
  resetView();
  section.dataset.loadState = 'ready';
  section.dataset.loadedModel = selected;
  progress.hidden = true;
  cover.hidden = true;
  retryButton.hidden = true;
  status.textContent = `${models[selected].label}已就绪`;
  setBusy(false);
});
viewer.addEventListener('error', fail);
startButton.addEventListener('click', () => loadModel(selected));
retryButton.addEventListener('click', () => loadModel(selected));
modelButtons.forEach(button => button.addEventListener('click', () => {
  if (button.dataset.model !== selected || !viewer.loaded) loadModel(button.dataset.model);
}));
viewButtons.forEach(button => button.addEventListener('click', () => {
  resetView(button.dataset.view === 'top' ? '0deg 0.5deg 95%' : '45deg 35deg 105%');
}));
zoomButtons.forEach(button => button.addEventListener('click', () => viewer.zoom(Number(button.dataset.zoom))));
function openFromHash() {
  if (location.hash === '#model' && !started) loadModel(selected);
}
window.addEventListener('hashchange', openFromHash);
openFromHash();
