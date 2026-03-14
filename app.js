const storageKey = "ai-map-demo-state-v4";
const defaultCenter = [35.681236, 139.767125];
const fallbackApiOrigin = "http://127.0.0.1:8000";
const queryApiBase = new URLSearchParams(location.search).get("api");
const assistantPromptSamples = [
  "現在地から渋谷駅まで徒歩で案内して",
  "東京駅から新宿駅まで自転車で最短",
  "大阪城まで車で有料道路を避けたい",
];

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
  version: "0.5.0",
  engine: "osrm-fallback",
  engine_mode: "local-pc",
  public_api_base_url: null,
  supported_profiles: ["walk", "bicycle", "car"],
  sample_place_queries: ["東京駅", "皇居", "新宿駅", "大阪城", "近くのコンビニ", "渋谷スクランブル交差点"],
  sample_preferences: ["最短", "坂を避ける", "信号が少ない", "景色がいい", "ランニング向け"],
  supported_features: [
    "地点候補検索",
    "OSMジオコーダ検索",
    "要望解析",
    "デモルート生成",
    "地図クリック選択",
    "JSONエクスポート",
    "ブラウザ保存",
    "LAN共有",
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
  networkInfo: null,
  parsedPreferences: null,
  assistantMessages: [],
  assistantModel: "Ollama",
  navigationStarted: false,
  navigationIndex: 0,
  mapPickMode: null,
  activePanel: "search",
  sheetCollapsed: window.matchMedia("(max-width: 720px)").matches,
  busyCount: 0,
};

const elements = {
  connectionPill: document.getElementById("connection-pill"),
  apiBaseInput: document.getElementById("api-base-input"),
  applyApiButton: document.getElementById("apply-api-button"),
  clearApiButton: document.getElementById("clear-api-button"),
  reconnectButton: document.getElementById("reconnect-button"),
  sheet: document.getElementById("control-sheet"),
  sheetToggleButton: document.getElementById("sheet-toggle-button"),
  panelTabs: Array.from(document.querySelectorAll("[data-panel-tab]")),
  panelSections: Array.from(document.querySelectorAll("[data-panel-section]")),
  originInput: document.getElementById("origin-input"),
  destinationInput: document.getElementById("destination-input"),
  profileSelect: document.getElementById("profile-select"),
  preferencesInput: document.getElementById("preferences-input"),
  engineWarning: document.getElementById("engine-warning"),
  statusMessage: document.getElementById("status-message"),
  mapPickStatus: document.getElementById("map-pick-status"),
  activeTargetLabel: document.getElementById("active-target-label"),
  networkSummary: document.getElementById("network-summary"),
  networkLinks: document.getElementById("network-links"),
  accessHelper: document.getElementById("access-helper"),
  assistantModelLabel: document.getElementById("assistant-model-label"),
  assistantMessages: document.getElementById("assistant-messages"),
  assistantInput: document.getElementById("assistant-input"),
  assistantSendButton: document.getElementById("assistant-send-button"),
  assistantSampleChips: document.getElementById("assistant-sample-chips"),
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
let currentLocationWatchId = null;
let orientationTrackingEnabled = false;
const markers = {
  origin: null,
  destination: null,
  currentLocation: null,
};

function isSmallViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function renderPanelState() {
  if (elements.sheet) {
    elements.sheet.dataset.sheetState = state.sheetCollapsed ? "collapsed" : "expanded";
  }
  if (elements.sheetToggleButton) {
    elements.sheetToggleButton.textContent = state.sheetCollapsed ? "展開" : "収納";
  }
  elements.panelTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelTab === state.activePanel);
  });
  elements.panelSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.panelSection === state.activePanel);
  });
}

function setSheetCollapsed(value, { persist = true } = {}) {
  state.sheetCollapsed = Boolean(value);
  renderPanelState();
  if (persist) {
    saveState();
  }
}

function switchPanel(panel, { expand = false, persist = true } = {}) {
  const nextPanel = ["search", "route", "ai", "access"].includes(panel) ? panel : "search";
  state.activePanel = nextPanel;
  if (expand) {
    state.sheetCollapsed = false;
  }
  renderPanelState();
  if (persist) {
    saveState();
  }
}

function focusPanel(panel) {
  switchPanel(panel, { expand: true, persist: true });
}

function formatBaseLabel(base) {
  return String(base || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function copyText(value) {
  if (!value || !navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function renderNetworkInfo() {
  if (elements.networkSummary) {
    if (state.apiAvailable) {
      const networkMode = state.appInfo.engine_mode === "shared" ? "共有モード" : "ローカルPCモード";
      const suffix = state.networkInfo && state.networkInfo.public_api_base_url ? " / 公開URLあり" : "";
      elements.networkSummary.textContent = `接続中: ${formatBaseLabel(state.apiBase)} / ${networkMode}${suffix}`;
    } else {
      elements.networkSummary.textContent = "未接続です。LAN URL か公開 API URL を接続先に指定してください。";
    }
  }

  if (elements.accessHelper) {
    const tips = (state.networkInfo && state.networkInfo.tips) || [];
    elements.accessHelper.textContent = tips.join(" ");
  }

  if (!elements.networkLinks) {
    return;
  }

  elements.networkLinks.innerHTML = "";

  const localUrls = (state.networkInfo && state.networkInfo.local_urls) || [];
  localUrls.forEach((url) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip button-chip";
    button.textContent = formatBaseLabel(url);
    button.title = url;
    button.addEventListener("click", async () => {
      const copied = await copyText(url);
      setStatus(copied ? `LAN URL をコピーしました: ${url}` : `LAN URL: ${url}`, copied ? "success" : "info");
    });
    elements.networkLinks.append(button);
  });

  if (state.networkInfo && state.networkInfo.public_api_base_url) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip button-chip";
    button.textContent = `公開API ${formatBaseLabel(state.networkInfo.public_api_base_url)}`;
    button.title = state.networkInfo.public_api_base_url;
    button.addEventListener("click", () => {
      elements.apiBaseInput.value = state.networkInfo.public_api_base_url;
      applyApiBaseFromInput();
    });
    elements.networkLinks.append(button);
  }
}

async function loadNetworkInfo() {
  if (!state.apiAvailable) {
    state.networkInfo = null;
    renderNetworkInfo();
    return;
  }

  try {
    state.networkInfo = await requestApiJson("/api/network-info", {}, { quiet: true });
  } catch (error) {
    console.warn(error);
    state.networkInfo = null;
  }

  renderNetworkInfo();
}

wireEvents();
initialize().catch((error) => {
  console.error(error);
  setStatus(error.message || "初期化に失敗しました。", "error");
});

function wireEvents() {
  if (elements.sheetToggleButton) {
    elements.sheetToggleButton.addEventListener("click", () => setSheetCollapsed(!state.sheetCollapsed));
  }
  elements.panelTabs.forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.panelTab, { expand: true }));
  });
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
  if (elements.assistantSendButton) {
    elements.assistantSendButton.addEventListener("click", () => void sendAssistantMessage());
  }
  if (elements.assistantInput) {
    elements.assistantInput.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void sendAssistantMessage();
      }
    });
  }

  elements.startNavButton.addEventListener("click", toggleNavigation);
  elements.prevStepButton.addEventListener("click", previousStep);
  elements.nextStepButton.addEventListener("click", nextStep);

  elements.pickOriginButton.addEventListener("click", () => setMapPickMode("origin"));
  elements.pickDestinationButton.addEventListener("click", () => setMapPickMode("destination"));
  elements.stopPickingButton.addEventListener("click", () => setMapPickMode(null));

  elements.originInput.addEventListener("focus", () => {
    setActiveTarget("origin");
    focusPanel("search");
  });
  elements.destinationInput.addEventListener("focus", () => {
    setActiveTarget("destination");
    focusPanel("search");
  });

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
  renderPanelState();
  await detectApiBase({ quiet: false, force: true });
  startConnectionMonitor();
  await loadAppInfo();
  await loadNetworkInfo();
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
  syncCurrentLocationMarker();

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
  renderNetworkInfo();
  renderAssistantPanel();
  saveState();
}

async function loadAppInfo() {
  try {
    state.appInfo = await requestApiJson("/api/app-info", {}, { quiet: true });
  } catch (error) {
    console.warn(error);
    state.appInfo = fallbackAppInfo;
    if (!state.apiAvailable) {
      setStatus("接続先がまだ見つかりません。接続タブで LAN URL または公開 URL を確認してください。", "warning");
    }
  }

  renderAppInfo();
}

function renderAppInfo() {
  elements.engineWarning.textContent =
    `ルートエンジン: ${state.appInfo.engine} / バージョン ${state.appInfo.version}`;

  if (state.appInfo.public_api_base_url && !(state.networkInfo && state.networkInfo.public_api_base_url)) {
    state.networkInfo = {
      ...(state.networkInfo || {}),
      local_ips: (state.networkInfo && state.networkInfo.local_ips) || [],
      local_urls: (state.networkInfo && state.networkInfo.local_urls) || [],
      public_api_base_url: state.appInfo.public_api_base_url,
      tips: (state.networkInfo && state.networkInfo.tips) || [],
    };
  }

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
  renderAssistantPanel();
  renderNetworkInfo();
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

function renderAssistantPanel() {
  if (!elements.assistantMessages) {
    return;
  }

  if (elements.assistantModelLabel) {
    elements.assistantModelLabel.textContent = state.assistantModel || "Ollama";
  }

  if (elements.assistantSampleChips) {
    renderChipButtons(elements.assistantSampleChips, assistantPromptSamples, (value) => {
      elements.assistantInput.value = value;
    });
  }

  const items = state.assistantMessages.length
    ? state.assistantMessages
    : [{ role: "assistant", text: "地図の相談をどうぞ。地点検索、条件整理、ルート作成をまとめて実行します。", actions: [] }];

  elements.assistantMessages.innerHTML = "";
  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = `assistant-message ${item.role || "assistant"}`;

    const role = document.createElement("span");
    role.className = "assistant-message-role";
    role.textContent = item.role === "user" ? "You" : "AI";
    wrapper.append(role);

    const text = document.createElement("p");
    text.textContent = item.text || "";
    wrapper.append(text);

    if (Array.isArray(item.actions) && item.actions.length) {
      const actions = document.createElement("div");
      actions.className = "assistant-actions";
      item.actions.forEach((action) => {
        const chip = document.createElement("span");
        chip.className = "assistant-action";
        chip.textContent = action;
        actions.append(chip);
      });
      wrapper.append(actions);
    }

    elements.assistantMessages.append(wrapper);
  });

  elements.assistantMessages.scrollTop = elements.assistantMessages.scrollHeight;
}

function pushAssistantMessage(role, text, actions = []) {
  state.assistantMessages.push({
    role,
    text,
    actions,
    createdAt: new Date().toISOString(),
  });
  state.assistantMessages = state.assistantMessages.slice(-12);
  renderAssistantPanel();
  saveState();
}

function buildAssistantContext() {
  return {
    origin: state.origin,
    destination: state.destination,
    current_location: state.currentLocation
      ? {
          lat: state.currentLocation.lat,
          lon: state.currentLocation.lon,
        }
      : null,
    profile: elements.profileSelect.value,
    preferences_text: elements.preferencesInput.value.trim(),
    route_ready: Boolean(state.route),
  };
}

async function applyAssistantResponse(response) {
  state.assistantModel = response.model || (response.available === false ? "Ollama fallback" : "Ollama");

  if (response.origin) {
    elements.originInput.value = response.origin.name;
    choosePlace("origin", response.origin, { clearRoute: false, persist: false, fitMap: false });
  }

  if (response.destination) {
    elements.destinationInput.value = response.destination.name;
    choosePlace("destination", response.destination, { clearRoute: false, persist: false, fitMap: false });
  }

  if (response.profile) {
    elements.profileSelect.value = response.profile;
  }

  if (typeof response.preferences_text === "string") {
    elements.preferencesInput.value = response.preferences_text;
  }

  await previewPreferences({ quiet: true });

  if (response.clear_route && !response.route) {
    clearRoute({ keepStatus: true, persist: false });
  }

  if (response.route) {
    applyRoute(response.route, {
      persist: false,
      statusText: "AIがルートを更新しました。",
    });
    switchPanel("route", { expand: true, persist: false });
  } else {
    saveState();
  }

  pushAssistantMessage("assistant", response.reply, response.actions || []);
  setStatus(
    response.reply,
    response.available === false ? "warning" : response.route ? "success" : "info",
  );
}

async function sendAssistantMessage(prefilledMessage = null) {
  const rawMessage =
    prefilledMessage !== null && prefilledMessage !== undefined
      ? prefilledMessage
      : elements.assistantInput.value || "";
  const message = rawMessage.trim();
  if (!message) {
    setStatus("AI に依頼する内容を入力してください。", "warning");
    return;
  }

  pushAssistantMessage("user", message);
  elements.assistantInput.value = "";
  focusPanel("ai");
  setStatus("AI が条件を整理しています。", "info");

  try {
    const response = await withBusy(() =>
      requestApiJson("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: buildAssistantContext(),
        }),
      }),
    );

    await applyAssistantResponse(response);
  } catch (error) {
    console.error(error);
    pushAssistantMessage("assistant", error.message || "AI アシスタントの実行に失敗しました。", []);
    setStatus(error.message || "AI アシスタントの実行に失敗しました。", "error");
  }
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
  switchPanel("search", { expand: true, persist: false });
  const input = inputForTarget(target);
  const searchText = (query !== null && query !== undefined ? query : input.value).trim();

  if (!searchText) {
    setStatus("検索語を入力してください。", "warning");
    return;
  }

  input.value = searchText;
  setStatus(`${target === "origin" ? "出発地" : "目的地"}を検索しています。`, "info");

  try {
    const params = new URLSearchParams({ q: searchText, limit: "8" });
    if (state.currentLocation) {
      params.set("near_lat", String(state.currentLocation.lat));
      params.set("near_lon", String(state.currentLocation.lon));
    }

    const data = await withBusy(() => requestApiJson(`/api/places/search?${params.toString()}`));
    const items = data.items || [];

    if (!items.length) {
      renderResults(target, []);
      switchPanel("search", { expand: true, persist: false });
      setStatus("候補が見つかりませんでした。", "warning");
      return;
    }

    renderResults(target, items);
    switchPanel("search", { expand: true, persist: false });

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
      switchPanel("route", { expand: true, persist: false });
      setStatus(`${target === "origin" ? "出発地" : "目的地"}を設定しました。`, "success");
    });
    container.append(button);
  });
}

function buildPlaceMeta(place) {
  const parts = [];
  if (place.source === "nominatim") {
    parts.push("OSM検索");
  }
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

function buildCurrentLocationPlace(locationState = state.currentLocation) {
  if (!locationState) {
    return null;
  }

  return {
    name: "現在地",
    category: "current_location",
    description: "ブラウザの位置情報から取得",
    lat: Number(locationState.lat),
    lon: Number(locationState.lon),
    source: "browser",
  };
}

function isCurrentLocationPlace(place) {
  if (!place) {
    return false;
  }

  return (
    place.category === "current" ||
    place.category === "current_location" ||
    place.source === "geolocation" ||
    place.source === "browser" ||
    place.name === "現在地"
  );
}

function normalizeHeading(value) {
  const heading = Number(value);
  if (!Number.isFinite(heading)) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function buildCurrentLocationIcon() {
  return L.divIcon({
    className: "current-location-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `
      <div class="current-location-marker">
        <span class="current-location-beacon"></span>
        <span class="current-location-heading">
          <span class="current-location-arrow"></span>
        </span>
        <span class="current-location-dot"></span>
      </div>
    `,
  });
}

function syncCurrentLocationMarker({ fitMap = false } = {}) {
  if (!state.currentLocation) {
    if (markers.currentLocation) {
      markers.currentLocation.remove();
      markers.currentLocation = null;
    }
    return;
  }

  const latLng = [state.currentLocation.lat, state.currentLocation.lon];

  if (!markers.currentLocation) {
    markers.currentLocation = L.marker(latLng, {
      icon: buildCurrentLocationIcon(),
      zIndexOffset: 1200,
    })
      .addTo(map)
      .bindPopup("現在地");
  } else {
    markers.currentLocation.setLatLng(latLng);
  }

  const heading = normalizeHeading(state.currentLocation.heading);
  const markerElement = markers.currentLocation.getElement();
  if (markerElement) {
    markerElement.style.setProperty("--heading-rotation", heading !== null ? `${heading}deg` : "0deg");
    markerElement.classList.toggle("has-heading", heading !== null);
  }

  if (markers.currentLocation.getPopup()) {
    const popupText = heading !== null ? `現在地 / 方角 ${Math.round(heading)}°` : "現在地";
    markers.currentLocation.getPopup().setContent(popupText);
  }

  if (fitMap) {
    fitToVisibleLayers();
  }
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
  if (markers.currentLocation) {
    points.push(markers.currentLocation.getLatLng());
  }

  if (points.length === 2) {
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  } else if (points.length >= 3) {
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  } else if (points.length === 1) {
    map.setView(points[0], 14);
  } else {
    map.setView(defaultCenter, 13);
  }
}

function extractHeadingFromOrientation(event) {
  if (typeof event.webkitCompassHeading === "number" && Number.isFinite(event.webkitCompassHeading)) {
    return normalizeHeading(event.webkitCompassHeading);
  }

  if (event.absolute && typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return normalizeHeading(360 - event.alpha);
  }

  return null;
}

function handleDeviceOrientation(event) {
  const heading = extractHeadingFromOrientation(event);
  if (heading === null || !state.currentLocation) {
    return;
  }

  if (state.currentLocation.heading !== null && state.currentLocation.heading !== undefined) {
    const delta = Math.abs(state.currentLocation.heading - heading);
    const wrappedDelta = Math.min(delta, 360 - delta);
    if (wrappedDelta < 2) {
      return;
    }
  }

  state.currentLocation = {
    ...state.currentLocation,
    heading,
  };
  syncCurrentLocationMarker();
}

async function enableDeviceOrientationTracking() {
  if (orientationTrackingEnabled || typeof DeviceOrientationEvent === "undefined") {
    return;
  }

  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        return;
      }
    } catch (error) {
      console.warn(error);
      return;
    }
  }

  const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
  window.addEventListener(eventName, handleDeviceOrientation, true);
  orientationTrackingEnabled = true;
}

function buildGeolocationErrorMessage(error) {
  if (error && error.code === error.PERMISSION_DENIED) {
    return "位置情報の利用が許可されていません。ブラウザ設定を確認してください。";
  }
  if (error && error.code === error.TIMEOUT) {
    return "現在地の取得がタイムアウトしました。";
  }
  return "現在地を取得できませんでした。";
}

function applyCurrentLocationPosition(position, { setAsOrigin = false, fitMap = false, statusText = "" } = {}) {
  const nextLocation = {
    lat: Number(position.coords.latitude.toFixed(6)),
    lon: Number(position.coords.longitude.toFixed(6)),
    heading: normalizeHeading(position.coords.heading),
  };

  state.currentLocation = nextLocation;
  syncCurrentLocationMarker({ fitMap });

  if (setAsOrigin) {
    const place = buildCurrentLocationPlace(nextLocation);
    elements.originInput.value = place.name;
    choosePlace("origin", place, { clearRoute: true, persist: false, fitMap: false });
  } else if (state.origin && isCurrentLocationPlace(state.origin) && !state.route) {
    const place = buildCurrentLocationPlace(nextLocation);
    state.origin = normalizePlace(place);
    renderSelectedPlace("origin", state.origin);
    updateMarker("origin", state.origin);
  }

  saveState();

  if (statusText) {
    setStatus(statusText, "success");
  }
}

function ensureCurrentLocationWatch() {
  if (!navigator.geolocation || currentLocationWatchId !== null) {
    return;
  }

  currentLocationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      applyCurrentLocationPosition(position, { setAsOrigin: false, fitMap: false });
    },
    (error) => {
      console.warn(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    },
  );
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    setStatus("このブラウザでは現在地取得に対応していません。", "warning");
    return;
  }

  setStatus("現在地を取得しています。", "info");
  await enableDeviceOrientationTracking();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      applyCurrentLocationPosition(position, {
        setAsOrigin: true,
        fitMap: true,
        statusText: "現在地を出発地に設定しました。",
      });
      ensureCurrentLocationWatch();
    },
    (error) => {
      setStatus(buildGeolocationErrorMessage(error), "error");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    },
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
      switchPanel("route", { expand: !isSmallViewport(), persist: false });
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
    switchPanel("search", { expand: true, persist: false });
    setStatus("出発地と目的地を設定してください。", "warning");
    return;
  }

  switchPanel("route", { expand: true, persist: false });
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
  switchPanel("route", { expand: true, persist: false });

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
    switchPanel("search", { expand: !isSmallViewport(), persist: false });
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
  switchPanel("search", { expand: true, persist: false });
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
  switchPanel("route", { expand: true, persist: false });
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
    networkInfo: state.networkInfo,
    profile: elements.profileSelect.value,
    preferences: elements.preferencesInput.value,
    activeTarget: state.activeTarget,
    customApiBase: state.customApiBase,
    assistantMessages: state.assistantMessages,
    assistantModel: state.assistantModel,
    activePanel: state.activePanel,
    sheetCollapsed: state.sheetCollapsed,
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
    state.networkInfo = parsed.networkInfo || null;
    state.customApiBase = normalizeApiBase(parsed.customApiBase || "");
    state.assistantMessages = Array.isArray(parsed.assistantMessages) ? parsed.assistantMessages.slice(-12) : [];
    state.assistantModel = parsed.assistantModel || "Ollama";
    state.activePanel = ["search", "route", "ai", "access"].includes(parsed.activePanel)
      ? parsed.activePanel
      : "search";
    state.sheetCollapsed =
      typeof parsed.sheetCollapsed === "boolean" ? parsed.sheetCollapsed : window.matchMedia("(max-width: 720px)").matches;
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

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function canUseApiBaseFromCurrentPage(base) {
  if (!base) {
    return false;
  }

  try {
    const url = new URL(base);
    if (location.protocol === "https:" && url.protocol !== "https:") {
      return isLoopbackHost(url.hostname);
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
    focusPanel("access");
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
  switchPanel("access", { expand: true, persist: false });
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

  const publicApiBase =
    (state.networkInfo && state.networkInfo.public_api_base_url) || state.appInfo.public_api_base_url;
  if (publicApiBase && canUseApiBaseFromCurrentPage(publicApiBase)) {
    pushCandidate(publicApiBase);
  }

  const isHttpPage = location.protocol === "http:" || location.protocol === "https:";
  const isPrivatePage = isPrivateNetworkHost(location.hostname);

  if (
    isHttpPage &&
    (
      location.port === "8000" ||
      isPrivatePage ||
      isLoopbackHost(location.hostname) ||
      (location.protocol === "https:" && !location.hostname.endsWith(".vercel.app"))
    )
  ) {
    pushCandidate(location.origin);
  }

  if (location.protocol !== "https:" && isPrivatePage && location.hostname) {
    pushCandidate(`http://${location.hostname}:8000`);
  }

  pushCandidate("http://127.0.0.1:8000");
  pushCandidate("http://localhost:8000");

  return candidates;
}

function buildApiUrl(path, base = state.apiBase) {
  return `${base}${path}`;
}

function legacyRenderConnectionState() {
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

function renderConnectionState() {
  if (!elements.connectionPill) {
    return;
  }

  elements.connectionPill.className = `connection-pill ${state.apiAvailable ? "online" : "offline"}`;
  if (state.apiAvailable) {
    elements.connectionPill.textContent = `接続中 ${state.apiBase.replace(/^https?:\/\//, "")}`;
  } else {
    elements.connectionPill.textContent = state.customApiBase ? "接続待ち" : "未接続";
  }
}

function setConnectionState(isAvailable, base = state.apiBase, { quiet = false } = {}) {
  const wasAvailable = state.apiAvailable;
  const changed = state.apiAvailable !== isAvailable || state.apiBase !== base;
  state.apiAvailable = isAvailable;
  state.apiBase = base;
  renderConnectionState();

  if (!wasAvailable && isAvailable) {
    void loadAppInfo();
    void loadNetworkInfo();
    if (elements.preferencesInput.value.trim()) {
      void previewPreferences({ quiet: true });
    }
  }

  if (!changed || quiet) {
    return;
  }

  if (isAvailable) {
    setStatus(`サーバーへ接続しました: ${base}`, "success");
  } else {
    renderNetworkInfo();
    setStatus("接続先が見つかりません。LAN URL か公開 API URL を確認してください。", "warning");
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
