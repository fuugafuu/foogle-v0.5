const storageKey = "ai-map-demo-state-v4";
const defaultCenter = [35.681236, 139.767125];
const fallbackApiOrigin = "http://127.0.0.1:8000";
const healthcheckIntervalMs = 6000;
const requestTimeoutMs = 8000;
const assistantRequestTimeoutMs = 45000;
const contributionUploadTimeoutMs = 120000;
const clientIdStorageKey = "foogle-client-id-v1";
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
  version: "0.6.0",
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
  routeWaypoints: [],
  currentLocation: null,
  networkInfo: null,
  parsedPreferences: null,
  assistantMessages: [],
  assistantModel: "Ollama",
  navigationStarted: false,
  navigationIndex: 0,
  followCurrentLocation: true,
  mapPickMode: null,
  activePanel: "search",
  topPanelCollapsed: window.matchMedia("(max-width: 720px)").matches,
  globalSearchCollapsed: false,
  sheetCollapsed: window.matchMedia("(max-width: 720px)").matches,
  busyCount: 0,
  clientId: "",
  favorites: [],
  selectedActionPlace: null,
  captureMode: "local",
  capturePerspective: "car_front",
  captureSession: null,
  pendingContributionZipFile: null,
  globalSearchResults: [],
};

const elements = {
  connectionPill: document.getElementById("connection-pill"),
  apiBaseInput: document.getElementById("api-base-input"),
  applyApiButton: document.getElementById("apply-api-button"),
  clearApiButton: document.getElementById("clear-api-button"),
  reconnectButton: document.getElementById("reconnect-button"),
  topPanel: document.getElementById("top-panel"),
  topPanelToggleButton: document.getElementById("top-panel-toggle-button"),
  settingsOpenButton: document.getElementById("settings-open-button"),
  globalSearchShell: document.getElementById("global-search-shell"),
  globalSearchToggleButton: document.getElementById("global-search-toggle-button"),
  globalSearchInput: document.getElementById("global-search-input"),
  globalSearchCurrentButton: document.getElementById("global-search-current-button"),
  globalSearchClearButton: document.getElementById("global-search-clear-button"),
  globalSearchResults: document.getElementById("global-search-results"),
  sheet: document.getElementById("control-sheet"),
  sheetToggleButton: document.getElementById("sheet-toggle-button"),
  panelTabs: Array.from(document.querySelectorAll("[data-panel-tab]")),
  panelSections: Array.from(document.querySelectorAll("[data-panel-section]")),
  originInput: document.getElementById("origin-input"),
  destinationInput: document.getElementById("destination-input"),
  mobileSearchInput: document.getElementById("mobile-search-input"),
  mobileSearchButton: document.getElementById("mobile-search-button"),
  mobileCurrentButton: document.getElementById("mobile-current-button"),
  mobileOriginTargetButton: document.getElementById("mobile-origin-target-button"),
  mobileDestinationTargetButton: document.getElementById("mobile-destination-target-button"),
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
  costValue: document.getElementById("cost-value"),
  ferryValue: document.getElementById("ferry-value"),
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
  favoriteCount: document.getElementById("favorite-count"),
  refreshFavoritesButton: document.getElementById("refresh-favorites-button"),
  followLocationButton: document.getElementById("follow-location-button"),
  followLocationButtonDuplicate: document.getElementById("follow-location-button-duplicate"),
  favoritesList: document.getElementById("favorites-list"),
  googleLoginButton: document.getElementById("google-login-button"),
  googleLoginStatus: document.getElementById("google-login-status"),
  contributionModeLocal: document.getElementById("contribution-mode-local"),
  contributionModeServer: document.getElementById("contribution-mode-server"),
  contributionPerspectiveDrive: document.getElementById("contribution-perspective-drive"),
  contributionPerspectiveWalk: document.getElementById("contribution-perspective-walk"),
  contributionNotes: document.getElementById("contribution-notes"),
  contributionPreviewShell: document.getElementById("contribution-preview-shell"),
  contributionPreview: document.getElementById("contribution-preview"),
  contributionOverlayStatus: document.getElementById("contribution-overlay-status"),
  contributionOverlayTags: document.getElementById("contribution-overlay-tags"),
  contributionStatus: document.getElementById("contribution-status"),
  contributionLog: document.getElementById("contribution-log"),
  contributionStartButton: document.getElementById("contribution-start-button"),
  contributionStopButton: document.getElementById("contribution-stop-button"),
  contributionZipInput: document.getElementById("contribution-zip-input"),
  contributionSelectZipButton: document.getElementById("contribution-select-zip-button"),
  contributionUploadZipButton: document.getElementById("contribution-upload-zip-button"),
  contributionZipStatus: document.getElementById("contribution-zip-status"),
  placeActionSheet: document.getElementById("place-action-sheet"),
  placeActionBackdrop: document.getElementById("place-action-backdrop"),
  placeActionName: document.getElementById("place-action-name"),
  placeActionMeta: document.getElementById("place-action-meta"),
  actionSetOriginButton: document.getElementById("action-set-origin-button"),
  actionSetDestinationButton: document.getElementById("action-set-destination-button"),
  actionFavoriteButton: document.getElementById("action-favorite-button"),
  actionRouteButton: document.getElementById("action-route-button"),
  actionNavigateButton: document.getElementById("action-navigate-button"),
  actionCloseButton: document.getElementById("action-close-button"),
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
let globalSearchTimer = null;
let contributionDetectionTimer = null;
let contributionPositionWatchId = null;
let contributionOrientationHandler = null;
const externalScriptPromises = new Map();
let detectorModelPromise = null;
const markers = {
  origin: null,
  destination: null,
  currentLocation: null,
};

function isSmallViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function renderPanelState() {
  if (elements.topPanel) {
    elements.topPanel.dataset.panelState = state.topPanelCollapsed ? "collapsed" : "expanded";
  }
  if (elements.topPanelToggleButton) {
    elements.topPanelToggleButton.textContent = state.topPanelCollapsed ? "Open" : "Close";
  }
  if (elements.sheet) {
    elements.sheet.dataset.sheetState = state.sheetCollapsed ? "collapsed" : "expanded";
  }
  if (elements.sheetToggleButton) {
    elements.sheetToggleButton.textContent = state.sheetCollapsed ? "Open" : "Sheet";
  }
  if (elements.mobileOriginTargetButton && elements.mobileDestinationTargetButton) {
    elements.mobileOriginTargetButton.classList.toggle("active-toggle", state.activeTarget === "origin");
    elements.mobileDestinationTargetButton.classList.toggle("active-toggle", state.activeTarget === "destination");
  }
  syncMobileSearchInput();
  elements.panelTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelTab === state.activePanel);
  });
  elements.panelSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.panelSection === state.activePanel);
  });
  renderSearchShellState();
}

function renderSearchShellState() {
  if (!elements.globalSearchShell) {
    return;
  }
  elements.globalSearchShell.dataset.searchState = state.globalSearchCollapsed ? "collapsed" : "expanded";
  if (elements.globalSearchToggleButton) {
    elements.globalSearchToggleButton.textContent = state.globalSearchCollapsed ? "開く" : "隠す";
  }
}

function setGlobalSearchCollapsed(value, { persist = true } = {}) {
  state.globalSearchCollapsed = Boolean(value);
  renderSearchShellState();
  if (persist) {
    saveState();
  }
}

function setTopPanelCollapsed(value, { persist = true } = {}) {
  state.topPanelCollapsed = Boolean(value);
  renderPanelState();
  if (persist) {
    saveState();
  }
}

function setSheetCollapsed(value, { persist = true } = {}) {
  state.sheetCollapsed = Boolean(value);
  renderPanelState();
  if (persist) {
    saveState();
  }
}

function switchPanel(panel, { expand = false, persist = true } = {}) {
  const nextPanel = ["search", "route", "ai", "access", "settings"].includes(panel) ? panel : "search";
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

function legacy_wireEvents_1() {
  if (elements.sheetToggleButton) {
    elements.sheetToggleButton.addEventListener("click", () => setSheetCollapsed(!state.sheetCollapsed));
  }
  if (elements.topPanelToggleButton) {
    elements.topPanelToggleButton.addEventListener("click", () => setTopPanelCollapsed(!state.topPanelCollapsed));
  }
  if (elements.settingsOpenButton) {
    elements.settingsOpenButton.addEventListener("click", () => switchPanel("settings", { expand: true }));
  }

  elements.panelTabs.forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.panelTab, { expand: true }));
  });

  if (elements.globalSearchInput) {
    elements.globalSearchInput.addEventListener("input", () => scheduleGlobalSearch(elements.globalSearchInput.value));
    elements.globalSearchInput.addEventListener("focus", () => setTopPanelCollapsed(false, { persist: false }));
    elements.globalSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void performGlobalSearch(elements.globalSearchInput.value);
      }
    });
  }
  if (elements.globalSearchCurrentButton) {
    elements.globalSearchCurrentButton.addEventListener("click", async () => {
      await useCurrentLocation();
      if (state.currentLocation) {
        const currentPlace = buildCurrentLocationPlace(state.currentLocation);
        if (elements.globalSearchInput) {
          elements.globalSearchInput.value = currentPlace.name;
        }
        state.globalSearchResults = [currentPlace];
        renderGlobalSearchResults();
        openPlaceActionSheet(currentPlace);
      }
    });
  }
  if (elements.globalSearchClearButton) {
    elements.globalSearchClearButton.addEventListener("click", () => {
      if (elements.globalSearchInput) {
        elements.globalSearchInput.value = "";
      }
      state.globalSearchResults = [];
      renderGlobalSearchResults();
      closePlaceActionSheet();
    });
  }

  if (elements.applyApiButton) elements.applyApiButton.addEventListener("click", applyApiBaseFromInput);
  if (elements.clearApiButton) elements.clearApiButton.addEventListener("click", clearCustomApiBase);
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

  document.getElementById("origin-search-button").addEventListener("click", () => void searchPlaces("origin"));
  document.getElementById("destination-search-button").addEventListener("click", () => void searchPlaces("destination"));
  if (elements.mobileSearchButton) elements.mobileSearchButton.addEventListener("click", () => void searchPlaces(state.activeTarget));
  if (elements.mobileCurrentButton) elements.mobileCurrentButton.addEventListener("click", () => void useCurrentLocation());
  if (elements.mobileOriginTargetButton) elements.mobileOriginTargetButton.addEventListener("click", () => setActiveTarget("origin"));
  if (elements.mobileDestinationTargetButton) elements.mobileDestinationTargetButton.addEventListener("click", () => setActiveTarget("destination"));
  document.getElementById("origin-current-button").addEventListener("click", () => void useCurrentLocation());
  document.getElementById("parse-button").addEventListener("click", () => void previewPreferences());
  document.getElementById("route-button").addEventListener("click", () => void requestRoute());
  document.getElementById("swap-button").addEventListener("click", swapPlaces);
  document.getElementById("clear-route-button").addEventListener("click", () => clearRoute());
  document.getElementById("download-route-button").addEventListener("click", downloadRoute);

  if (elements.assistantSendButton) elements.assistantSendButton.addEventListener("click", () => void sendAssistantMessage());
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

  if (elements.followLocationButton) elements.followLocationButton.addEventListener("click", () => setFollowCurrentLocation(!state.followCurrentLocation, { status: true }));
  if (elements.followLocationButtonDuplicate) elements.followLocationButtonDuplicate.addEventListener("click", () => setFollowCurrentLocation(!state.followCurrentLocation, { status: true }));

  elements.pickOriginButton.addEventListener("click", () => setMapPickMode("origin"));
  elements.pickDestinationButton.addEventListener("click", () => setMapPickMode("destination"));
  elements.stopPickingButton.addEventListener("click", () => setMapPickMode(null));

  elements.originInput.addEventListener("focus", () => { setActiveTarget("origin"); focusPanel("search"); });
  elements.destinationInput.addEventListener("focus", () => { setActiveTarget("destination"); focusPanel("search"); });
  elements.originInput.addEventListener("keydown", (event) => { if (event.key === "Enter") void searchPlaces("origin"); });
  elements.destinationInput.addEventListener("keydown", (event) => { if (event.key === "Enter") void searchPlaces("destination"); });

  if (elements.mobileSearchInput) {
    elements.mobileSearchInput.addEventListener("input", () => syncActiveTargetInputFromMobile());
    elements.mobileSearchInput.addEventListener("focus", () => {
      focusPanel("search");
      setTopPanelCollapsed(false, { persist: false });
    });
    elements.mobileSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void searchPlaces(state.activeTarget);
      }
    });
  }

  elements.profileSelect.addEventListener("change", () => { schedulePreferencePreview(); saveState(); });
  elements.preferencesInput.addEventListener("input", () => { schedulePreferencePreview(); saveState(); });

  if (elements.refreshFavoritesButton) elements.refreshFavoritesButton.addEventListener("click", () => void refreshFavorites());
  if (elements.googleLoginButton) elements.googleLoginButton.addEventListener("click", handleGoogleLoginClick);
  if (elements.contributionModeLocal) elements.contributionModeLocal.addEventListener("click", () => setContributionMode("local"));
  if (elements.contributionModeServer) elements.contributionModeServer.addEventListener("click", () => setContributionMode("server"));
  if (elements.contributionStartButton) elements.contributionStartButton.addEventListener("click", () => void startContributionCapture());
  if (elements.contributionStopButton) elements.contributionStopButton.addEventListener("click", () => void finalizeContributionCapture());

  if (elements.placeActionBackdrop) elements.placeActionBackdrop.addEventListener("click", closePlaceActionSheet);
  if (elements.actionCloseButton) elements.actionCloseButton.addEventListener("click", closePlaceActionSheet);
  if (elements.actionSetOriginButton) {
    elements.actionSetOriginButton.addEventListener("click", () => {
      if (!state.selectedActionPlace) return;
      elements.originInput.value = state.selectedActionPlace.name;
      choosePlace("origin", state.selectedActionPlace);
      closePlaceActionSheet();
      setStatus("???????????", "success");
    });
  }
  if (elements.actionSetDestinationButton) {
    elements.actionSetDestinationButton.addEventListener("click", () => {
      if (!state.selectedActionPlace) return;
      elements.destinationInput.value = state.selectedActionPlace.name;
      choosePlace("destination", state.selectedActionPlace);
      closePlaceActionSheet();
      setStatus("???????????", "success");
    });
  }
  if (elements.actionFavoriteButton) elements.actionFavoriteButton.addEventListener("click", () => { if (state.selectedActionPlace) void saveFavoritePlace(state.selectedActionPlace); });
  if (elements.actionRouteButton) elements.actionRouteButton.addEventListener("click", () => { if (state.selectedActionPlace) void routeToPlace(state.selectedActionPlace, { startNavigation: false }); });
  if (elements.actionNavigateButton) elements.actionNavigateButton.addEventListener("click", () => { if (state.selectedActionPlace) void routeToPlace(state.selectedActionPlace, { startNavigation: true }); });

  map.on("click", handleMapClick);
  map.on("dragstart", () => {
    if (state.navigationStarted && state.followCurrentLocation) {
      setFollowCurrentLocation(false, { status: true });
    }
  });
}


async function legacy_initialize_1() {
  restoreState();
  ensureClientId();

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

  setStatus("Checking API connection...", "info");
  renderPanelState();
  renderFollowLocationButtons();
  renderContributionModeButtons();
  renderGlobalSearchResults();
  renderFavorites();

  await detectApiBase({ quiet: false, force: true });
  startConnectionMonitor();
  await loadAppInfo();
  await loadNetworkInfo();
  await refreshFavorites({ quiet: true });

  if (!state.origin) choosePlace("origin", defaultOrigin, { clearRoute: false, persist: false });
  if (!state.destination) choosePlace("destination", defaultDestination, { clearRoute: false, persist: false });

  if (!elements.preferencesInput.value.trim()) {
    elements.preferencesInput.value = "????? / ?????????";
  }

  await previewPreferences({ quiet: true });
  syncCurrentLocationMarker();

  if (state.route && state.route.path && state.route.path.length) {
    applyRoute(state.route, { persist: false, statusText: "Saved route restored." });
  } else {
    resetRouteOutput();
    fitToVisibleLayers();
    setStatus("Ready.", "success");
  }

  renderMapPickState();
  updateBusyState();
  renderConnectionState();
  renderNetworkInfo();
  renderAssistantPanel();
  renderFavoriteCount();
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

async function legacy_applyAssistantResponse_1(response) {
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

async function legacy_sendAssistantMessage_1(prefilledMessage = null) {
  const rawMessage = prefilledMessage !== null && prefilledMessage !== undefined ? prefilledMessage : elements.assistantInput.value || "";
  const message = rawMessage.trim();
  if (!message) {
    setStatus("AI ??????????????????", "warning");
    return;
  }

  pushAssistantMessage("user", message);
  elements.assistantInput.value = "";
  focusPanel("ai");
  setStatus("AI ??????????...", "info");

  try {
    const response = await withBusy(() =>
      requestApiJson(
        "/api/assistant",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, context: buildAssistantContext() }),
        },
        { timeoutMs: assistantRequestTimeoutMs },
      ),
    );
    await applyAssistantResponse(response);
  } catch (error) {
    console.error(error);
    const isTimeout = Boolean(error && (error.isTimeout || error.name === "AbortError" || /timeout|timed out|aborted/i.test(error.message || "")));
    const reply = isTimeout
      ? "AI ????????????????????????????????"
      : error.message || "AI ?????????????????";
    pushAssistantMessage("assistant", reply, []);
    setStatus(reply, isTimeout ? "warning" : "error");
  }
}


function legacy_applyPreferenceTemplate_1(value) {
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

function legacy_setActiveTarget_1(target) {
  state.activeTarget = target;
  elements.activeTargetLabel.textContent = `Target: ${target === "origin" ? "Origin" : "Destination"}`;
  syncMobileSearchInput();
}

function syncMobileSearchInput() {
  if (!elements.mobileSearchInput) {
    return;
  }
  const sourceInput = inputForTarget(state.activeTarget);
  elements.mobileSearchInput.value = sourceInput ? sourceInput.value : "";
  if (elements.mobileCurrentButton) {
    elements.mobileCurrentButton.hidden = state.activeTarget !== "origin";
  }
}

function syncActiveTargetInputFromMobile() {
  if (!elements.mobileSearchInput) {
    return;
  }
  const sourceInput = inputForTarget(state.activeTarget);
  if (sourceInput) {
    sourceInput.value = elements.mobileSearchInput.value;
  }
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

async function legacy_searchPlaces_1(target, { query = null, autoSelectFirst = false } = {}) {
  setActiveTarget(target);
  switchPanel("search", { expand: true, persist: false });
  const input = inputForTarget(target);
  const typedValue =
    query !== null && query !== undefined
      ? query
      : isSmallViewport() && elements.mobileSearchInput
        ? elements.mobileSearchInput.value
        : input.value;
  const searchText = typedValue.trim();

  if (!searchText) {
    setStatus("検索語を入力してください。", "warning");
    return;
  }

  input.value = searchText;
  syncMobileSearchInput();
  setStatus(`${target === "origin" ? "Origin" : "Destination"} search in progress.`, "info");

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

function legacy_renderResults_1(target, items) {
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
  syncMobileSearchInput();

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

  if (state.navigationStarted && state.followCurrentLocation) {
    followCurrentLocationOnMap({ force: true });
  }

  saveState();
  if (statusText) setStatus(statusText, "success");
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

function legacy_renderPreferenceTags_1(parsed) {
  elements.preferenceTags.innerHTML = "";

  const tags = [`モード: ${profileLabel(parsed.profile)}`];
  if (parsed.detected && parsed.detected.length) {
    tags.push(...parsed.detected.map((tag) => tag.label));
  } else if (parsed.summary) {
    tags.push(parsed.summary);
  }

  renderStaticChips(elements.preferenceTags, tags);
}

async function legacy_requestRoute_1() {
  if (!state.origin || !state.destination) {
    switchPanel("search", { expand: true, persist: false });
    setStatus("?????????????????", "warning");
    throw new Error("Origin and destination are required.");
  }

  switchPanel("route", { expand: true, persist: false });
  setStatus("???????????...", "info");

  try {
    const route = await withBusy(() =>
      requestApiJson(
        "/api/routes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: state.origin,
            destination: state.destination,
            profile: elements.profileSelect.value,
            preferences_text: elements.preferencesInput.value.trim(),
          }),
        },
        { timeoutMs: 20000 },
      ),
    );
    applyRoute(route);
    return route;
  } catch (error) {
    console.error(error);
    setStatus(error.message || "?????????????", "error");
    throw error;
  }
}


function legacy_applyRoute_1(route, options = {}) {
  const settings = { persist: true, statusText: "???????????", ...options };

  state.route = route;
  state.navigationStarted = false;
  state.navigationIndex = 0;

  elements.engineWarning.textContent = `Route engine: ${route.engine} / ${route.warning || "local"}`;
  renderPreferenceTags(route.parsed_preferences);
  renderStaticChips(elements.routeHighlights, route.highlights || ["Route ready"]);
  renderSummary(route.summary);
  renderSteps(route.steps || []);
  renderNavigation();

  if (routeLayer) routeLayer.remove();

  const latLngs = route.path.map((point) => [point.lat, point.lon]);
  routeLayer = L.polyline(latLngs, { color: "#3b82f6", weight: 6, opacity: 0.9 }).addTo(map);

  fitToVisibleLayers();
  switchPanel("route", { expand: true, persist: false });
  if (state.currentLocation && state.followCurrentLocation) {
    followCurrentLocationOnMap({ force: true });
  }
  if (settings.persist) saveState();
  setStatus(settings.statusText, "success");
}


function legacy_renderSummary_1(summary) {
  elements.routeSummaryLabel.textContent = `${summary.distance_km} km / ${summary.duration_min} 分`;
  elements.distanceValue.textContent = `${summary.distance_km} km`;
  elements.durationValue.textContent = `${summary.duration_min} 分`;
  elements.elevationValue.textContent = `${summary.elevation_gain_m} m`;
  elements.trafficValue.textContent = `${summary.traffic_lights_estimate} 回`;
  elements.maxGradientValue.textContent = `${summary.max_gradient_percent} %`;
  elements.avgGradientValue.textContent = `${summary.average_gradient_percent} %`;
  elements.arrivalValue.textContent = summary.estimated_arrival;
}

function legacy_resetRouteOutput_1() {
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

function legacy_clearRoute_1(options = {}) {
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

function legacy_toggleNavigation_1() {
  if (!state.route || !state.route.steps || !state.route.steps.length) {
    setStatus("???????????????", "warning");
    return;
  }

  state.navigationStarted = !state.navigationStarted;
  if (state.navigationStarted && state.navigationIndex >= state.route.steps.length) {
    state.navigationIndex = 0;
  }
  if (state.navigationStarted) {
    setFollowCurrentLocation(true, { persist: false, status: false });
    followCurrentLocationOnMap({ force: true });
  }

  renderNavigation();
  saveState();
  setStatus(state.navigationStarted ? "??????????" : "??????????", state.navigationStarted ? "success" : "info");
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

function legacy_renderNavigation_1() {
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
    setStatus("No route to export.", "warning");
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

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  anchor.href = url;
  anchor.download = `route-${timestamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Route JSON exported.", "success");
}


function ensureClientId() {
  if (state.clientId) return state.clientId;
  const existing = localStorage.getItem(clientIdStorageKey);
  if (existing) {
    state.clientId = existing;
    return existing;
  }
  const nextId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  state.clientId = nextId;
  localStorage.setItem(clientIdStorageKey, nextId);
  return nextId;
}

function renderFavoriteCount() {
  if (elements.favoriteCount) {
    elements.favoriteCount.textContent = `Favorites ${state.favorites.length}`;
  }
}

function legacy_renderFollowLocationButtons_1() {
  [elements.followLocationButton, elements.followLocationButtonDuplicate].filter(Boolean).forEach((button) => {
    button.textContent = state.followCurrentLocation ? "霑ｽ蟆ｾ ON" : "霑ｽ蟆ｾ OFF";
    button.classList.toggle("active-toggle", state.followCurrentLocation);
  });
}

function legacy_setFollowCurrentLocation_1(value, { persist = true, status = false } = {}) {
  state.followCurrentLocation = Boolean(value);
  renderFollowLocationButtons();
  if (state.followCurrentLocation) {
    followCurrentLocationOnMap({ force: true });
  }
  if (persist) {
    saveState();
  }
  if (status) {
    setStatus(state.followCurrentLocation ? "?????????????" : "????????????", "info");
  }
}


function followCurrentLocationOnMap({ force = false } = {}) {
  if (!state.currentLocation || !state.followCurrentLocation) return;
  if (!force && !state.navigationStarted) return;
  map.setView([state.currentLocation.lat, state.currentLocation.lon], Math.max(map.getZoom(), 16), { animate: true });
}

function legacy_renderContributionModeButtons_1() {
  if (elements.contributionModeLocal) elements.contributionModeLocal.classList.toggle("active-toggle", state.captureMode === "local");
  if (elements.contributionModeServer) elements.contributionModeServer.classList.toggle("active-toggle", state.captureMode === "server");
  if (elements.contributionStartButton) elements.contributionStartButton.disabled = Boolean(state.captureSession);
  if (elements.contributionStopButton) elements.contributionStopButton.disabled = !state.captureSession;
}

function legacy_setContributionMode_1(mode) {
  state.captureMode = mode === "server" ? "server" : "local";
  renderContributionModeButtons();
  saveState();
}

function legacy_renderContributionStatus_1(message, kind = "info", logText = "") {
  if (elements.contributionStatus) {
    elements.contributionStatus.textContent = message;
    elements.contributionStatus.className = `status-message ${kind}`;
  }
  if (elements.contributionLog && logText) {
    elements.contributionLog.textContent = logText;
  }
}

function renderGlobalSearchResults() {
  if (!elements.globalSearchResults) return;
  elements.globalSearchResults.innerHTML = "";
  const items = state.globalSearchResults || [];
  elements.globalSearchResults.classList.toggle("has-items", items.length > 0);
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-item global-result-item";
    button.innerHTML = `<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description || item.category || "")}</span><small class="result-meta">${escapeHtml(buildPlaceMeta(item))}</small>`;
    button.addEventListener("click", () => openPlaceActionSheet(item));
    elements.globalSearchResults.append(button);
  });
}

function scheduleGlobalSearch(query) {
  if (globalSearchTimer) clearTimeout(globalSearchTimer);
  if (!query || !query.trim()) {
    state.globalSearchResults = [];
    renderGlobalSearchResults();
    return;
  }
  globalSearchTimer = setTimeout(() => {
    void performGlobalSearch(query);
  }, 220);
}

async function legacy_performGlobalSearch_1(query) {
  const text = (query || "").trim();
  if (!text) {
    state.globalSearchResults = [];
    renderGlobalSearchResults();
    return;
  }
  try {
    const params = new URLSearchParams({ q: text, limit: "8" });
    if (state.currentLocation) {
      params.set("near_lat", String(state.currentLocation.lat));
      params.set("near_lon", String(state.currentLocation.lon));
    }
    const data = await requestApiJson(`/api/places/search?${params.toString()}`, {}, { quiet: true, timeoutMs: 12000 });
    state.globalSearchResults = data.items || [];
    renderGlobalSearchResults();
  } catch (error) {
    console.warn(error);
    state.globalSearchResults = [];
    renderGlobalSearchResults();
  }
}

function openPlaceActionSheet(place) {
  state.selectedActionPlace = normalizePlace(place);
  if (elements.placeActionName) elements.placeActionName.textContent = state.selectedActionPlace.name;
  if (elements.placeActionMeta) {
    elements.placeActionMeta.textContent =
      buildPlaceMeta(state.selectedActionPlace) || state.selectedActionPlace.description || state.selectedActionPlace.category;
  }
  if (elements.placeActionSheet) elements.placeActionSheet.classList.remove("hidden");
}

function closePlaceActionSheet() {
  state.selectedActionPlace = null;
  if (elements.placeActionSheet) elements.placeActionSheet.classList.add("hidden");
}

async function routeToPlace(place, { startNavigation = false } = {}) {
  const targetPlace = normalizePlace(place);
  if (!state.origin) {
    if (state.currentLocation) {
      const currentPlace = buildCurrentLocationPlace(state.currentLocation);
      elements.originInput.value = currentPlace.name;
      choosePlace("origin", currentPlace, { clearRoute: false });
    } else {
      elements.originInput.value = defaultOrigin.name;
      choosePlace("origin", defaultOrigin, { clearRoute: false });
    }
  }
  elements.destinationInput.value = targetPlace.name;
  choosePlace("destination", targetPlace, { clearRoute: false });
  closePlaceActionSheet();
  try {
    await requestRoute();
    if (startNavigation && state.route) {
      state.navigationStarted = true;
      state.navigationIndex = 0;
      setFollowCurrentLocation(true, { persist: false, status: false });
      renderNavigation();
      followCurrentLocationOnMap({ force: true });
      saveState();
    }
  } catch (error) {
    console.warn(error);
  }
}

async function legacy_refreshFavorites_1({ quiet = false } = {}) {
  ensureClientId();
  if (!state.apiAvailable) {
    state.favorites = [];
    renderFavorites();
    return;
  }
  try {
    const payload = await requestApiJson(`/api/favorites?client_id=${encodeURIComponent(state.clientId)}`, {}, { quiet, timeoutMs: 10000 });
    state.favorites = payload.items || [];
    renderFavorites();
  } catch (error) {
    console.warn(error);
    if (!quiet) {
      setStatus(error.message || "????????????????", "error");
    }
  }
}


function legacy_renderFavorites_1() {
  renderFavoriteCount();
  if (!elements.favoritesList) return;
  elements.favoritesList.innerHTML = "";

  if (!state.favorites.length) {
    const empty = document.createElement("p");
    empty.className = "result-empty";
    empty.textContent = "??????????????";
    elements.favoritesList.append(empty);
    return;
  }

  state.favorites.forEach((favorite) => {
    const row = document.createElement("div");
    row.className = "selected-card";
    row.innerHTML = `<strong>${escapeHtml((favorite.label || (favorite.place && favorite.place.name) || "Favorite"))}</strong><span>${escapeHtml((favorite.place && (favorite.place.description || favorite.place.category)) || "")}</span><small class="result-meta">${favorite.ip_match ? "IP??" : "IP????"}</small>`;
    const actions = document.createElement("div");
    actions.className = "assistant-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "secondary compact-button";
    openButton.textContent = "??";
    openButton.addEventListener("click", () => openPlaceActionSheet(favorite.place));
    actions.append(openButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary compact-button";
    deleteButton.textContent = "??";
    deleteButton.addEventListener("click", async () => {
      try {
        await requestApiJson(`/api/favorites/${encodeURIComponent(favorite.id)}?client_id=${encodeURIComponent(state.clientId)}`, { method: "DELETE" }, { timeoutMs: 10000 });
        await refreshFavorites({ quiet: true });
      } catch (error) {
        setStatus(error.message || "????????????????", "error");
      }
    });
    actions.append(deleteButton);

    row.append(actions);
    elements.favoritesList.append(row);
  });
}


async function legacy_saveFavoritePlace_1(place) {
  ensureClientId();
  if (!state.apiAvailable) {
    setStatus("????????? API ????????", "warning");
    return;
  }
  try {
    const normalizedPlace = normalizePlace(place);
    const response = await requestApiJson(
      "/api/favorites",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: state.clientId, place: normalizedPlace, label: normalizedPlace.name }),
      },
      { timeoutMs: 10000 },
    );
    state.favorites = response.items || [];
    renderFavorites();
    closePlaceActionSheet();
    setStatus("?????????????", "success");
  } catch (error) {
    setStatus(error.message || "???????????????", "error");
  }
}


function legacy_handleGoogleLoginClick_1() {
  if (elements.googleLoginStatus) {
    elements.googleLoginStatus.textContent = "???";
  }
  setStatus("Google ???????????ID???????URL???????????? UI ??????????????", "info");
}


async function ensureExternalScript(src) {
  if (externalScriptPromises.has(src)) return externalScriptPromises.get(src);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.append(script);
  });
  externalScriptPromises.set(src, promise);
  return promise;
}

async function ensureJSZipLib() {
  if (window.JSZip) return window.JSZip;
  await ensureExternalScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
  return window.JSZip;
}

async function ensureContributionDetector() {
  if (detectorModelPromise) return detectorModelPromise;
  if (!window.cocoSsd) {
    await ensureExternalScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
    await ensureExternalScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
  }
  if (!window.cocoSsd) return null;
  detectorModelPromise = window.cocoSsd.load({ base: "lite_mobilenet_v2" }).catch((error) => {
    console.warn(error);
    detectorModelPromise = null;
    return null;
  });
  return detectorModelPromise;
}

function appendContributionLog(line) {
  if (!elements.contributionLog) return;
  const current = elements.contributionLog.textContent || "";
  const next = `${current}${current ? "\n" : ""}${line}`;
  elements.contributionLog.textContent = next.split("\n").slice(-8).join("\n");
}

async function legacy_detectContributionFrame_1(session) {
  if (!session || !session.detector || !elements.contributionPreview || elements.contributionPreview.readyState < 2) return;
  try {
    const predictions = await session.detector.detect(elements.contributionPreview, 12);
    const relevant = predictions
      .filter((item) => ["car", "truck", "bus", "traffic light", "motorcycle", "bicycle", "stop sign", "person"].includes(item.class))
      .map((item) => ({
        class: item.class,
        score: Number(item.score.toFixed(3)),
        bbox: item.bbox.map((value) => Number(value.toFixed(1))),
      }));
    session.detections.push({
      at: new Date().toISOString(),
      items: relevant,
      car_count: relevant.filter((item) => ["car", "truck", "bus", "motorcycle"].includes(item.class)).length,
      traffic_signal_count: relevant.filter((item) => item.class === "traffic light").length,
      road_width_estimate_m: null,
    });
    if (relevant.length) appendContributionLog(`隱崎ｭ・ ${relevant.map((item) => item.class).join(", ")}`);
  } catch (error) {
    console.warn(error);
  }
}

function stopContributionSensors() {
  if (contributionDetectionTimer) {
    clearInterval(contributionDetectionTimer);
    contributionDetectionTimer = null;
  }
  if (navigator.geolocation && contributionPositionWatchId !== null) {
    navigator.geolocation.clearWatch(contributionPositionWatchId);
    contributionPositionWatchId = null;
  }
  if (contributionOrientationHandler) {
    window.removeEventListener("deviceorientation", contributionOrientationHandler, true);
    window.removeEventListener("deviceorientationabsolute", contributionOrientationHandler, true);
    contributionOrientationHandler = null;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function legacy_buildContributionArchive_1(session) {
  const JSZip = await ensureJSZipLib();
  const zip = new JSZip();
  const metadata = {
    client_id: state.clientId,
    mode: state.captureMode,
    started_at: session.startedAt,
    stopped_at: new Date().toISOString(),
    notes: session.notes || "",
    route: state.route ? { summary: state.route.summary, highlights: state.route.highlights } : null,
    current_location: state.currentLocation,
    detection_note: "road_width_estimate_m is not implemented yet, so it is null.",
  };
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  zip.file("positions.json", JSON.stringify(session.positions, null, 2));
  zip.file("orientation.json", JSON.stringify(session.orientations, null, 2));
  zip.file("detections.json", JSON.stringify(session.detections, null, 2));
  if (session.videoBlob) {
    zip.file("video.webm", session.videoBlob);
  }
  return zip.generateAsync({ type: "blob" });
}


async function legacy_startContributionCapture_1() {
  ensureClientId();
  if (state.captureSession) return;

  if (!window.isSecureContext && !isLoopbackHost(location.hostname)) {
    renderContributionStatus("???????????? HTTPS ??? localhost ????????", "warning");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    renderContributionStatus("?????????????????????", "error");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });
    const chunks = [];
    const session = {
      stream,
      recorder,
      chunks,
      positions: [],
      orientations: [],
      detections: [],
      startedAt: new Date().toISOString(),
      notes: elements.contributionNotes ? elements.contributionNotes.value.trim() : "",
      videoBlob: null,
      stopPromise: null,
      detector: null,
    };

    session.stopPromise = new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          session.videoBlob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
          resolve();
        },
        { once: true },
      );
    });

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) {
        chunks.push(event.data);
      }
    });

    recorder.start(1000);
    if (elements.contributionPreview) {
      elements.contributionPreview.srcObject = stream;
      elements.contributionPreview.play().catch(() => {});
    }

    if (navigator.geolocation) {
      contributionPositionWatchId = navigator.geolocation.watchPosition(
        (position) => {
          session.positions.push({
            at: new Date().toISOString(),
            lat: Number(position.coords.latitude.toFixed(6)),
            lon: Number(position.coords.longitude.toFixed(6)),
            accuracy_m: Number((position.coords.accuracy || 0).toFixed(1)),
            speed_mps: position.coords.speed,
          });
        },
        (error) => console.warn(error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
      );
    }

    contributionOrientationHandler = (event) => {
      const heading = extractHeadingFromOrientation(event);
      session.orientations.push({
        at: new Date().toISOString(),
        heading,
        alpha: typeof event.alpha === "number" ? Number(event.alpha.toFixed(2)) : null,
        beta: typeof event.beta === "number" ? Number(event.beta.toFixed(2)) : null,
        gamma: typeof event.gamma === "number" ? Number(event.gamma.toFixed(2)) : null,
      });
    };
    window.addEventListener("deviceorientation", contributionOrientationHandler, true);
    window.addEventListener("deviceorientationabsolute", contributionOrientationHandler, true);

    state.captureSession = session;
    renderContributionModeButtons();
    renderContributionStatus(`???????????? (${state.captureMode})`, "success");
    appendContributionLog("??????????");

    ensureContributionDetector()
      .then((detector) => {
        session.detector = detector;
        if (detector) {
          appendContributionLog("????????????????");
        }
      })
      .catch((error) => {
        console.warn(error);
        appendContributionLog("????????????????????");
      });

    contributionDetectionTimer = setInterval(() => {
      void detectContributionFrame(session);
    }, 2500);
  } catch (error) {
    console.error(error);
    renderContributionStatus(error.message || "????????????????", "error");
  }
}


async function legacy_finalizeContributionCapture_1() {
  const session = state.captureSession;
  if (!session) return;

  renderContributionStatus("??????????????", "info");
  stopContributionSensors();
  if (session.recorder && session.recorder.state !== "inactive") session.recorder.stop();
  if (session.stream) session.stream.getTracks().forEach((track) => track.stop());
  await session.stopPromise;

  const archiveBlob = await buildContributionArchive(session);
  const filename = `contribution-${new Date().toISOString().replaceAll(":", "-")}.zip`;

  try {
    if (state.captureMode === "server") {
      const formData = new FormData();
      formData.append("client_id", state.clientId);
      formData.append("mode", state.captureMode);
      formData.append("metadata", JSON.stringify({ notes: session.notes || "", started_at: session.startedAt }, null, 2));
      formData.append("file", archiveBlob, filename);
      const response = await requestApiJson(
        "/api/contributions/upload",
        { method: "POST", body: formData },
        { timeoutMs: contributionUploadTimeoutMs },
      );
      renderContributionStatus(`???????????: ${response.filename}`, "success", response.path || "");
    } else {
      downloadBlob(archiveBlob, filename);
      renderContributionStatus("????? ZIP ???????", "success");
    }
  } catch (error) {
    console.error(error);
    downloadBlob(archiveBlob, filename);
    renderContributionStatus("?????????????????????????????", "warning", error.message || "");
  } finally {
    if (elements.contributionPreview) elements.contributionPreview.srcObject = null;
    state.captureSession = null;
    renderContributionModeButtons();
  }
}


function legacy_saveState_1() {
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
    topPanelCollapsed: state.topPanelCollapsed,
    sheetCollapsed: state.sheetCollapsed,
    clientId: state.clientId,
    followCurrentLocation: state.followCurrentLocation,
    captureMode: state.captureMode,
  };

  localStorage.setItem(storageKey, JSON.stringify(payload));
}


function legacy_restoreState_1() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    elements.originInput.value = defaultOrigin.name;
    elements.destinationInput.value = defaultDestination.name;
    elements.profileSelect.value = "walk";
    ensureClientId();
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
    state.activePanel = ["search", "route", "ai", "access", "settings"].includes(parsed.activePanel)
      ? parsed.activePanel
      : "search";
    state.topPanelCollapsed = typeof parsed.topPanelCollapsed === "boolean" ? parsed.topPanelCollapsed : window.matchMedia("(max-width: 720px)").matches;
    state.sheetCollapsed = typeof parsed.sheetCollapsed === "boolean" ? parsed.sheetCollapsed : window.matchMedia("(max-width: 720px)").matches;
    state.followCurrentLocation = typeof parsed.followCurrentLocation === "boolean" ? parsed.followCurrentLocation : true;
    state.captureMode = parsed.captureMode === "server" ? "server" : "local";
    state.clientId = parsed.clientId || localStorage.getItem(clientIdStorageKey) || "";
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

  ensureClientId();
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
  const isHostedApiPage =
    location.hostname.endsWith(".onrender.com") ||
    location.hostname.endsWith(".fly.dev") ||
    location.hostname.endsWith(".railway.app");
  const isKnownStaticHost =
    location.hostname.endsWith(".vercel.app") ||
    location.hostname.endsWith(".netlify.app") ||
    location.hostname.endsWith(".pages.dev");

  if (
    isHttpPage &&
    (
      location.port === "8000" ||
      isPrivatePage ||
      isLoopbackHost(location.hostname) ||
      isHostedApiPage ||
      (location.protocol === "https:" && !isKnownStaticHost)
    )
  ) {
    pushCandidate(location.origin);
  }

  if (location.protocol !== "https:" && isPrivatePage && location.hostname) {
    pushCandidate(`http://${location.hostname}:8000`);
  }

  if (!isHostedApiPage && (isPrivatePage || isLoopbackHost(location.hostname) || location.protocol !== "https:")) {
    pushCandidate("http://127.0.0.1:8000");
    pushCandidate("http://localhost:8000");
  }

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

function legacy_renderConnectionState_1() {
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(requestTimeoutMs, 5000));
    const response = await fetch(buildApiUrl(`/api/health?ts=${Date.now()}`, base), {
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timer);
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function detectApiBase({ quiet = true, force = false } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setConnectionState(false, state.apiBase || fallbackApiOrigin, { quiet: true });
    return false;
  }

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
  }, healthcheckIntervalMs);

  window.addEventListener("online", () => {
    void detectApiBase({ quiet: false, force: true });
  });
  window.addEventListener("offline", () => {
    setConnectionState(false, state.apiBase, { quiet: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void detectApiBase({ quiet: true, force: false });
    }
  });
}

async function requestApiJson(path, options = {}, { quiet = false, timeoutMs = requestTimeoutMs } = {}) {
  let lastError = null;

  for (const candidate of buildApiCandidates()) {
    try {
      const payload = await fetchJson(buildApiUrl(path, candidate), options, { timeoutMs });
      setConnectionState(true, candidate, { quiet });
      return payload;
    } catch (error) {
      lastError = error;
      const isTimeout = Boolean(error && (error.isTimeout || error.name === "AbortError"));
      const isHttpError = error && typeof error.status === "number";

      if (isTimeout) {
        setConnectionState(true, candidate, { quiet: true });
        throw error;
      }
      if (isHttpError && error.status !== 404) {
        setConnectionState(true, candidate, { quiet: true });
        throw error;
      }
    }
  }

  if (lastError && (lastError.isTimeout || lastError.name === "AbortError")) {
    throw lastError;
  }
  setConnectionState(false, fallbackApiOrigin, { quiet });
  throw lastError || new Error("Could not connect to the API server.");
}


function updateBusyState() {
  const busy = state.busyCount > 0;
  busyButtons.forEach((button) => {
    button.disabled = busy;
  });
}

async function fetchJson(url, options = {}, { timeoutMs = requestTimeoutMs } = {}) {
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;

  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (timer) clearTimeout(timer);
    if (error && error.name === "AbortError") {
      const timeoutError = new Error("Request timed out.");
      timeoutError.name = "AbortError";
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    throw error;
  }

  if (timer) clearTimeout(timer);

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const detail = (payload && payload.detail) || `HTTP ${response.status}`;
    const requestError = new Error(detail);
    requestError.status = response.status;
    throw requestError;
  }

  return payload;
}

function legacy_renderFollowLocationButtons_2() {
  [elements.followLocationButton, elements.followLocationButtonDuplicate].filter(Boolean).forEach((button) => {
    button.textContent = state.followCurrentLocation ? "追尾 ON" : "追尾 OFF";
    button.classList.toggle("active-toggle", state.followCurrentLocation);
  });
}

function legacy_setFollowCurrentLocation_2(value, { persist = true, status = false } = {}) {
  state.followCurrentLocation = Boolean(value);
  renderFollowLocationButtons();
  if (state.followCurrentLocation) {
    followCurrentLocationOnMap({ force: true });
  }
  if (persist) {
    saveState();
  }
  if (status) {
    setStatus(state.followCurrentLocation ? "現在地の追尾を有効にしました。" : "現在地の追尾を停止しました。", "info");
  }
}

function legacy_renderContributionModeButtons_2() {
  if (elements.contributionModeLocal) elements.contributionModeLocal.classList.toggle("active-toggle", state.captureMode === "local");
  if (elements.contributionModeServer) elements.contributionModeServer.classList.toggle("active-toggle", state.captureMode === "server");
  if (elements.contributionStartButton) elements.contributionStartButton.disabled = Boolean(state.captureSession);
  if (elements.contributionStopButton) elements.contributionStopButton.disabled = !state.captureSession;
  renderContributionPerspectiveButtons();
}

function legacy_renderContributionPerspectiveButtons_1() {
  if (elements.contributionPerspectiveDrive) {
    elements.contributionPerspectiveDrive.classList.toggle("active-toggle", state.capturePerspective === "car_front");
    elements.contributionPerspectiveDrive.disabled = Boolean(state.captureSession);
  }
  if (elements.contributionPerspectiveWalk) {
    elements.contributionPerspectiveWalk.classList.toggle("active-toggle", state.capturePerspective === "walk");
    elements.contributionPerspectiveWalk.disabled = Boolean(state.captureSession);
  }
}

function setContributionMode(mode) {
  state.captureMode = mode === "server" ? "server" : "local";
  renderContributionModeButtons();
  saveState();
}

function setContributionPerspective(mode) {
  state.capturePerspective = mode === "walk" ? "walk" : "car_front";
  renderContributionPerspectiveButtons();
  clearContributionOverlay();
  saveState();
}

function legacy_renderContributionOverlay_1(items = [], { statusText = "" } = {}) {
  if (elements.contributionPreviewShell) {
    elements.contributionPreviewShell.classList.toggle("is-detecting", items.length > 0);
  }
  if (elements.contributionOverlayStatus) {
    elements.contributionOverlayStatus.textContent = statusText || (items.length ? `認識中: ${items.length}件` : "認識待機中");
  }
  if (!elements.contributionOverlayTags) {
    return;
  }
  elements.contributionOverlayTags.innerHTML = "";
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "overlay-tag";
    chip.textContent = typeof item.count === "number" && item.count > 1 ? `${item.label} ×${item.count}` : item.label;
    elements.contributionOverlayTags.append(chip);
  });
}

function legacy_clearContributionOverlay_1() {
  renderContributionOverlay([], {
    statusText: state.capturePerspective === "walk" ? "徒歩モード / 認識待機中" : "車前方モード / 認識待機中",
  });
}

function legacy_summarizeContributionDetections_1(relevant) {
  const labelMap = {
    car: "車",
    truck: "トラック",
    bus: "バス",
    "traffic light": "信号",
    motorcycle: "バイク",
    bicycle: "自転車",
    "stop sign": "停止標識",
    person: "歩行者",
  };
  const counts = new Map();
  relevant.forEach((item) => {
    const label = labelMap[item.class] || item.class;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

async function performGlobalSearch(query) {
  const text = (query || "").trim();
  if (!text) {
    state.globalSearchResults = [];
    renderGlobalSearchResults();
    return;
  }
  setGlobalSearchCollapsed(false, { persist: false });
  try {
    const params = new URLSearchParams({ q: text, limit: "8" });
    if (state.currentLocation) {
      params.set("near_lat", String(state.currentLocation.lat));
      params.set("near_lon", String(state.currentLocation.lon));
    }
    const data = await requestApiJson(`/api/places/search?${params.toString()}`, {}, { quiet: true, timeoutMs: 12000 });
    state.globalSearchResults = data.items || [];
    renderGlobalSearchResults();
  } catch (error) {
    console.warn(error);
    state.globalSearchResults = [];
    renderGlobalSearchResults();
  }
}

async function detectContributionFrame(session) {
  if (!session || !session.detector || !elements.contributionPreview || elements.contributionPreview.readyState < 2) return;
  try {
    const predictions = await session.detector.detect(elements.contributionPreview, 12);
    const relevant = predictions
      .filter((item) => ["car", "truck", "bus", "traffic light", "motorcycle", "bicycle", "stop sign", "person"].includes(item.class))
      .map((item) => ({
        class: item.class,
        score: Number(item.score.toFixed(3)),
        bbox: item.bbox.map((value) => Number(value.toFixed(1))),
      }));
    session.detections.push({
      at: new Date().toISOString(),
      items: relevant,
      car_count: relevant.filter((item) => ["car", "truck", "bus", "motorcycle"].includes(item.class)).length,
      traffic_signal_count: relevant.filter((item) => item.class === "traffic light").length,
      road_width_estimate_m: null,
      perspective: state.capturePerspective,
    });
    const summary = summarizeContributionDetections(relevant);
    renderContributionOverlay(summary, {
      statusText: summary.length ? `認識中: ${summary.map((item) => `${item.label}${item.count > 1 ? `×${item.count}` : ""}`).join(", ")}` : "認識待機中",
    });
    if (relevant.length) appendContributionLog(`検出: ${summary.map((item) => `${item.label}${item.count > 1 ? `x${item.count}` : ""}`).join(", ")}`);
  } catch (error) {
    console.warn(error);
  }
}

async function legacy_buildContributionArchive_2(session) {
  const JSZip = await ensureJSZipLib();
  const zip = new JSZip();
  const metadata = {
    client_id: state.clientId,
    mode: state.captureMode,
    capture_perspective: state.capturePerspective,
    started_at: session.startedAt,
    stopped_at: new Date().toISOString(),
    notes: session.notes || "",
    route: state.route ? { summary: state.route.summary, highlights: state.route.highlights } : null,
    current_location: state.currentLocation,
    detection_note: "road_width_estimate_m is not implemented yet, so it is null.",
  };
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  zip.file("positions.json", JSON.stringify(session.positions, null, 2));
  zip.file("orientation.json", JSON.stringify(session.orientations, null, 2));
  zip.file("detections.json", JSON.stringify(session.detections, null, 2));
  if (session.videoBlob) {
    zip.file("video.webm", session.videoBlob);
  }
  return zip.generateAsync({ type: "blob" });
}

async function legacy_startContributionCapture_2() {
  ensureClientId();
  if (state.captureSession) return;
  if (!window.isSecureContext && !isLoopbackHost(location.hostname)) {
    renderContributionStatus("協力モードのカメラ利用は HTTPS または localhost でのみ使えます。", "warning");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    renderContributionStatus("この端末ではカメラ記録に対応していません。", "error");
    return;
  }

  try {
    const videoConstraints =
      state.capturePerspective === "walk"
        ? { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }
        : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } };
    const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });
    const chunks = [];
    const session = {
      stream,
      recorder,
      chunks,
      positions: [],
      orientations: [],
      detections: [],
      startedAt: new Date().toISOString(),
      notes: elements.contributionNotes ? elements.contributionNotes.value.trim() : "",
      videoBlob: null,
      stopPromise: null,
      detector: null,
      perspective: state.capturePerspective,
    };

    session.stopPromise = new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          session.videoBlob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
          resolve();
        },
        { once: true },
      );
    });
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    });
    recorder.start(1000);

    if (elements.contributionPreview) {
      elements.contributionPreview.srcObject = stream;
      elements.contributionPreview.play().catch(() => {});
    }
    clearContributionOverlay();

    if (navigator.geolocation) {
      contributionPositionWatchId = navigator.geolocation.watchPosition(
        (position) => {
          session.positions.push({
            at: new Date().toISOString(),
            lat: Number(position.coords.latitude.toFixed(6)),
            lon: Number(position.coords.longitude.toFixed(6)),
            accuracy_m: Number((position.coords.accuracy || 0).toFixed(1)),
            speed_mps: position.coords.speed,
          });
        },
        (error) => console.warn(error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
      );
    }

    contributionOrientationHandler = (event) => {
      const heading = extractHeadingFromOrientation(event);
      session.orientations.push({
        at: new Date().toISOString(),
        heading,
        alpha: typeof event.alpha === "number" ? Number(event.alpha.toFixed(2)) : null,
        beta: typeof event.beta === "number" ? Number(event.beta.toFixed(2)) : null,
        gamma: typeof event.gamma === "number" ? Number(event.gamma.toFixed(2)) : null,
      });
    };
    window.addEventListener("deviceorientation", contributionOrientationHandler, true);
    window.addEventListener("deviceorientationabsolute", contributionOrientationHandler, true);

    state.captureSession = session;
    renderContributionModeButtons();
    renderContributionStatus(
      state.capturePerspective === "walk" ? "徒歩モードで記録を開始しました。" : "車前方モードで記録を開始しました。",
      "success",
    );
    appendContributionLog(state.capturePerspective === "walk" ? "徒歩モードで記録開始" : "車前方モードで記録開始");

    ensureContributionDetector()
      .then((detector) => {
        session.detector = detector;
        if (detector) {
          appendContributionLog("物体認識モデルを読み込みました。");
          clearContributionOverlay();
        }
      })
      .catch((error) => {
        console.warn(error);
        appendContributionLog("物体認識モデルの読み込みに失敗しました。");
      });

    contributionDetectionTimer = setInterval(() => {
      void detectContributionFrame(session);
    }, state.capturePerspective === "walk" ? 1200 : 1800);
  } catch (error) {
    console.error(error);
    renderContributionStatus(error.message || "協力モードの開始に失敗しました。", "error");
  }
}

async function legacy_finalizeContributionCapture_2() {
  const session = state.captureSession;
  if (!session) return;

  renderContributionStatus("アーカイブを生成しています。", "info");
  stopContributionSensors();
  if (session.recorder && session.recorder.state !== "inactive") session.recorder.stop();
  if (session.stream) session.stream.getTracks().forEach((track) => track.stop());
  await session.stopPromise;

  const archiveBlob = await buildContributionArchive(session);
  const filename = `contribution-${new Date().toISOString().replaceAll(":", "-")}.zip`;
  try {
    if (state.captureMode === "server") {
      const formData = new FormData();
      formData.append("client_id", state.clientId);
      formData.append("mode", state.captureMode);
      formData.append("metadata", JSON.stringify({ notes: session.notes || "", started_at: session.startedAt, capture_perspective: state.capturePerspective }, null, 2));
      formData.append("file", archiveBlob, filename);
      const response = await requestApiJson("/api/contributions/upload", { method: "POST", body: formData }, { timeoutMs: contributionUploadTimeoutMs });
      renderContributionStatus(`サーバーへ送信しました: ${response.filename}`, "success", response.path || "");
    } else {
      downloadBlob(archiveBlob, filename);
      renderContributionStatus("ローカルに ZIP 保存しました。", "success");
    }
  } catch (error) {
    console.error(error);
    downloadBlob(archiveBlob, filename);
    renderContributionStatus("サーバー送信に失敗したため、ローカル保存に切り替えました。", "warning", error.message || "");
  } finally {
    if (elements.contributionPreview) elements.contributionPreview.srcObject = null;
    state.captureSession = null;
    renderContributionModeButtons();
    clearContributionOverlay();
  }
}

function legacy_saveState_2() {
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
    topPanelCollapsed: state.topPanelCollapsed,
    globalSearchCollapsed: state.globalSearchCollapsed,
    sheetCollapsed: state.sheetCollapsed,
    clientId: state.clientId,
    followCurrentLocation: state.followCurrentLocation,
    captureMode: state.captureMode,
    capturePerspective: state.capturePerspective,
  };

  localStorage.setItem(storageKey, JSON.stringify(payload));
}

function legacy_restoreState_2() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    elements.originInput.value = defaultOrigin.name;
    elements.destinationInput.value = defaultDestination.name;
    elements.profileSelect.value = "walk";
    ensureClientId();
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
    state.activePanel = ["search", "route", "ai", "access", "settings"].includes(parsed.activePanel) ? parsed.activePanel : "search";
    state.topPanelCollapsed = typeof parsed.topPanelCollapsed === "boolean" ? parsed.topPanelCollapsed : window.matchMedia("(max-width: 720px)").matches;
    state.globalSearchCollapsed = typeof parsed.globalSearchCollapsed === "boolean" ? parsed.globalSearchCollapsed : false;
    state.sheetCollapsed = typeof parsed.sheetCollapsed === "boolean" ? parsed.sheetCollapsed : window.matchMedia("(max-width: 720px)").matches;
    state.followCurrentLocation = typeof parsed.followCurrentLocation === "boolean" ? parsed.followCurrentLocation : true;
    state.captureMode = parsed.captureMode === "server" ? "server" : "local";
    state.capturePerspective = parsed.capturePerspective === "walk" ? "walk" : "car_front";
    state.clientId = parsed.clientId || localStorage.getItem(clientIdStorageKey) || "";
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

  ensureClientId();
}

function wireEvents() {
  if (elements.sheetToggleButton) {
    elements.sheetToggleButton.addEventListener("click", () => setSheetCollapsed(!state.sheetCollapsed));
  }
  if (elements.topPanelToggleButton) {
    elements.topPanelToggleButton.addEventListener("click", () => setTopPanelCollapsed(!state.topPanelCollapsed));
  }
  if (elements.settingsOpenButton) {
    elements.settingsOpenButton.addEventListener("click", () => switchPanel("settings", { expand: true }));
  }
  if (elements.globalSearchToggleButton) {
    elements.globalSearchToggleButton.addEventListener("click", () => setGlobalSearchCollapsed(!state.globalSearchCollapsed));
  }

  elements.panelTabs.forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.panelTab, { expand: true }));
  });

  if (elements.globalSearchInput) {
    elements.globalSearchInput.addEventListener("input", () => scheduleGlobalSearch(elements.globalSearchInput.value));
    elements.globalSearchInput.addEventListener("focus", () => {
      setTopPanelCollapsed(false, { persist: false });
      setGlobalSearchCollapsed(false, { persist: false });
    });
    elements.globalSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void performGlobalSearch(elements.globalSearchInput.value);
      }
    });
  }
  if (elements.globalSearchCurrentButton) {
    elements.globalSearchCurrentButton.addEventListener("click", async () => {
      setGlobalSearchCollapsed(false, { persist: false });
      await useCurrentLocation();
      if (state.currentLocation) {
        const currentPlace = buildCurrentLocationPlace(state.currentLocation);
        if (elements.globalSearchInput) {
          elements.globalSearchInput.value = currentPlace.name;
        }
        state.globalSearchResults = [currentPlace];
        renderGlobalSearchResults();
        openPlaceActionSheet(currentPlace);
      }
    });
  }
  if (elements.globalSearchClearButton) {
    elements.globalSearchClearButton.addEventListener("click", () => {
      if (elements.globalSearchInput) {
        elements.globalSearchInput.value = "";
      }
      state.globalSearchResults = [];
      renderGlobalSearchResults();
      closePlaceActionSheet();
    });
  }

  if (elements.applyApiButton) elements.applyApiButton.addEventListener("click", applyApiBaseFromInput);
  if (elements.clearApiButton) elements.clearApiButton.addEventListener("click", clearCustomApiBase);
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

  document.getElementById("origin-search-button").addEventListener("click", () => void searchPlaces("origin"));
  document.getElementById("destination-search-button").addEventListener("click", () => void searchPlaces("destination"));
  if (elements.mobileSearchButton) elements.mobileSearchButton.addEventListener("click", () => void searchPlaces(state.activeTarget));
  if (elements.mobileCurrentButton) elements.mobileCurrentButton.addEventListener("click", () => void useCurrentLocation());
  if (elements.mobileOriginTargetButton) elements.mobileOriginTargetButton.addEventListener("click", () => setActiveTarget("origin"));
  if (elements.mobileDestinationTargetButton) elements.mobileDestinationTargetButton.addEventListener("click", () => setActiveTarget("destination"));
  document.getElementById("origin-current-button").addEventListener("click", () => void useCurrentLocation());
  document.getElementById("parse-button").addEventListener("click", () => void previewPreferences());
  document.getElementById("route-button").addEventListener("click", () => void requestRoute());
  document.getElementById("swap-button").addEventListener("click", swapPlaces);
  document.getElementById("clear-route-button").addEventListener("click", () => clearRoute());
  document.getElementById("download-route-button").addEventListener("click", downloadRoute);

  if (elements.assistantSendButton) elements.assistantSendButton.addEventListener("click", () => void sendAssistantMessage());
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
  if (elements.followLocationButton) elements.followLocationButton.addEventListener("click", () => setFollowCurrentLocation(!state.followCurrentLocation, { status: true }));
  if (elements.followLocationButtonDuplicate) elements.followLocationButtonDuplicate.addEventListener("click", () => setFollowCurrentLocation(!state.followCurrentLocation, { status: true }));

  elements.pickOriginButton.addEventListener("click", () => setMapPickMode("origin"));
  elements.pickDestinationButton.addEventListener("click", () => setMapPickMode("destination"));
  elements.stopPickingButton.addEventListener("click", () => setMapPickMode(null));

  elements.originInput.addEventListener("focus", () => { setActiveTarget("origin"); focusPanel("search"); });
  elements.destinationInput.addEventListener("focus", () => { setActiveTarget("destination"); focusPanel("search"); });
  elements.originInput.addEventListener("keydown", (event) => { if (event.key === "Enter") void searchPlaces("origin"); });
  elements.destinationInput.addEventListener("keydown", (event) => { if (event.key === "Enter") void searchPlaces("destination"); });

  if (elements.mobileSearchInput) {
    elements.mobileSearchInput.addEventListener("input", () => syncActiveTargetInputFromMobile());
    elements.mobileSearchInput.addEventListener("focus", () => {
      focusPanel("search");
      setTopPanelCollapsed(false, { persist: false });
    });
    elements.mobileSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void searchPlaces(state.activeTarget);
      }
    });
  }

  elements.profileSelect.addEventListener("change", () => { schedulePreferencePreview(); saveState(); });
  elements.preferencesInput.addEventListener("input", () => { schedulePreferencePreview(); saveState(); });

  if (elements.refreshFavoritesButton) elements.refreshFavoritesButton.addEventListener("click", () => void refreshFavorites());
  if (elements.googleLoginButton) elements.googleLoginButton.addEventListener("click", handleGoogleLoginClick);
  if (elements.contributionModeLocal) elements.contributionModeLocal.addEventListener("click", () => setContributionMode("local"));
  if (elements.contributionModeServer) elements.contributionModeServer.addEventListener("click", () => setContributionMode("server"));
  if (elements.contributionPerspectiveDrive) elements.contributionPerspectiveDrive.addEventListener("click", () => setContributionPerspective("car_front"));
  if (elements.contributionPerspectiveWalk) elements.contributionPerspectiveWalk.addEventListener("click", () => setContributionPerspective("walk"));
  if (elements.contributionStartButton) elements.contributionStartButton.addEventListener("click", () => void startContributionCapture());
  if (elements.contributionStopButton) elements.contributionStopButton.addEventListener("click", () => void finalizeContributionCapture());

  if (elements.placeActionBackdrop) elements.placeActionBackdrop.addEventListener("click", closePlaceActionSheet);
  if (elements.actionCloseButton) elements.actionCloseButton.addEventListener("click", closePlaceActionSheet);
  if (elements.actionSetOriginButton) {
    elements.actionSetOriginButton.addEventListener("click", () => {
      if (!state.selectedActionPlace) return;
      elements.originInput.value = state.selectedActionPlace.name;
      choosePlace("origin", state.selectedActionPlace);
      closePlaceActionSheet();
      setStatus("出発地を更新しました。", "success");
    });
  }
  if (elements.actionSetDestinationButton) {
    elements.actionSetDestinationButton.addEventListener("click", () => {
      if (!state.selectedActionPlace) return;
      elements.destinationInput.value = state.selectedActionPlace.name;
      choosePlace("destination", state.selectedActionPlace);
      closePlaceActionSheet();
      setStatus("目的地を更新しました。", "success");
    });
  }
  if (elements.actionFavoriteButton) elements.actionFavoriteButton.addEventListener("click", () => { if (state.selectedActionPlace) void saveFavoritePlace(state.selectedActionPlace); });
  if (elements.actionRouteButton) elements.actionRouteButton.addEventListener("click", () => { if (state.selectedActionPlace) void routeToPlace(state.selectedActionPlace, { startNavigation: false }); });
  if (elements.actionNavigateButton) elements.actionNavigateButton.addEventListener("click", () => { if (state.selectedActionPlace) void routeToPlace(state.selectedActionPlace, { startNavigation: true }); });

  map.on("click", handleMapClick);
  map.on("dragstart", () => {
    if (state.navigationStarted && state.followCurrentLocation) {
      setFollowCurrentLocation(false, { status: true });
    }
  });
}

async function legacy_initialize_2() {
  restoreState();
  ensureClientId();

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

  setStatus("Checking API connection...", "info");
  renderPanelState();
  renderFollowLocationButtons();
  renderContributionModeButtons();
  renderContributionPerspectiveButtons();
  clearContributionOverlay();
  renderGlobalSearchResults();
  renderFavorites();

  await detectApiBase({ quiet: false, force: true });
  startConnectionMonitor();
  await loadAppInfo();
  await loadNetworkInfo();
  await refreshFavorites({ quiet: true });

  if (!state.origin) choosePlace("origin", defaultOrigin, { clearRoute: false, persist: false });
  if (!state.destination) choosePlace("destination", defaultDestination, { clearRoute: false, persist: false });

  if (!elements.preferencesInput.value.trim()) {
    elements.preferencesInput.value = "坂を避ける / 信号が少ないルート";
  }

  await previewPreferences({ quiet: true });
  syncCurrentLocationMarker();

  if (state.route && state.route.path && state.route.path.length) {
    applyRoute(state.route, { persist: false, statusText: "Saved route restored." });
  } else {
    resetRouteOutput();
    fitToVisibleLayers();
    setStatus("Ready.", "success");
  }

  renderMapPickState();
  updateBusyState();
  renderConnectionState();
  renderNetworkInfo();
  renderAssistantPanel();
  renderFavoriteCount();
  saveState();
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

function renderFollowLocationButtons() {
  [elements.followLocationButton, elements.followLocationButtonDuplicate].filter(Boolean).forEach((button) => {
    button.textContent = state.followCurrentLocation ? "追尾 ON" : "追尾 OFF";
    button.classList.toggle("active-toggle", state.followCurrentLocation);
  });
}

function setFollowCurrentLocation(value, { persist = true, status = false } = {}) {
  state.followCurrentLocation = Boolean(value);
  renderFollowLocationButtons();
  if (state.followCurrentLocation) {
    followCurrentLocationOnMap({ force: true });
  }
  if (persist) {
    saveState();
  }
  if (status) {
    setStatus(state.followCurrentLocation ? "現在地の追尾を有効にしました。" : "現在地の追尾を停止しました。", "info");
  }
}

function renderContributionStatus(message, kind = "info", logText = "") {
  if (elements.contributionStatus) {
    elements.contributionStatus.textContent = message;
    elements.contributionStatus.className = `status-message ${kind}`;
  }
  if (elements.contributionLog && logText) {
    elements.contributionLog.textContent = logText;
  }
}

function renderContributionModeButtons() {
  if (elements.contributionModeLocal) elements.contributionModeLocal.classList.toggle("active-toggle", state.captureMode === "local");
  if (elements.contributionModeServer) elements.contributionModeServer.classList.toggle("active-toggle", state.captureMode === "server");
  if (elements.contributionStartButton) elements.contributionStartButton.disabled = Boolean(state.captureSession);
  if (elements.contributionStopButton) elements.contributionStopButton.disabled = !state.captureSession;
  if (elements.contributionUploadZipButton) elements.contributionUploadZipButton.disabled = !state.pendingContributionZipFile || !state.apiAvailable;
  renderContributionPerspectiveButtons();
}

function renderContributionPerspectiveButtons() {
  if (elements.contributionPerspectiveDrive) {
    elements.contributionPerspectiveDrive.classList.toggle("active-toggle", state.capturePerspective === "car_front");
    elements.contributionPerspectiveDrive.disabled = Boolean(state.captureSession);
  }
  if (elements.contributionPerspectiveWalk) {
    elements.contributionPerspectiveWalk.classList.toggle("active-toggle", state.capturePerspective === "walk");
    elements.contributionPerspectiveWalk.disabled = Boolean(state.captureSession);
  }
}

function renderContributionOverlay(items = [], { statusText = "" } = {}) {
  if (elements.contributionPreviewShell) {
    elements.contributionPreviewShell.classList.toggle("is-detecting", items.length > 0);
  }
  if (elements.contributionOverlayStatus) {
    elements.contributionOverlayStatus.textContent = statusText || (items.length ? `認識中: ${items.length}種類` : "認識待機中");
  }
  if (!elements.contributionOverlayTags) {
    return;
  }
  elements.contributionOverlayTags.innerHTML = "";
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "overlay-tag";
    chip.textContent = typeof item.count === "number" && item.count > 1 ? `${item.label} ×${item.count}` : item.label;
    elements.contributionOverlayTags.append(chip);
  });
}

function clearContributionOverlay() {
  renderContributionOverlay([], {
    statusText: state.capturePerspective === "walk" ? "徒歩モード / 認識待機中" : "車前方モード / 認識待機中",
  });
}

function summarizeContributionDetections(relevant) {
  const labelMap = {
    car: "車",
    truck: "トラック",
    bus: "バス",
    "traffic light": "信号",
    motorcycle: "バイク",
    bicycle: "自転車",
    "stop sign": "停止標識",
    person: "歩行者",
  };
  const counts = new Map();
  relevant.forEach((item) => {
    const label = labelMap[item.class] || item.class;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

function renderSummary(summary) {
  const distanceText = summary && typeof summary.distance_km === "number" ? `${summary.distance_km.toFixed(2)} km` : "-";
  const durationText = summary && typeof summary.duration_min === "number" ? `${summary.duration_min} 分` : "-";
  elements.routeSummaryLabel.textContent = `${distanceText} / ${durationText}`;
  elements.distanceValue.textContent = distanceText;
  elements.durationValue.textContent = durationText;
  elements.elevationValue.textContent = summary ? `${summary.elevation_gain_m} m` : "-";
  elements.trafficValue.textContent = summary ? `${summary.traffic_lights_estimate} 箇所` : "-";
  elements.maxGradientValue.textContent = summary ? `${summary.max_gradient_percent} %` : "-";
  elements.avgGradientValue.textContent = summary ? `${summary.average_gradient_percent} %` : "-";
  elements.arrivalValue.textContent = summary ? summary.estimated_arrival : "-";
  if (elements.costValue) {
    elements.costValue.textContent =
      summary && typeof summary.estimated_cost_yen === "number" ? `約${summary.estimated_cost_yen.toLocaleString("ja-JP")}円` : "約0円";
  }
  if (elements.ferryValue) {
    elements.ferryValue.textContent = summary && summary.includes_ferry ? `${summary.ferry_segments || 1} 区間` : "なし";
  }
}

function resetRouteOutput() {
  if (routeLayer) {
    routeLayer.remove();
    routeLayer = null;
  }

  state.route = null;
  state.routeWaypoints = [];
  state.navigationStarted = false;
  state.navigationIndex = 0;
  elements.engineWarning.textContent = `ルートエンジン: ${state.appInfo.engine} / バージョン ${state.appInfo.version}`;
  elements.routeSummaryLabel.textContent = "未生成";
  elements.distanceValue.textContent = "-";
  elements.durationValue.textContent = "-";
  elements.elevationValue.textContent = "-";
  elements.trafficValue.textContent = "-";
  elements.maxGradientValue.textContent = "-";
  elements.avgGradientValue.textContent = "-";
  elements.arrivalValue.textContent = "-";
  if (elements.costValue) elements.costValue.textContent = "-";
  if (elements.ferryValue) elements.ferryValue.textContent = "-";
  elements.routeHighlights.innerHTML = "";
  elements.stepsList.innerHTML = "";
  renderNavigation();
}

async function requestRoute() {
  if (!state.origin || !state.destination) {
    switchPanel("search", { expand: true, persist: false });
    setStatus("出発地と目的地の両方を選んでください。", "warning");
    throw new Error("Origin and destination are required.");
  }

  switchPanel("route", { expand: true, persist: false });
  setStatus("ルートを作成しています...", "info");

  try {
    const route = await withBusy(() =>
      requestApiJson(
        "/api/routes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: state.origin,
            destination: state.destination,
            waypoints: Array.isArray(state.routeWaypoints) ? state.routeWaypoints : [],
            profile: elements.profileSelect.value,
            preferences_text: elements.preferencesInput.value.trim(),
          }),
        },
        { timeoutMs: 30000 },
      ),
    );
    applyRoute(route);
    return route;
  } catch (error) {
    console.error(error);
    setStatus(error.message || "ルート生成に失敗しました。", "error");
    throw error;
  }
}

function applyRoute(route, options = {}) {
  const settings = { persist: true, statusText: "ルートを更新しました。", ...options };
  state.route = route;
  state.routeWaypoints = Array.isArray(route.waypoints) ? route.waypoints : [];
  state.navigationStarted = false;
  state.navigationIndex = 0;

  elements.engineWarning.textContent = `ルートエンジン: ${route.engine} / ${route.warning || "道路に沿って案内"}`;
  renderPreferenceTags(route.parsed_preferences);
  renderStaticChips(elements.routeHighlights, route.highlights || ["ルート準備完了"]);
  renderSummary(route.summary);
  renderSteps(route.steps || []);
  renderNavigation();

  if (routeLayer) routeLayer.remove();
  const latLngs = (route.path || []).map((point) => [point.lat, point.lon]);
  routeLayer = L.polyline(latLngs, { color: "#3b82f6", weight: 6, opacity: 0.9 }).addTo(map);
  fitToVisibleLayers();
  switchPanel("route", { expand: true, persist: false });
  if (state.currentLocation && state.followCurrentLocation) {
    followCurrentLocationOnMap({ force: true });
  }
  if (settings.persist) saveState();
  setStatus(settings.statusText, "success");
}

function clearRoute(options = {}) {
  const settings = { keepStatus: false, persist: true, ...options };
  resetRouteOutput();
  if (settings.persist) {
    saveState();
  }
  if (!settings.keepStatus) {
    switchPanel("search", { expand: !isSmallViewport(), persist: false });
    setStatus("ルートを解除しました。", "info");
  }
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
    elements.navCurrent.textContent = "ルート生成後に案内を表示します。";
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
    <small>残りの道のり ${remainingDistance} km</small>
  `;

  Array.from(elements.stepsList.children).forEach((item, index) => {
    item.classList.toggle("active", state.navigationStarted && index === currentIndex);
  });
}

function toggleNavigation() {
  if (!state.route || !state.route.steps || !state.route.steps.length) {
    setStatus("案内できるルートがありません。", "warning");
    return;
  }

  state.navigationStarted = !state.navigationStarted;
  if (state.navigationStarted && state.navigationIndex >= state.route.steps.length) {
    state.navigationIndex = 0;
  }
  if (state.navigationStarted) {
    setFollowCurrentLocation(true, { persist: false, status: false });
    followCurrentLocationOnMap({ force: true });
  }

  renderNavigation();
  saveState();
  setStatus(state.navigationStarted ? "案内を開始しました。" : "案内を停止しました。", state.navigationStarted ? "success" : "info");
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
  state.routeWaypoints = Array.isArray(response.waypoints) ? response.waypoints : [];

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
      statusText: "AI がルートを更新しました。",
    });
    switchPanel("route", { expand: true, persist: false });
  } else {
    saveState();
  }

  pushAssistantMessage("assistant", response.reply, response.actions || []);
  setStatus(response.reply, response.available === false ? "warning" : response.route ? "success" : "info");
}

async function sendAssistantMessage(prefilledMessage = null) {
  const rawMessage = prefilledMessage !== null && prefilledMessage !== undefined ? prefilledMessage : elements.assistantInput.value || "";
  const message = rawMessage.trim();
  if (!message) {
    setStatus("AI に送るメッセージを入力してください。", "warning");
    return;
  }

  pushAssistantMessage("user", message);
  elements.assistantInput.value = "";
  focusPanel("ai");
  setStatus("AI に問い合わせています...", "info");

  try {
    const response = await withBusy(() =>
      requestApiJson(
        "/api/assistant",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, context: buildAssistantContext() }),
        },
        { timeoutMs: assistantRequestTimeoutMs },
      ),
    );
    await applyAssistantResponse(response);
  } catch (error) {
    console.error(error);
    const isTimeout = Boolean(error && (error.isTimeout || error.name === "AbortError" || /timeout|timed out|aborted/i.test(error.message || "")));
    const reply = isTimeout
      ? "AI の返答が長引いたため、いったん中断しました。少し短い文で送り直してください。"
      : error.message || "AI への送信に失敗しました。";
    pushAssistantMessage("assistant", reply, []);
    setStatus(reply, isTimeout ? "warning" : "error");
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
  setStatus(`条件に「${value}」を追加しました。`, "success");
}

function setActiveTarget(target) {
  state.activeTarget = target;
  elements.activeTargetLabel.textContent = `入力先: ${target === "origin" ? "出発地" : "目的地"}`;
  syncMobileSearchInput();
}

async function searchPlaces(target, { query = null, autoSelectFirst = false } = {}) {
  setActiveTarget(target);
  switchPanel("search", { expand: true, persist: false });
  const input = inputForTarget(target);
  const typedValue =
    query !== null && query !== undefined
      ? query
      : isSmallViewport() && elements.mobileSearchInput
        ? elements.mobileSearchInput.value
        : input.value;
  const searchText = typedValue.trim();

  if (!searchText) {
    setStatus("検索語を入力してください。", "warning");
    return;
  }

  input.value = searchText;
  syncMobileSearchInput();
  setStatus(`${target === "origin" ? "出発地" : "目的地"}を検索しています...`, "info");

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
      setStatus(`${target === "origin" ? "出発地" : "目的地"}を更新しました。`, "success");
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
    empty.textContent = "候補がありません。";
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-item";
    button.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.description || item.category || "")}</span>
      <small class="result-meta">${escapeHtml(buildPlaceMeta(item))}</small>
    `;
    button.addEventListener("click", () => {
      choosePlace(target, item);
      clearResults(target);
      openPlaceActionSheet(item);
    });
    container.append(button);
  });
}

async function refreshFavorites({ quiet = false } = {}) {
  ensureClientId();
  if (!state.apiAvailable) {
    state.favorites = [];
    renderFavorites();
    return;
  }
  try {
    const payload = await requestApiJson(`/api/favorites?client_id=${encodeURIComponent(state.clientId)}`, {}, { quiet, timeoutMs: 10000 });
    state.favorites = payload.items || [];
    renderFavorites();
  } catch (error) {
    console.warn(error);
    if (!quiet) {
      setStatus(error.message || "お気に入りの取得に失敗しました。", "error");
    }
  }
}

function renderFavorites() {
  renderFavoriteCount();
  if (!elements.favoritesList) return;
  elements.favoritesList.innerHTML = "";

  if (!state.favorites.length) {
    const empty = document.createElement("p");
    empty.className = "result-empty";
    empty.textContent = "お気に入りはまだありません。";
    elements.favoritesList.append(empty);
    return;
  }

  state.favorites.forEach((favorite) => {
    const row = document.createElement("div");
    row.className = "selected-card";
    row.innerHTML = `<strong>${escapeHtml((favorite.label || (favorite.place && favorite.place.name) || "Favorite"))}</strong><span>${escapeHtml((favorite.place && (favorite.place.description || favorite.place.category)) || "")}</span><small class="result-meta">${favorite.ip_match ? "IP一致" : "IP差分あり"}</small>`;
    const actions = document.createElement("div");
    actions.className = "assistant-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "secondary compact-button";
    openButton.textContent = "開く";
    openButton.addEventListener("click", () => openPlaceActionSheet(favorite.place));
    actions.append(openButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary compact-button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", async () => {
      try {
        await requestApiJson(`/api/favorites/${encodeURIComponent(favorite.id)}?client_id=${encodeURIComponent(state.clientId)}`, { method: "DELETE" }, { timeoutMs: 10000 });
        await refreshFavorites({ quiet: true });
      } catch (error) {
        setStatus(error.message || "お気に入りの削除に失敗しました。", "error");
      }
    });
    actions.append(deleteButton);

    row.append(actions);
    elements.favoritesList.append(row);
  });
}

async function saveFavoritePlace(place) {
  ensureClientId();
  if (!state.apiAvailable) {
    setStatus("お気に入り保存には API 接続が必要です。", "warning");
    return;
  }
  try {
    const normalizedPlace = normalizePlace(place);
    const response = await requestApiJson(
      "/api/favorites",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: state.clientId, place: normalizedPlace, label: normalizedPlace.name }),
      },
      { timeoutMs: 10000 },
    );
    state.favorites = response.items || [];
    renderFavorites();
    closePlaceActionSheet();
    setStatus("お気に入りに保存しました。", "success");
  } catch (error) {
    setStatus(error.message || "お気に入りの保存に失敗しました。", "error");
  }
}

function handleGoogleLoginClick() {
  if (elements.googleLoginStatus) {
    elements.googleLoginStatus.textContent = "未接続";
  }
  setStatus("Google ログイン本体はまだ未接続です。OAuth 用のクライアント ID と公開 URL が必要です。", "info");
}

function buildContributionMetadata(session) {
  return {
    client_id: state.clientId,
    mode: state.captureMode,
    capture_perspective: state.capturePerspective,
    started_at: session.startedAt,
    stopped_at: new Date().toISOString(),
    notes: session.notes || "",
    route: state.route ? { summary: state.route.summary, highlights: state.route.highlights, waypoints: state.routeWaypoints || [] } : null,
    current_location: state.currentLocation,
    detection_note: "road_width_estimate_m is not implemented yet, so it is null.",
  };
}

async function buildContributionArchive(session) {
  const JSZip = await ensureJSZipLib();
  const zip = new JSZip();
  const metadata = buildContributionMetadata(session);
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  zip.file("positions.json", JSON.stringify(session.positions, null, 2));
  zip.file("orientation.json", JSON.stringify(session.orientations, null, 2));
  zip.file("detections.json", JSON.stringify(session.detections, null, 2));
  if (session.videoBlob) {
    zip.file("video.webm", session.videoBlob);
  }
  return zip.generateAsync({ type: "blob" });
}

async function createContributionServerSession(session) {
  const response = await requestApiJson(
    "/api/contributions/session/start",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: state.clientId,
        mode: "server",
        metadata: buildContributionMetadata(session),
      }),
    },
    { timeoutMs: contributionUploadTimeoutMs },
  );
  session.serverSessionId = response.session_id;
  session.serverUploadQueue = Promise.resolve();
  session.serverChunkIndex = 0;
  session.serverUploadError = null;
  return response;
}

function queueContributionChunkUpload(session, blob) {
  if (!session.serverSessionId) {
    return Promise.resolve();
  }
  const chunkIndex = session.serverChunkIndex++;
  session.serverUploadQueue = session.serverUploadQueue.then(async () => {
    const formData = new FormData();
    formData.append("client_id", state.clientId);
    formData.append("chunk_index", String(chunkIndex));
    formData.append("file", blob, `chunk-${chunkIndex}.webm`);
    try {
      await requestApiJson(
        `/api/contributions/session/${encodeURIComponent(session.serverSessionId)}/chunk`,
        { method: "POST", body: formData },
        { timeoutMs: contributionUploadTimeoutMs, quiet: true },
      );
    } catch (error) {
      session.serverUploadError = error;
      appendContributionLog(`チャンク ${chunkIndex} の送信に失敗: ${error.message || error}`);
      throw error;
    }
  });
  return session.serverUploadQueue;
}

function updateContributionZipStatus(message) {
  if (elements.contributionZipStatus) {
    elements.contributionZipStatus.textContent = message;
  }
  renderContributionModeButtons();
}

async function handleContributionZipSelected(file) {
  state.pendingContributionZipFile = file || null;
  if (!file) {
    updateContributionZipStatus("送信前に ZIP を検証します。");
    return;
  }
  updateContributionZipStatus(`選択中: ${file.name} (${Math.round(file.size / 1024)} KB)`);
}

async function uploadSelectedContributionZip() {
  ensureClientId();
  const file = state.pendingContributionZipFile;
  if (!file) {
    updateContributionZipStatus("先に ZIP を選択してください。");
    return;
  }
  if (!state.apiAvailable) {
    updateContributionZipStatus("ZIP 送信には API 接続が必要です。");
    return;
  }

  try {
    updateContributionZipStatus("ZIP を検証しています...");
    const validateForm = new FormData();
    validateForm.append("file", file, file.name);
    const validation = await requestApiJson("/api/contributions/upload/validate", { method: "POST", body: validateForm }, { timeoutMs: contributionUploadTimeoutMs });
    if (!validation.valid) {
      updateContributionZipStatus(`ZIP 検証で問題が見つかりました: ${(validation.issues || []).join(" / ")}`);
      return;
    }

    updateContributionZipStatus(`ZIP 検証OK: ${(validation.detected_files || []).join(", ")}`);
    const formData = new FormData();
    formData.append("client_id", state.clientId);
    formData.append("mode", "server");
    formData.append("metadata", JSON.stringify({ manual_zip_upload: true, uploaded_at: new Date().toISOString() }));
    formData.append("file", file, file.name);
    const response = await requestApiJson("/api/contributions/upload", { method: "POST", body: formData }, { timeoutMs: contributionUploadTimeoutMs });
    updateContributionZipStatus(`ZIP を送信しました: ${response.filename}`);
    renderContributionStatus("ZIP をサーバーへ送信しました。", "success", response.path || "");
  } catch (error) {
    console.error(error);
    updateContributionZipStatus(error.message || "ZIP の送信に失敗しました。");
  }
}

async function startContributionCapture() {
  ensureClientId();
  if (state.captureSession) return;
  if (!window.isSecureContext && !isLoopbackHost(location.hostname)) {
    renderContributionStatus("カメラ利用は HTTPS または localhost でのみ使えます。", "warning");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    renderContributionStatus("この端末ではカメラ録画に対応していません。", "error");
    return;
  }

  try {
    const videoConstraints =
      state.capturePerspective === "walk"
        ? { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }
        : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } };
    const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });
    const chunks = [];
    const session = {
      stream,
      recorder,
      chunks,
      positions: [],
      orientations: [],
      detections: [],
      startedAt: new Date().toISOString(),
      notes: elements.contributionNotes ? elements.contributionNotes.value.trim() : "",
      videoBlob: null,
      stopPromise: null,
      detector: null,
      perspective: state.capturePerspective,
      serverSessionId: null,
      serverUploadQueue: Promise.resolve(),
      serverChunkIndex: 0,
      serverUploadError: null,
    };

    if (state.captureMode === "server") {
      if (!state.apiAvailable) {
        throw new Error("サーバー直接送信には API 接続が必要です。");
      }
      await createContributionServerSession(session);
      appendContributionLog(`サーバー送信セッションを開始: ${session.serverSessionId}`);
    }

    session.stopPromise = new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          session.videoBlob = state.captureMode === "server" ? null : new Blob(chunks, { type: recorder.mimeType || "video/webm" });
          resolve();
        },
        { once: true },
      );
    });
    recorder.addEventListener("dataavailable", (event) => {
      if (!event.data || !event.data.size) return;
      if (state.captureMode === "server" && session.serverSessionId) {
        void queueContributionChunkUpload(session, event.data);
        return;
      }
      chunks.push(event.data);
    });
    recorder.start(state.captureMode === "server" ? 1500 : 1000);

    if (elements.contributionPreview) {
      elements.contributionPreview.srcObject = stream;
      elements.contributionPreview.play().catch(() => {});
    }
    clearContributionOverlay();

    if (navigator.geolocation) {
      contributionPositionWatchId = navigator.geolocation.watchPosition(
        (position) => {
          session.positions.push({
            at: new Date().toISOString(),
            lat: Number(position.coords.latitude.toFixed(6)),
            lon: Number(position.coords.longitude.toFixed(6)),
            accuracy_m: Number((position.coords.accuracy || 0).toFixed(1)),
            speed_mps: position.coords.speed,
          });
        },
        (error) => console.warn(error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
      );
    }

    contributionOrientationHandler = (event) => {
      const heading = extractHeadingFromOrientation(event);
      session.orientations.push({
        at: new Date().toISOString(),
        heading,
        alpha: typeof event.alpha === "number" ? Number(event.alpha.toFixed(2)) : null,
        beta: typeof event.beta === "number" ? Number(event.beta.toFixed(2)) : null,
        gamma: typeof event.gamma === "number" ? Number(event.gamma.toFixed(2)) : null,
      });
    };
    window.addEventListener("deviceorientation", contributionOrientationHandler, true);
    window.addEventListener("deviceorientationabsolute", contributionOrientationHandler, true);

    state.captureSession = session;
    renderContributionModeButtons();
    renderContributionStatus(
      state.capturePerspective === "walk" ? "徒歩モードで記録を開始しました。" : "車前方モードで記録を開始しました。",
      "success",
    );
    appendContributionLog(
      `${state.capturePerspective === "walk" ? "徒歩" : "車前方"}モードで記録開始 / ${state.captureMode === "server" ? "リアルタイム送信" : "ローカル保存"}`,
    );

    ensureContributionDetector()
      .then((detector) => {
        session.detector = detector;
        if (detector) {
          appendContributionLog("物体認識モデルを読み込みました。");
          clearContributionOverlay();
        }
      })
      .catch((error) => {
        console.warn(error);
        appendContributionLog("物体認識モデルの読み込みに失敗しました。");
      });

    contributionDetectionTimer = setInterval(() => {
      void detectContributionFrame(session);
    }, state.capturePerspective === "walk" ? 1200 : 1800);
  } catch (error) {
    console.error(error);
    renderContributionStatus(error.message || "協力モードの開始に失敗しました。", "error");
  }
}

async function finalizeContributionCapture() {
  const session = state.captureSession;
  if (!session) return;

  renderContributionStatus("保存処理を進めています。", "info");
  stopContributionSensors();
  if (session.recorder && session.recorder.state !== "inactive") session.recorder.stop();
  if (session.stream) session.stream.getTracks().forEach((track) => track.stop());
  await session.stopPromise;

  try {
    if (state.captureMode === "server" && session.serverSessionId) {
      await session.serverUploadQueue;
      if (session.serverUploadError) {
        throw session.serverUploadError;
      }
      const response = await requestApiJson(
        `/api/contributions/session/${encodeURIComponent(session.serverSessionId)}/finish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: state.clientId,
            metadata: buildContributionMetadata(session),
          }),
        },
        { timeoutMs: contributionUploadTimeoutMs },
      );
      renderContributionStatus(
        `サーバーに保存しました: ${response.chunks_received} チャンク / ${Math.round((response.total_bytes || 0) / 1024)} KB`,
        "success",
        response.path || "",
      );
    } else {
      const archiveBlob = await buildContributionArchive(session);
      const filename = `contribution-${new Date().toISOString().replaceAll(":", "-")}.zip`;
      downloadBlob(archiveBlob, filename);
      renderContributionStatus("ローカルに ZIP 保存しました。", "success");
    }
  } catch (error) {
    console.error(error);
    renderContributionStatus(error.message || "保存に失敗しました。", "warning");
  } finally {
    if (elements.contributionPreview) elements.contributionPreview.srcObject = null;
    state.captureSession = null;
    renderContributionModeButtons();
    clearContributionOverlay();
  }
}

function saveState() {
  const payload = {
    origin: state.origin,
    destination: state.destination,
    route: state.route,
    routeWaypoints: state.routeWaypoints,
    currentLocation: state.currentLocation,
    networkInfo: state.networkInfo,
    profile: elements.profileSelect.value,
    preferences: elements.preferencesInput.value,
    activeTarget: state.activeTarget,
    customApiBase: state.customApiBase,
    assistantMessages: state.assistantMessages,
    assistantModel: state.assistantModel,
    activePanel: state.activePanel,
    topPanelCollapsed: state.topPanelCollapsed,
    globalSearchCollapsed: state.globalSearchCollapsed,
    sheetCollapsed: state.sheetCollapsed,
    clientId: state.clientId,
    followCurrentLocation: state.followCurrentLocation,
    captureMode: state.captureMode,
    capturePerspective: state.capturePerspective,
  };
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

function restoreState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    elements.originInput.value = defaultOrigin.name;
    elements.destinationInput.value = defaultDestination.name;
    elements.profileSelect.value = "walk";
    ensureClientId();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.currentLocation = parsed.currentLocation || null;
    state.route = parsed.route || null;
    state.routeWaypoints = Array.isArray(parsed.routeWaypoints) ? parsed.routeWaypoints : [];
    state.networkInfo = parsed.networkInfo || null;
    state.customApiBase = normalizeApiBase(parsed.customApiBase || "");
    state.assistantMessages = Array.isArray(parsed.assistantMessages) ? parsed.assistantMessages.slice(-12) : [];
    state.assistantModel = parsed.assistantModel || "Ollama";
    state.activePanel = ["search", "route", "ai", "access", "settings"].includes(parsed.activePanel) ? parsed.activePanel : "search";
    state.topPanelCollapsed = typeof parsed.topPanelCollapsed === "boolean" ? parsed.topPanelCollapsed : window.matchMedia("(max-width: 720px)").matches;
    state.globalSearchCollapsed = typeof parsed.globalSearchCollapsed === "boolean" ? parsed.globalSearchCollapsed : false;
    state.sheetCollapsed = typeof parsed.sheetCollapsed === "boolean" ? parsed.sheetCollapsed : window.matchMedia("(max-width: 720px)").matches;
    state.followCurrentLocation = typeof parsed.followCurrentLocation === "boolean" ? parsed.followCurrentLocation : true;
    state.captureMode = parsed.captureMode === "server" ? "server" : "local";
    state.capturePerspective = parsed.capturePerspective === "walk" ? "walk" : "car_front";
    state.clientId = parsed.clientId || localStorage.getItem(clientIdStorageKey) || "";
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

  ensureClientId();
}

async function initialize() {
  restoreState();
  ensureClientId();

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

  setStatus("API 接続を確認しています...", "info");
  renderPanelState();
  renderFollowLocationButtons();
  renderContributionModeButtons();
  renderContributionPerspectiveButtons();
  clearContributionOverlay();
  renderGlobalSearchResults();
  renderFavorites();
  updateContributionZipStatus("送信前に ZIP を検証します。");

  await detectApiBase({ quiet: false, force: true });
  startConnectionMonitor();
  await loadAppInfo();
  await loadNetworkInfo();
  await refreshFavorites({ quiet: true });

  if (!state.origin) choosePlace("origin", defaultOrigin, { clearRoute: false, persist: false });
  if (!state.destination) choosePlace("destination", defaultDestination, { clearRoute: false, persist: false });
  if (!elements.preferencesInput.value.trim()) {
    elements.preferencesInput.value = "坂を避ける / 信号が少ない";
  }

  await previewPreferences({ quiet: true });
  syncCurrentLocationMarker();

  if (state.route && state.route.path && state.route.path.length) {
    applyRoute(state.route, { persist: false, statusText: "保存済みルートを復元しました。" });
  } else {
    resetRouteOutput();
    fitToVisibleLayers();
    setStatus("準備完了です。", "success");
  }

  renderMapPickState();
  updateBusyState();
  renderConnectionState();
  renderNetworkInfo();
  renderAssistantPanel();
  renderFavoriteCount();
  saveState();
}

function attachExtraContributionEventHandlers() {
  if (elements.contributionSelectZipButton) {
    elements.contributionSelectZipButton.addEventListener("click", () => {
      if (elements.contributionZipInput) {
        elements.contributionZipInput.click();
      }
    });
  }
  if (elements.contributionZipInput) {
    elements.contributionZipInput.addEventListener("change", (event) => {
      const [file] = Array.from(event.target.files || []);
      void handleContributionZipSelected(file || null);
    });
  }
  if (elements.contributionUploadZipButton) {
    elements.contributionUploadZipButton.addEventListener("click", () => void uploadSelectedContributionZip());
  }
}

attachExtraContributionEventHandlers();

function attachExtraStatusFixHandlers() {
  if (elements.actionSetOriginButton) {
    elements.actionSetOriginButton.addEventListener("click", () => {
      if (state.selectedActionPlace) {
        setStatus("出発地を更新しました。", "success");
      }
    });
  }
  if (elements.actionSetDestinationButton) {
    elements.actionSetDestinationButton.addEventListener("click", () => {
      if (state.selectedActionPlace) {
        setStatus("目的地を更新しました。", "success");
      }
    });
  }
}

attachExtraStatusFixHandlers();
