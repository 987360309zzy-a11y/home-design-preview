// V12 GLB materials already contain their baked base-color, normal and ORM maps.
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
  cutaway: {file: 'apartment-design-cutaway-v12.glb', label: '全屋切面'},
  full: {file: 'apartment-design-full-v12.glb', label: '完整模型'},
  joinery: {file: 'joinery-only-v12.glb', label: '仅柜体'},
  appliances: {file: 'appliances-only-v12.glb', label: '仅电器'}
};
let selected = 'cutaway';
let busy = false;
let started = false;
let libraryPromise;
let timeout;
let pendingView = 'default';
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
  section.dataset.viewPreset = orbit.startsWith('0deg') ? 'top' : 'angled';
  viewer.jumpCameraToGoal();
}
function setLaundryView() {
  pendingView = 'laundry';
  viewer.cameraTarget = '2.35m 1.15m -9.1m';
  viewer.cameraOrbit = '165deg 84deg 1.45m';
  viewer.fieldOfView = '85deg';
  viewer.jumpCameraToGoal();
  section.dataset.viewPreset = 'laundry';
}
function setTelevisionView() {
  pendingView = 'television';
  viewer.cameraTarget = '6.9m 1.3m -3.5m';
  viewer.cameraOrbit = '-90deg 86deg 2.7m';
  viewer.fieldOfView = '65deg';
  viewer.jumpCameraToGoal();
  section.dataset.viewPreset = 'television';
}
async function loadModel(key, preset = 'default') {
  if (busy || !models[key]) return;
  selected = key;
  pendingView = preset;
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
  if (pendingView === 'laundry') setLaundryView();
  else if (pendingView === 'television') setTelevisionView();
  else resetView();
  section.dataset.loadState = 'ready';
  section.dataset.loadedModel = selected;
  progress.hidden = true;
  cover.hidden = true;
  retryButton.hidden = true;
  status.textContent = `${models[selected].label}已就绪`;
  setBusy(false);
});
viewer.addEventListener('error', fail);
startButton.addEventListener('click', () => loadModel(selected, pendingView));
retryButton.addEventListener('click', () => loadModel(selected, pendingView));
modelButtons.forEach(button => button.addEventListener('click', () => {
  if (button.dataset.model !== selected || !viewer.loaded) loadModel(button.dataset.model);
}));
viewButtons.forEach(button => button.addEventListener('click', () => {
  if (button.dataset.view === 'television') {
    if (selected !== 'full' || !viewer.loaded) loadModel('full', 'television');
    else setTelevisionView();
    return;
  }
  if (button.dataset.view === 'laundry') {
    if (selected !== 'cutaway' || !viewer.loaded) loadModel('cutaway', 'laundry');
    else setLaundryView();
    return;
  }
  pendingView = 'default';
  resetView(button.dataset.view === 'top' ? '0deg 0.5deg 95%' : '45deg 35deg 105%');
}));
zoomButtons.forEach(button => button.addEventListener('click', () => viewer.zoom(Number(button.dataset.zoom))));
function openFromHash() {
  if (location.hash === '#model' && !started) loadModel(selected);
}
window.addEventListener('hashchange', openFromHash);
openFromHash();
