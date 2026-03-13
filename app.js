const storageKey = "ai-map-demo-state-v3";
const defaultCenter = [35.681236, 139.767125];
const fallbackApiOrigin = "http://127.0.0.1:8000";
const queryApiBase = new URLSearchParams(location.search).get("api");

const defaultOrigin = {
  name: "東京駅",
  category: "station",
  description: "初期表示の出発地",
  lat: 35.681236,
  lon: 139.767125,
  source: "default",
};

const defaultDestination = {
  name: "皇居",
  category: "landmark",
  description: "初期表示の目的地",
  lat: 35.685175,
  lon: 139.7528,
  source: "default",
};

const fallbackAppInfo = {
  name: "AIルート生成型 地図システム",
  version: "0.4.0",
  engine: "osrm-fallback",
  engine_mode: "local-pc",
  supported_profiles: ["walk", "bicycle", "car"],
  sample_place_queries: ["東京駅", "皇居", "新宿駅", "大阪城", "近くのコンビニ"],
  sample_preferences: ["最短", "坂を避ける", "信号が少ない", "景色がいい", "ランニング向け"],
  supported_features: [
    "地点候補検索",
    "要望解析",
    "デモルート生成",
    "地図クリック選択",
    "JSONエクスポート",
    "ブラウザ保存",
  ],
};

const state = {
  appInfo: fallbackAppInfo,
  apiBase: fallbackApiOrigin,
  apiAvailable: false,
  customApiBase: "",
  activeTarget: "origin",
  origin: null,
  destination: null,
  route: null,
  currentLocation: null,
  parsedPreferences: null,
  navigationStarted: false,
  navigationIndex: 0,
  mapPickMode: null,
  busyCount: 0,
};

const elements = {
  connectionPill: document.getElementById("connection-pill"),
  apiBaseInput: document.getElementById("api-base-input"),
  applyApiButton: document.getElementById("apply-api-button"),
  clearApiButton: document.getElementById("clear-api-button"),
  reconnectButton: document.getElementById("reconnect-button"),
  originInput: document.getElementById("origin-input"),
  destinationInput: document.getElementById("destination-input"),
  profileSelect: document.getElementById("profile-select"),
  preferencesInput: document.getElementById("preferences-input"),
  engineWarning: document.getElementById("engine-warning"),
  statusMessage: document.getElementById("status-message"),
  mapPickStatus: document.getElementById("map-pick-status"),
  activeTargetLabel: document.getElementById("active-target-label"),
  preferenceTags: document.getElementById("preference-tags"),
  routeHighlights: document.getElementById("route-highlights"),
  routeSummaryLabel: document.getElementById("route-summary-label"),
  stepsList: document.getElementById("steps-list"),
  navCurrent: document.getElementById("nav-current"),
  navigationProgress: document.getElementById("navigation-progress"),
  samplePlaceChips: document.getElementById("sample-place-chips"),
  samplePreferenceChips: document.getElementById("sample-preference-chips"),
  featureChips: document.getElementById("feature-chips"),
  distanceValue: document.getElementById("distance-value"),
  durationValue: document.getElementById("duration-value"),
  elevationValue: document.getElementById("elevation-value"),
  trafficValue: document.getElementById("traffic-value"),
  maxGradientValue: document.getElementById("max-gradient-value"),
  avgGradientValue: document.getElementById("avg-gradient-value"),
  arrivalValue: document.getElementById("arrival-value"),
  originResults: document.getElementById("origin-results"),
  destinationResults: document.getElementById("destination-results"),
  originSelected: document.getElementById("origin-selected"),
  destinationSelected: document.getElementById("destination-selected"),
  startNavButton: document.getElementById("start-nav-button"),
  prevStepButton: document.getElementById("prev-step-button"),
  nextStepButton: document.getElementById("next-step-button"),
  pickOriginButton: document.getElementById("pick-origin-button"),
  pickDestinationButton: document.getElementById("pick-destination-button"),
  stopPickingButton: document.getElementById("stop-picking-button"),
};

const busyButtons = Array.from(document.querySelectorAll("[data-busy-button]"));

const map = L.map("map").setView(defaultCenter, 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let previewTimer = null;
let routeLayer = null;
let apiHeartbeatTimer = null;
const markers = {
  origin: null,
  destination: null,
};

wireEvents();
initialize().catch((error) => {
  console.error(error);
  setStatus(error.message || "初期化に失敗しました。", "error");
});

function wireEvents() {
  if (elements.applyApiButton) {
    elements.applyApiButton.addEventListener("click", applyApiBaseFromInput);
  }
  if (elements.clearApiButton) {
    elements.clearApiButton.addEventListener("click", clearCustomApiBase);
  }
  if (elements.apiBaseInput) {
    elements.apiBaseInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyApiBaseFromInput();
      }
    });
  }
  if (elements.reconnectButton) {
    elements.reconnectButton.addEventListener("click", () => void detectApiBase({ quiet: false, force: true }));
  }
  document
    .getElementById("origin-search-button")
    .addEventListener("click", () => void searchPlaces("origin"));
  document
    .getElementById("destination-search-button")
    .addEventListener("click", () => void searchPlaces("destination"));
  document
    .getElementById("origin-current-button")
    .addEventListener("click", () => void useCurrentLocation());
  document.getElementById("parse-button").addEventListener("click", () => void previewPreferences());
  document.getElementById("route-button").addEventListener("click", () => void requestRoute());
  document.getElementById("swap-button").addEventListener("click", swapPlaces);
  document.getElementById("clear-route-button").addEventListener("click", () => clearRoute());
  document.getElementById("download-route-button").addEventListener("click", downloadRoute);

  elements.startNavButton.addEventListener("click", toggleNavigation);
  elements.prevStepButton.addEventListener("click", previousStep);
  elements.nextStepButton.addEventListener("click", nextStep);

  elements.pickOriginButton.addEventListener("click", () => setMapPickMode("origin"));
  elements.pickDestinationButton.addEventListener("click", () => setMapPickMode("destination"));
  elements.stopPickingButton.addEventListener("click", () => setMapPickMode(null));

  elements.originInput.addEventListener("focus", () => setActiveTarget("origin"));
  elements.destinationInput.addEventListener("focus", () => setActiveTarget("destination"));

  elements.originInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void searchPlaces("origin");
    }
  });
  elements.destinationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void searchPlaces("destination");
    }
  });

  elements.profileSelect.addEventListener("change", () => {
    schedulePreferencePreview();
    saveState();
  });
  elements.preferencesInput.addEventListener("input", () => {
    schedulePreferencePreview();
    saveState();
  });

  map.on("click", handleMapClick);
}

async function initialize() {
  restoreState();
  if (queryApiBase) {
    try {
      applyCustomApiBase(queryApiBase, { persist: true, reconnect: false, quiet: true });
    } catch (error) {
      console.warn(error);
      syncApiBaseInput();
    }
  } else {
    syncApiBaseInput();
  }

  setStatus("API接続先を確認しています。", "info");
  await detectApiBase({ quiet: false, force: true });
  startConnectionMonitor();
  await loadAppInfo();
  if (!state.origin) {
    choosePlace("origin", defaultOrigin, { clearRoute: false, persist: false });
  }
  if (!state.destination) {
    choosePlace("destination", defaultDestination, { clearRoute: false, persist: false });
  }

  if (!elements.preferencesInput.value.trim()) {
    elements.preferencesInput.value = "坂を避ける。信号が少ないルート";
  }

  await previewPreferences({ quiet: true });

  if (state.route && state.route.path && state.route.path.length) {
    applyRoute(state.route, { persist: false, statusText: "前回のルートを復元しました。" });
  } else {
    resetRouteOutput();
    fitToVisibleLayers();
    setStatus("地点を選んでルート作成できます。", "success");
  }

  renderMapPickState();
  updateBusyState();
  renderConnectionState();
  saveState();
}

async function loadAppInfo() {
  try {
    state.appInfo = await requestApiJson("/api/app-info", {}, { quiet: true });
  } catch (error) {
    console.warn(error);
    state.appInfo = fallbackAppInfo;
    if (!state.apiAvailable) {
      setStatus("ローカルサーバー待機中です。起動後に自動再接続します。", "warning");
    }
  }

  renderAppInfo();
}

function renderAppInfo() {
  elements.engineWarning.textContent =
    `ルートエンジン: ${state.appInfo.engine} / バージョン ${state.appInfo.version}`;

  renderChipButtons(
    elements.samplePlaceChips,
    state.appInfo.sample_place_queries,
    (query) => {
      const target = state.activeTarget;
      inputForTarget(target).value = query;
      void searchPlaces(target, { query, autoSelectFirst: true });
    },
  );

  renderChipButtons(elements.samplePreferenceChips, state.appInfo.sample_preferences, applyPreferenceTemplate);
  renderStaticChips(elements.featureChips, state.appInfo.supported_features, "muted-chip");
}

function renderChipButtons(container, values, onClick) {
  container.innerHTML = "";
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip button-chip";
    button.textContent = value;
    button.addEventListener("click", () => onClick(value));
    container.append(button);
  });
}

function renderStaticChips(container, values, className = "") {
  container.innerHTML = "";
  values.forEach((value) => {
    const span = document.createElement("span");
    span.className = `chip ${className}`.trim();
    span.textContent = value;
    container.append(span);
  });
}

function applyPreferenceTemplate(value) {
  const current = elements.preferencesInput.value.trim();
  if (!current) {
    elements.preferencesInput.value = value;
  } else if (!current.includes(value)) {
    elements.preferencesInput.value = `${current} / ${value}`;
  }
  schedulePreferencePreview(true);
  saveState();
  setStatus(`要望に「${value}」を追加しました。`, "success");
}

function setActiveTarget(target) {
  state.activeTarget = target;
  elements.activeTargetLabel.textContent = `入力先: ${target === "origin" ? "出発地" : "目的地"}`;
}

function inputForTarget(target) {
  return target === "origin" ? elements.originInput : elements.destinationInput;
}

function resultsForTarget(target) {
  return target === "origin" ? elements.originResults : elements.destinationResults;
}

function selectedForTarget(target) {
  return target === "origin" ? elements.originSelected : elements.destinationSelected;
}

async function searchPlaces(target, { query = null, autoSelectFirst = false } = {}) {
  setActiveTarget(target);
  const input = inputForTarget(target);
  const searchText = (query !== null && query !== undefined ? query : input.value).trim();

  if (!searchText) {
    setStatus("検索語を入力してください。", "warning");
    return;
  }

  input.value = searchText;
  setStatus(`${target === "origin" ? "出発地" : "目的地"}を検索しています。`, "info");

  try {
    const params = new URLSearchParams({ q: searchText, limit: "6" });
    if (state.currentLocation) {
      params.set("near_lat", String(state.currentLocation.lat));
      params.set("near_lon", String(state.currentLocation.lon));
    }

    const data = await withBusy(() => requestApiJson(`/api/places/search?${params.toString()}`));
    const items = data.items || [];

    if (!items.length) {
      renderResults(target, []);
      setStatus("候補が見つかりませんでした。", "warning");
      return;
    }

    renderResults(target, items);

    if (autoSelectFirst) {
      choosePlace(target, items[0]);
      clearResults(target);
      setStatus(`${target === "origin" ? "出発地" : "目的地"}を自動選択しました。`, "success");
      return;
    }

    setStatus(`${items.length} 件の候補を表示しました。`, "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "検索に失敗しました。", "error");
  }
}

function renderResults(target, items) {
  const container = resultsForTarget(target);
  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "result-empty";
    empty.textContent = "候補が見つかりません。";
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-item";
    button.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.description || item.category)}</span>
      <small class="result-meta">${escapeHtml(buildPlaceMeta(item))}</small>
    `;
    button.addEventListener("click", () => {
      choosePlace(target, item);
      clearResults(target);
      setStatus(`${target === "origin" ? "出発地" : "目的地"}を設定しました。`, "success");
    });
    container.append(button);
  });
}

function buildPlaceMeta(place) {
  const parts = [];
  if (place.distance_from_near_km !== null && place.distance_from_near_km !== undefined) {
    parts.push(`現在地から ${place.distance_from_near_km} km`);
  }
  if (place.matched_keywords && place.matched_keywords.length) {
    parts.push(`一致: ${place.matched_keywords.join(" / ")}`);
  }
  return parts.join(" | ") || "候補地点";
}

function clearResults(target) {
  resultsForTarget(target).innerHTML = "";
}

function choosePlace(target, place, options = {}) {
  const settings = {
    clearRoute: true,
    persist: true,
    fitMap: true,
    ...options,
  };

  state[target] = normalizePlace(place);
  renderSelectedPlace(target, state[target]);
  updateMarker(target, state[target]);

  if (settings.clearRoute) {
    clearRoute({ keepStatus: true, persist: false });
  }

  if (settings.fitMap) {
    fitToVisibleLayers();
  }

  if (settings.persist) {
    saveState();
  }
}

function normalizePlace(place) {
  return {
    name: place.name,
    category: place.category || "custom",
    description: place.description || "",
    lat: Number(place.lat),
    lon: Number(place.lon),
    source: place.source || "manual",
    matched_keywords: Array.isArray(place.matched_keywords) ? place.matched_keywords : [],
    score: typeof place.score === "number" ? place.score : null,
    distance_from_near_km:
      typeof place.distance_from_near_km === "number" ? place.distance_from_near_km : null,
  };
}

function renderSelectedPlace(target, place) {
  const container = selectedForTarget(target);
  container.innerHTML = `
    <div class="selected-card">
      <strong>${escapeHtml(place.name)}</strong>
      <span>${escapeHtml(place.description || place.category)}</span>
      <small class="result-meta">緯度 ${place.lat.toFixed(5)} / 経度 ${place.lon.toFixed(5)}</small>
    </div>
  `;
}

function updateMarker(target, place) {
  if (markers[target]) {
    markers[target].remove();
  }

  markers[target] = L.marker([place.lat, place.lon])
    .addTo(map)
    .bindPopup(`${escapeHtml(place.name)}`);
}

function fitToVisibleLayers() {
  if (routeLayer) {
    map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
    return;
  }

  const points = [];
  if (markers.origin) {
    points.push(markers.origin.getLatLng());
  }
  if (markers.destination) {
    points.push(markers.destination.getLatLng());
  }

  if (points.length === 2) {
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  } else if (points.length === 1) {
    map.setView(points[0], 14);
  } else {
    map.setView(defaultCenter, 13);
  }
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    setStatus("このブラウザでは現在地取得に対応していません。", "warning");
    return;
  }

  setStatus("現在地を取得しています。", "info");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const place = {
        name: "現在地",
        category: "current",
        description: "ブラウザの位置情報から取得",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        source: "geolocation",
      };
      state.currentLocation = { lat: place.lat, lon: place.lon };
      elements.originInput.value = "現在地";
      choosePlace("origin", place);
      fitToVisibleLayers();
      saveState();
      setStatus("現在地を出発地に設定しました。", "success");
    },
    () => {
      setStatus("現在地を取得できませんでした。", "error");
    },
    { enableHighAccuracy: true, timeout: 8000 },
  );
}

function schedulePreferencePreview(immediate = false) {
  if (previewTimer) {
    clearTimeout(previewTimer);
  }

  if (immediate) {
    void previewPreferences({ quiet: true });
    return;
  }

  previewTimer = setTimeout(() => {
    void previewPreferences({ quiet: true });
  }, 250);
}

async function previewPreferences({ quiet = false } = {}) {
  try {
    const data = await withBusy(() =>
      requestApiJson("/api/preferences/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: elements.preferencesInput.value.trim(),
          profile: elements.profileSelect.value,
        }),
      }),
    );

    state.parsedPreferences = data;
    renderPreferenceTags(data);
    saveState();

    if (!quiet) {
      setStatus("要望を解析しました。", "success");
    }
  } catch (error) {
    console.error(error);
    renderPreferenceTags({
      profile: elements.profileSelect.value,
      detected: [],
      summary: "ローカルサーバー待機中",
    });
    if (!quiet) {
      setStatus(error.message || "要望解析に失敗しました。", "warning");
    }
  }
}

function renderPreferenceTags(parsed) {
  elements.preferenceTags.innerHTML = "";

  const tags = [`モード: ${profileLabel(parsed.profile)}`];
  if (parsed.detected && parsed.detected.length) {
    tags.push(...parsed.detected.map((tag) => tag.label));
  } else if (parsed.summary) {
    tags.push(parsed.summary);
  }

  renderStaticChips(elements.preferenceTags, tags);
}

async function requestRoute() {
  if (!state.origin || !state.destination) {
    setStatus("出発地と目的地を設定してください。", "warning");
    return;
  }

  setStatus("ルートを作成しています。", "info");

  try {
    const route = await withBusy(() =>
      requestApiJson("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: state.origin,
          destination: state.destination,
          profile: elements.profileSelect.value,
          preferences_text: elements.preferencesInput.value.trim(),
        }),
      }),
    );

    applyRoute(route);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "ルート作成に失敗しました。", "error");
  }
}

function applyRoute(route, options = {}) {
  const settings = {
    persist: true,
    statusText: "ルートを更新しました。",
    ...options,
  };

  state.route = route;
  state.navigationStarted = false;
  state.navigationIndex = 0;

  elements.engineWarning.textContent =
    `ルートエンジン: ${route.engine} / ${route.warning || "ローカルPCで計算"}`;

  renderPreferenceTags(route.parsed_preferences);
  renderStaticChips(elements.routeHighlights, route.highlights || ["標準ルート"]);
  renderSummary(route.summary);
  renderSteps(route.steps || []);
  renderNavigation();

  if (routeLayer) {
    routeLayer.remove();
  }

  const latLngs = route.path.map((point) => [point.lat, point.lon]);
  routeLayer = L.polyline(latLngs, {
    color: "#3b82f6",
    weight: 6,
    opacity: 0.9,
  }).addTo(map);

  fitToVisibleLayers();

  if (settings.persist) {
    saveState();
  }

  setStatus(settings.statusText, "success");
}

function renderSummary(summary) {
  elements.routeSummaryLabel.textContent = `${summary.distance_km} km / ${summary.duration_min} 分`;
  elements.distanceValue.textContent = `${summary.distance_km} km`;
  elements.durationValue.textContent = `${summary.duration_min} 分`;
  elements.elevationValue.textContent = `${summary.elevation_gain_m} m`;
  elements.trafficValue.textContent = `${summary.traffic_lights_estimate} 回`;
  elements.maxGradientValue.textContent = `${summary.max_gradient_percent} %`;
  elements.avgGradientValue.textContent = `${summary.average_gradient_percent} %`;
  elements.arrivalValue.textContent = summary.estimated_arrival;
}

function resetRouteOutput() {
  if (routeLayer) {
    routeLayer.remove();
    routeLayer = null;
  }

  state.route = null;
  state.navigationStarted = false;
  state.navigationIndex = 0;
  elements.engineWarning.textContent =
    `ルートエンジン: ${state.appInfo.engine} / バージョン ${state.appInfo.version}`;

  elements.routeSummaryLabel.textContent = "未生成";
  elements.distanceValue.textContent = "-";
  elements.durationValue.textContent = "-";
  elements.elevationValue.textContent = "-";
  elements.trafficValue.textContent = "-";
  elements.maxGradientValue.textContent = "-";
  elements.avgGradientValue.textContent = "-";
  elements.arrivalValue.textContent = "-";
  elements.routeHighlights.innerHTML = "";
  elements.stepsList.innerHTML = "";
  renderNavigation();
}

function clearRoute(options = {}) {
  const settings = {
    keepStatus: false,
    persist: true,
    ...options,
  };

  resetRouteOutput();

  if (settings.persist) {
    saveState();
  }

  if (!settings.keepStatus) {
    setStatus("ルートを消去しました。", "info");
  }
}

function renderSteps(steps) {
  elements.stepsList.innerHTML = "";

  steps.forEach((step, index) => {
    const item = document.createElement("li");
    item.className = state.navigationStarted && index === state.navigationIndex ? "active" : "";
    item.innerHTML = `
      <strong>${escapeHtml(step.instruction)}</strong>
      <span>${step.distance_km} km</span>
    `;
    item.addEventListener("click", () => {
      state.navigationIndex = index;
      state.navigationStarted = true;
      renderNavigation();
      saveState();
    });
    elements.stepsList.append(item);
  });
}

function toggleNavigation() {
  if (!state.route || !state.route.steps || !state.route.steps.length) {
    setStatus("先にルートを作成してください。", "warning");
    return;
  }

  state.navigationStarted = !state.navigationStarted;
  if (state.navigationStarted && state.navigationIndex >= state.route.steps.length) {
    state.navigationIndex = 0;
  }

  renderNavigation();
  saveState();
  setStatus(state.navigationStarted ? "案内を開始しました。" : "案内を停止しました。", "success");
}

function previousStep() {
  if (!state.route || !state.route.steps || !state.route.steps.length) {
    return;
  }

  state.navigationStarted = true;
  state.navigationIndex = Math.max(0, state.navigationIndex - 1);
  renderNavigation();
  saveState();
}

function nextStep() {
  if (!state.route || !state.route.steps || !state.route.steps.length) {
    return;
  }

  state.navigationStarted = true;
  state.navigationIndex = Math.min(state.route.steps.length - 1, state.navigationIndex + 1);
  renderNavigation();
  saveState();
}

function renderNavigation() {
  const steps = (state.route && state.route.steps) || [];
  const hasRoute = steps.length > 0;

  elements.startNavButton.disabled = !hasRoute;
  elements.startNavButton.textContent = state.navigationStarted ? "案内停止" : "案内開始";

  if (!hasRoute) {
    elements.prevStepButton.disabled = true;
    elements.nextStepButton.disabled = true;
    elements.navigationProgress.textContent = "0 / 0";
    elements.navCurrent.textContent = "ルート作成後に案内を開始できます。";
    return;
  }

  const currentIndex = state.navigationStarted ? state.navigationIndex : 0;
  const currentStep = steps[currentIndex];
  const remainingDistance = steps
    .slice(currentIndex)
    .reduce((sum, step) => sum + Number(step.distance_km || 0), 0)
    .toFixed(2);

  elements.prevStepButton.disabled = currentIndex <= 0;
  elements.nextStepButton.disabled = currentIndex >= steps.length - 1;
  elements.navigationProgress.textContent = `${currentIndex + 1} / ${steps.length}`;
  elements.navCurrent.innerHTML = `
    <strong>${state.navigationStarted ? "現在の案内" : "先頭ステップ"}</strong>
    <span>${escapeHtml(currentStep.instruction)}</span>
    <small>残り距離の目安: ${remainingDistance} km</small>
  `;

  Array.from(elements.stepsList.children).forEach((item, index) => {
    item.classList.toggle("active", state.navigationStarted && index === currentIndex);
  });
}

function setMapPickMode(mode) {
  state.mapPickMode = mode;
  renderMapPickState();
  saveState();
}

function renderMapPickState() {
  const isOrigin = state.mapPickMode === "origin";
  const isDestination = state.mapPickMode === "destination";

  elements.pickOriginButton.classList.toggle("active-toggle", isOrigin);
  elements.pickDestinationButton.classList.toggle("active-toggle", isDestination);

  if (isOrigin) {
    elements.mapPickStatus.textContent = "地図をクリックすると出発地を設定します。";
  } else if (isDestination) {
    elements.mapPickStatus.textContent = "地図をクリックすると目的地を設定します。";
  } else {
    elements.mapPickStatus.textContent = "地図クリック選択はオフです。";
  }
}

function handleMapClick(event) {
  if (!state.mapPickMode) {
    return;
  }

  const target = state.mapPickMode;
  const place = {
    name: target === "origin" ? "地図選択の出発地" : "地図選択の目的地",
    category: "custom",
    description: "地図クリックで指定した地点",
    lat: Number(event.latlng.lat.toFixed(6)),
    lon: Number(event.latlng.lng.toFixed(6)),
    source: "map-click",
  };

  choosePlace(target, place);
  inputForTarget(target).value = place.name;
  setMapPickMode(null);
  setStatus(`${target === "origin" ? "出発地" : "目的地"}を地図から設定しました。`, "success");
}

function swapPlaces() {
  if (!state.origin || !state.destination) {
    setStatus("入れ替えるには出発地と目的地の両方が必要です。", "warning");
    return;
  }

  const previousOrigin = state.origin;
  state.origin = state.destination;
  state.destination = previousOrigin;

  elements.originInput.value = state.origin.name;
  elements.destinationInput.value = state.destination.name;

  renderSelectedPlace("origin", state.origin);
  renderSelectedPlace("destination", state.destination);
  updateMarker("origin", state.origin);
  updateMarker("destination", state.destination);
  clearRoute({ keepStatus: true, persist: false });
  fitToVisibleLayers();
  saveState();
  setStatus("出発地と目的地を入れ替えました。", "success");
}

function downloadRoute() {
  if (!state.route) {
    setStatus("保存するルートがありません。", "warning");
    return;
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: state.appInfo.version,
    origin: state.origin,
    destination: state.destination,
    profile: elements.profileSelect.value,
    preferencesText: elements.preferencesInput.value.trim(),
    route: state.route,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  anchor.href = url;
  anchor.download = `route-${timestamp}.json`;
  anchor.click();

  URL.revokeObjectURL(url);
  setStatus("ルートJSONを保存しました。", "success");
}

function saveState() {
  const payload = {
    origin: state.origin,
    destination: state.destination,
    route: state.route,
    currentLocation: state.currentLocation,
    profile: elements.profileSelect.value,
    preferences: elements.preferencesInput.value,
    activeTarget: state.activeTarget,
    customApiBase: state.customApiBase,
  };

  localStorage.setItem(storageKey, JSON.stringify(payload));
}

function restoreState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    elements.originInput.value = defaultOrigin.name;
    elements.destinationInput.value = defaultDestination.name;
    elements.profileSelect.value = "walk";
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    state.currentLocation = parsed.currentLocation || null;
    state.route = parsed.route || null;
    state.customApiBase = normalizeApiBase(parsed.customApiBase || "");
    setActiveTarget(parsed.activeTarget === "destination" ? "destination" : "origin");

    elements.profileSelect.value = parsed.profile || "walk";
    elements.preferencesInput.value = parsed.preferences || "";

    if (parsed.origin) {
      elements.originInput.value = parsed.origin.name;
      choosePlace("origin", parsed.origin, { clearRoute: false, persist: false, fitMap: false });
    } else {
      elements.originInput.value = defaultOrigin.name;
    }

    if (parsed.destination) {
      elements.destinationInput.value = parsed.destination.name;
      choosePlace("destination", parsed.destination, { clearRoute: false, persist: false, fitMap: false });
    } else {
      elements.destinationInput.value = defaultDestination.name;
    }
  } catch (error) {
    console.warn(error);
    localStorage.removeItem(storageKey);
    elements.originInput.value = defaultOrigin.name;
    elements.destinationInput.value = defaultDestination.name;
    elements.profileSelect.value = "walk";
  }
}

function normalizeApiBase(value) {
  const raw = (value || "").trim();
  if (!raw) {
    return "";
  }

  let normalized = raw;
  if (normalized === "same-origin") {
    if (location.protocol === "http:" || location.protocol === "https:") {
      return location.origin;
    }
    return "";
  }

  if (normalized.startsWith("//")) {
    normalized = `${location.protocol}${normalized}`;
  }

  try {
    const url = new URL(normalized);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    return "";
  }
}

function isPrivateNetworkHost(hostname) {
  if (!hostname) {
    return false;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
    return true;
  }

  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  const private172 = hostname.match(/^172\.(\d{1,2})\.\d{1,3}\.\d{1,3}$/);
  if (private172) {
    const secondOctet = Number(private172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function canUseApiBaseFromCurrentPage(base) {
  if (!base) {
    return false;
  }

  try {
    const url = new URL(base);
    if (location.protocol === "https:" && url.protocol !== "https:") {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

function syncApiBaseInput() {
  if (!elements.apiBaseInput) {
    return;
  }

  elements.apiBaseInput.value = state.customApiBase || "";
}

function applyCustomApiBase(value, { persist = true, reconnect = true, quiet = false } = {}) {
  const normalized = normalizeApiBase(value);
  if (value && !normalized) {
    throw new Error("API URL の形式が正しくありません");
  }
  if (normalized && !canUseApiBaseFromCurrentPage(normalized)) {
    throw new Error("HTTPS ページでは HTTPS の API URL を指定してください");
  }

  state.customApiBase = normalized;
  syncApiBaseInput();

  if (persist) {
    saveState();
  }

  if (reconnect) {
    void detectApiBase({ quiet, force: true });
  }
}

function applyApiBaseFromInput() {
  try {
    applyCustomApiBase(elements.apiBaseInput.value, { persist: true, reconnect: true, quiet: false });
    if (state.customApiBase) {
      setStatus(`API 接続先を設定しました: ${state.customApiBase}`, "info");
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || "API 接続先の設定に失敗しました", "error");
  }
}

function clearCustomApiBase() {
  state.customApiBase = "";
  syncApiBaseInput();
  saveState();
  setStatus("API 接続先を自動判定に戻しました", "info");
  void detectApiBase({ quiet: false, force: true });
}

async function withBusy(task) {
  state.busyCount += 1;
  updateBusyState();
  try {
    return await task();
  } finally {
    state.busyCount = Math.max(0, state.busyCount - 1);
    updateBusyState();
  }
}

function buildApiCandidates() {
  const candidates = [];
  const pushCandidate = (candidate) => {
    if (!candidate || candidates.includes(candidate)) {
      return;
    }
    candidates.push(candidate);
  };

  if (state.customApiBase) {
    pushCandidate(state.customApiBase);
  }

  if (state.apiBase && canUseApiBaseFromCurrentPage(state.apiBase)) {
    pushCandidate(state.apiBase);
  }

  const isHttpPage = location.protocol === "http:" || location.protocol === "https:";
  const isPrivatePage = isPrivateNetworkHost(location.hostname);

  if (isHttpPage && (location.port === "8000" || isPrivatePage)) {
    pushCandidate(location.origin);
  }

  if (location.protocol !== "https:" && isPrivatePage && location.hostname) {
    pushCandidate(`http://${location.hostname}:8000`);
  }

  if (location.protocol !== "https:") {
    pushCandidate("http://127.0.0.1:8000");
    pushCandidate("http://localhost:8000");
  }

  return candidates;
}

function buildApiUrl(path, base = state.apiBase) {
  return `${base}${path}`;
}

function renderConnectionState() {
  if (!elements.connectionPill) {
    return;
  }

  elements.connectionPill.className = `connection-pill ${state.apiAvailable ? "online" : "offline"}`;
  if (state.apiAvailable) {
    elements.connectionPill.textContent = `接続中 ${state.apiBase.replace(/^https?:\/\//, "")}`;
    return;
  }

  elements.connectionPill.textContent = state.customApiBase ? "接続待ち" : "未接続";
  return;

  elements.connectionPill.className = `connection-pill ${state.apiAvailable ? "online" : "offline"}`;
  elements.connectionPill.textContent = state.apiAvailable
    ? `接続中 ${state.apiBase.replace("http://", "")}`
    : "サーバー待機中";
}

function setConnectionState(isAvailable, base = state.apiBase, { quiet = false } = {}) {
  const wasAvailable = state.apiAvailable;
  const changed = state.apiAvailable !== isAvailable || state.apiBase !== base;
  state.apiAvailable = isAvailable;
  state.apiBase = base;
  renderConnectionState();

  if (!wasAvailable && isAvailable) {
    void loadAppInfo();
    if (elements.preferencesInput.value.trim()) {
      void previewPreferences({ quiet: true });
    }
  }

  if (!changed || quiet) {
    return;
  }

  if (isAvailable) {
    setStatus(`ローカルサーバーへ接続しました: ${base}`, "success");
  } else {
    setStatus("ローカルサーバー待機中です。起動後に自動再接続します。", "warning");
  }
}

async function probeApiBase(base) {
  try {
    const response = await fetch(buildApiUrl(`/api/health?ts=${Date.now()}`, base), {
      cache: "no-store",
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function detectApiBase({ quiet = true, force = false } = {}) {
  if (!force && state.apiAvailable) {
    const stillAlive = await probeApiBase(state.apiBase);
    if (stillAlive) {
      setConnectionState(true, state.apiBase, { quiet: true });
      return true;
    }
  }

  for (const candidate of buildApiCandidates()) {
    const available = await probeApiBase(candidate);
    if (available) {
      setConnectionState(true, candidate, { quiet });
      return true;
    }
  }

  setConnectionState(false, fallbackApiOrigin, { quiet });
  return false;
}

function startConnectionMonitor() {
  if (apiHeartbeatTimer) {
    clearInterval(apiHeartbeatTimer);
  }

  apiHeartbeatTimer = setInterval(() => {
    void detectApiBase({ quiet: true, force: false });
  }, 4000);

  window.addEventListener("online", () => {
    void detectApiBase({ quiet: false, force: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void detectApiBase({ quiet: true, force: false });
    }
  });
}

async function requestApiJson(path, options = {}, { quiet = false } = {}) {
  let lastError = null;

  for (const candidate of buildApiCandidates()) {
    try {
      const payload = await fetchJson(buildApiUrl(path, candidate), options);
      setConnectionState(true, candidate, { quiet });
      return payload;
    } catch (error) {
      lastError = error;
      if (error && typeof error.status === "number" && error.status >= 400 && error.status < 500 && error.status !== 404) {
        setConnectionState(true, candidate, { quiet: true });
        throw error;
      }
    }
  }

  setConnectionState(false, fallbackApiOrigin, { quiet });
  throw lastError || new Error("ローカルサーバーに接続できません。");
}

function updateBusyState() {
  const busy = state.busyCount > 0;
  busyButtons.forEach((button) => {
    button.disabled = busy;
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const detail = (payload && payload.detail) || `HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function setStatus(message, kind = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${kind}`;
}

function profileLabel(profile) {
  if (profile === "bicycle") {
    return "自転車";
  }
  if (profile === "car") {
    return "車";
  }
  return "徒歩";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
