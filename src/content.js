(function () {
  const ROOT_ID = "ld-drawer-root";
  const PAGE_OPEN_CLASS = "ld-drawer-page-open";
  const PAGE_IFRAME_OPEN_CLASS = "ld-drawer-page-iframe-open";
  const ACTIVE_LINK_CLASS = "ld-drawer-topic-link-active";
  const IFRAME_MODE_CLASS = "ld-drawer-iframe-mode";
  const SETTINGS_KEY = "ld-drawer-settings-v1";
  const LOAD_MORE_BATCH_SIZE = 20;
  const LOAD_MORE_TRIGGER_OFFSET = 240;
  const IMAGE_PREVIEW_SCALE_MIN = 1;
  const IMAGE_PREVIEW_SCALE_MAX = 4;
  const IMAGE_PREVIEW_SCALE_STEP = 0.2;
  const DEFAULT_SETTINGS = {
    previewMode: "smart",
    postMode: "all",
    replyOrder: "default",
    drawerWidth: "medium",
    drawerWidthCustom: 720,
    drawerMode: "push"
  };
  const DRAWER_WIDTHS = {
    narrow: "clamp(320px, 34vw, 680px)",
    medium: "clamp(360px, 42vw, 920px)",
    wide: "clamp(420px, 52vw, 1200px)"
  };
  const LIST_ROW_SELECTOR = [
    "tr.topic-list-item",
    ".topic-list-item",
    ".latest-topic-list-item",
    "tbody.topic-list-body tr"
  ].join(", ");
  const PRIMARY_TOPIC_LINK_SELECTOR = [
    "a.title",
    ".main-link a.raw-topic-link",
    ".main-link a.title",
    ".search-link",
    ".search-result-topic a",
    ".user-stream .title a",
    ".user-main .item .title a"
  ].join(", ");
  const ENTRY_CONTAINER_SELECTOR = [
    LIST_ROW_SELECTOR,
    ".search-result",
    ".fps-result",
    ".user-stream .item",
    ".user-main .item"
  ].join(", ");
  const MAIN_CONTENT_SELECTOR = "#main-outlet";
  const EXCLUDED_LINK_CONTEXT_SELECTOR = [
    ".cooked",
    ".topic-post",
    ".topic-body",
    ".topic-map",
    ".timeline-container",
    "#reply-control",
    ".d-editor-container",
    ".composer-popup",
    ".select-kit",
    ".modal",
    ".menu-panel",
    ".popup-menu",
    ".user-card",
    ".group-card"
  ].join(", ");

  const state = {
    root: null,
    header: null,
    title: null,
    meta: null,
    drawerBody: null,
    content: null,
    replyButton: null,
    replyPanel: null,
    replyPanelTitle: null,
    replyTextarea: null,
    replySubmitButton: null,
    replyCancelButton: null,
    replyStatus: null,
    imagePreview: null,
    imagePreviewImage: null,
    imagePreviewCloseButton: null,
    imagePreviewScale: 1,
    openInTab: null,
    settingsPanel: null,
    settingsCard: null,
    settingsCloseButton: null,
    settingsToggle: null,
    prevButton: null,
    nextButton: null,
    resizeHandle: null,
    activeLink: null,
    currentUrl: "",
    currentEntryElement: null,
    currentEntryKey: "",
    currentTopicIdHint: null,
    currentTopicTrackingKey: "",
    currentViewTracked: false,
    currentTrackRequest: null,
    currentTrackRequestKey: "",
    currentResolvedTargetPostNumber: null,
    currentFallbackTitle: "",
    currentTopic: null,
    currentLatestRepliesTopic: null,
    currentTargetSpec: null,
    replyTargetPostNumber: null,
    replyTargetLabel: "",
    abortController: null,
    loadMoreAbortController: null,
    replyAbortController: null,
    lastLocation: location.href,
    settings: loadSettings(),
    isResizing: false,
    isLoadingMorePosts: false,
    isReplySubmitting: false,
    loadMoreError: "",
    loadMoreStatus: null,
    hasShownPreviewNotice: false
  };

  function init() {
    ensureDrawer();
    bindEvents();
    watchLocationChanges();
  }

  function ensureDrawer() {
    if (state.root) {
      return;
    }

    const root = document.createElement("aside");
    root.id = ROOT_ID;
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div class="ld-drawer-resize-handle" role="separator" aria-label="调整抽屉宽度" aria-orientation="vertical" title="拖动调整宽度"></div>
      <div class="ld-drawer-shell">
        <div class="ld-drawer-header">
          <div class="ld-drawer-title-group">
            <div class="ld-drawer-eyebrow">LINUX DO 预览</div>
            <h2 class="ld-drawer-title">点击帖子标题开始预览</h2>
          </div>
          <div class="ld-drawer-toolbar">
            <div class="ld-drawer-meta"></div>
            <div class="ld-drawer-actions">
              <button class="ld-drawer-nav" type="button" data-nav="prev">上一帖</button>
              <button class="ld-drawer-nav" type="button" data-nav="next">下一帖</button>
              <button class="ld-drawer-settings-toggle" type="button" aria-expanded="false" aria-controls="ld-drawer-settings">选项</button>
              <a class="ld-drawer-link" href="https://linux.do/latest" target="_blank" rel="noopener noreferrer">新标签打开</a>
              <button class="ld-drawer-close" type="button" aria-label="关闭抽屉">关闭</button>
            </div>
          </div>
        </div>
        <div class="ld-drawer-settings" id="ld-drawer-settings" hidden>
          <div class="ld-drawer-settings-card" role="dialog" aria-modal="true" aria-label="预览选项">
            <div class="ld-settings-head">
              <div class="ld-settings-title">预览选项</div>
              <button class="ld-settings-close" type="button" aria-label="关闭预览选项">关闭</button>
            </div>
            <label class="ld-setting-field">
              <span class="ld-setting-label">预览模式</span>
              <select class="ld-setting-control" data-setting="previewMode">
                <option value="smart">智能预览</option>
                <option value="iframe">整页模式</option>
              </select>
            </label>
            <label class="ld-setting-field">
              <span class="ld-setting-label">内容范围</span>
              <select class="ld-setting-control" data-setting="postMode">
                <option value="all">完整主题</option>
                <option value="first">仅首帖</option>
              </select>
            </label>
            <label class="ld-setting-field">
              <span class="ld-setting-label">回复排序</span>
              <select class="ld-setting-control" data-setting="replyOrder">
                <option value="default">默认顺序</option>
                <option value="latestFirst">首帖 + 最新回复</option>
              </select>
              <span class="ld-setting-hint">长帖下会优先显示最新一批回复，不代表把整帖一次性完整倒序</span>
            </label>
            <label class="ld-setting-field">
              <span class="ld-setting-label">抽屉模式</span>
              <select class="ld-setting-control" data-setting="drawerMode">
                <option value="push">挤压模式</option>
                <option value="overlay">浮层模式</option>
              </select>
              <span class="ld-setting-hint">浮层模式下抽屉悬浮于页面上方，不压缩原有内容</span>
            </label>
            <label class="ld-setting-field">
              <span class="ld-setting-label">抽屉宽度</span>
              <select class="ld-setting-control" data-setting="drawerWidth">
                <option value="narrow">窄</option>
                <option value="medium">中</option>
                <option value="wide">宽</option>
                <option value="custom">自定义</option>
              </select>
              <span class="ld-setting-hint">也可以直接拖动抽屉左边边缘</span>
            </label>
            <button class="ld-settings-reset" type="button">恢复默认</button>
          </div>
        </div>
        <div class="ld-drawer-body">
          <div class="ld-drawer-content"></div>
        </div>
        <button class="ld-drawer-reply-fab" type="button" aria-expanded="false" aria-controls="ld-drawer-reply-panel" aria-label="回复这个主题" title="回复这个主题">
          <span class="ld-drawer-reply-fab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 12.5c0-4.14 3.36-7.5 7.5-7.5h7a1.5 1.5 0 0 1 0 3h-7A4.5 4.5 0 0 0 7 12.5v1.38l1.44-1.44a1.5 1.5 0 0 1 2.12 2.12l-4 4a1.5 1.5 0 0 1-2.12 0l-4-4a1.5 1.5 0 1 1 2.12-2.12L4 13.88V12.5Z" fill="currentColor"></path>
            </svg>
          </span>
          <span class="ld-drawer-reply-fab-label">回复</span>
        </button>
        <div class="ld-drawer-reply-panel" id="ld-drawer-reply-panel" hidden>
          <div class="ld-reply-panel-head">
            <div class="ld-reply-panel-title">回复主题</div>
            <button class="ld-reply-panel-close" type="button" aria-label="关闭快速回复">关闭</button>
          </div>
          <textarea class="ld-reply-textarea" rows="7" placeholder="写点什么... 支持 Markdown。Ctrl+Enter 或 Cmd+Enter 可发送"></textarea>
          <div class="ld-reply-status" aria-live="polite"></div>
          <div class="ld-reply-actions">
            <button class="ld-reply-action" type="button" data-action="cancel">取消</button>
            <button class="ld-reply-action ld-reply-action-primary" type="button" data-action="submit">发送回复</button>
          </div>
        </div>
        <div class="ld-image-preview" hidden aria-hidden="true">
          <button class="ld-image-preview-close" type="button" aria-label="关闭图片预览">关闭</button>
          <div class="ld-image-preview-stage">
            <img class="ld-image-preview-image" alt="图片预览" />
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    state.root = root;
    state.header = root.querySelector(".ld-drawer-header");
    state.title = root.querySelector(".ld-drawer-title");
    state.meta = root.querySelector(".ld-drawer-meta");
    state.drawerBody = root.querySelector(".ld-drawer-body");
    state.content = root.querySelector(".ld-drawer-content");
    state.replyButton = root.querySelector(".ld-drawer-reply-fab");
    state.replyPanel = root.querySelector(".ld-drawer-reply-panel");
    state.replyPanelTitle = root.querySelector(".ld-reply-panel-title");
    state.replyTextarea = root.querySelector(".ld-reply-textarea");
    state.replySubmitButton = root.querySelector('[data-action="submit"]');
    state.replyCancelButton = root.querySelector('[data-action="cancel"]');
    state.replyStatus = root.querySelector(".ld-reply-status");
    state.imagePreview = root.querySelector(".ld-image-preview");
    state.imagePreviewImage = root.querySelector(".ld-image-preview-image");
    state.imagePreviewCloseButton = root.querySelector(".ld-image-preview-close");
    state.openInTab = root.querySelector(".ld-drawer-link");
    state.settingsPanel = root.querySelector(".ld-drawer-settings");
    state.settingsCard = root.querySelector(".ld-drawer-settings-card");
    state.settingsCloseButton = root.querySelector(".ld-settings-close");
    state.settingsToggle = root.querySelector(".ld-drawer-settings-toggle");
    state.prevButton = root.querySelector('[data-nav="prev"]');
    state.nextButton = root.querySelector('[data-nav="next"]');
    state.resizeHandle = root.querySelector(".ld-drawer-resize-handle");

    root.querySelector(".ld-drawer-close").addEventListener("click", closeDrawer);
    state.prevButton.addEventListener("click", () => navigateTopic(-1));
    state.nextButton.addEventListener("click", () => navigateTopic(1));
    state.settingsToggle.addEventListener("click", toggleSettingsPanel);
    state.replyButton.addEventListener("click", toggleReplyPanel);
    state.replyCancelButton.addEventListener("click", () => setReplyPanelOpen(false));
    state.replySubmitButton.addEventListener("click", handleReplySubmit);
    root.querySelector(".ld-reply-panel-close").addEventListener("click", () => setReplyPanelOpen(false));
    state.replyTextarea.addEventListener("keydown", handleReplyTextareaKeydown);
    root.addEventListener("click", handleDrawerRootClick);
    root.addEventListener("wheel", handleDrawerRootWheel, { passive: false });
    state.drawerBody.addEventListener("scroll", handleDrawerBodyScroll, { passive: true });
    state.settingsPanel.addEventListener("click", handleSettingsPanelClick);
    state.settingsPanel.addEventListener("change", handleSettingsChange);
    state.settingsCloseButton.addEventListener("click", () => setSettingsPanelOpen(false));
    state.settingsPanel.querySelector(".ld-settings-reset").addEventListener("click", resetSettings);
    state.resizeHandle.addEventListener("pointerdown", startDrawerResize);

    syncSettingsUI();
    applyDrawerWidth();
    syncNavigationState();
    syncReplyUI();
    updateSettingsPopoverPosition();
  }

  function bindEvents() {
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("pointermove", handleDrawerResizeMove, true);
    document.addEventListener("pointerup", stopDrawerResize, true);
    document.addEventListener("pointercancel", stopDrawerResize, true);
    window.addEventListener("resize", handleWindowResize, true);
  }

  function handleDocumentClick(event) {
    if (event.defaultPrevented) {
      return;
    }

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (!state.settingsPanel?.hidden && !target.closest(".ld-drawer-settings-card") && !target.closest(".ld-drawer-settings-toggle")) {
      setSettingsPanelOpen(false);
    }

    if (!state.replyPanel?.hidden && !target.closest(".ld-drawer-reply-panel") && !target.closest(".ld-drawer-reply-fab")) {
      setReplyPanelOpen(false);
    }

    if (
      state.settings.drawerMode === "overlay" &&
      document.body.classList.contains(PAGE_OPEN_CLASS) &&
      !target.closest(`#${ROOT_ID}`)
    ) {
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
      return;
    }

    const link = target.closest("a[href]");
    if (!link || link.closest(`#${ROOT_ID}`)) {
      return;
    }

    const topicUrl = getTopicUrlFromLink(link);
    if (!topicUrl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    openDrawer(topicUrl, link.textContent.trim(), link);
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && !state.imagePreview?.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeImagePreview();
      return;
    }

    if (event.key === "Escape" && !state.settingsPanel?.hidden) {
      event.preventDefault();
      event.stopPropagation();
      setSettingsPanelOpen(false);
      return;
    }

    if (event.key === "Escape" && !state.replyPanel?.hidden) {
      event.preventDefault();
      event.stopPropagation();
      setReplyPanelOpen(false);
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.key === "Escape" && document.body.classList.contains(PAGE_OPEN_CLASS)) {
      closeDrawer();
      return;
    }

    if (!document.body.classList.contains(PAGE_OPEN_CLASS)) {
      return;
    }

    if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        navigateTopic(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        navigateTopic(1);
      }
    }
  }

  function getTopicUrlFromLink(link) {
    if (!(link instanceof HTMLAnchorElement)) {
      return null;
    }

    if (link.target && link.target !== "_self") {
      return null;
    }

    if (link.hasAttribute("download")) {
      return null;
    }

    if (!link.closest(MAIN_CONTENT_SELECTOR) || link.closest(`#${ROOT_ID}`)) {
      return null;
    }

    if (link.closest(EXCLUDED_LINK_CONTEXT_SELECTOR)) {
      return null;
    }

    if (!isPrimaryTopicLink(link)) {
      return null;
    }

    let url;

    try {
      url = new URL(link.href, location.href);
    } catch {
      return null;
    }

    if (url.origin !== location.origin || !url.pathname.startsWith("/t/")) {
      return null;
    }

    return normalizeTopicUrl(url);
  }

  function openDrawer(topicUrl, fallbackTitle, activeLink) {
    ensureDrawer();

    const entryElement = activeLink instanceof Element
      ? getTopicEntryContainer(activeLink)
      : null;
    const topicIdHint = activeLink instanceof Element
      ? (getTopicIdHintFromLink(activeLink) || getTopicIdFromUrl(topicUrl))
      : getTopicIdFromUrl(topicUrl);
    const currentEntry = activeLink instanceof Element
      ? getTopicEntries().find((entry) => entry.link === activeLink || entry.entryElement === entryElement)
      : null;
    const nextTrackingKey = getTopicTrackingKey(topicUrl, topicIdHint);
    const isSameTrackedTopic = Boolean(state.currentTopicTrackingKey) && state.currentTopicTrackingKey === nextTrackingKey;

    state.currentEntryElement = entryElement;
    state.currentEntryKey = currentEntry?.entryKey || buildEntryKey(topicUrl, 1);
    state.currentTopicIdHint = topicIdHint;
    if (!isSameTrackedTopic) {
      state.currentViewTracked = false;
      state.currentTrackRequest = null;
      state.currentTrackRequestKey = "";
    }
    state.currentTopicTrackingKey = nextTrackingKey;

    if (state.currentUrl === topicUrl && document.body.classList.contains(PAGE_OPEN_CLASS)) {
      highlightLink(activeLink);
      syncNavigationState();

      if (!state.currentViewTracked && !state.currentTrackRequest) {
        loadTopic(topicUrl, fallbackTitle, topicIdHint);
      }

      return;
    }

    state.currentUrl = topicUrl;
    state.currentFallbackTitle = fallbackTitle || "";
    state.currentResolvedTargetPostNumber = null;
    state.currentTargetSpec = null;
    state.currentTopic = null;
    state.loadMoreError = "";
    state.isLoadingMorePosts = false;
    resetReplyComposer();
    state.title.textContent = fallbackTitle || "加载中…";
    state.meta.textContent = "正在载入帖子内容…";
    state.openInTab.href = topicUrl;
    state.content.innerHTML = renderLoading();

    highlightLink(activeLink);
    syncNavigationState();

    document.body.classList.add(PAGE_OPEN_CLASS);
    state.root.setAttribute("aria-hidden", "false");
    setIframeModeEnabled(state.settings.previewMode === "iframe");
    applyDrawerMode();
    updateSettingsPopoverPosition();

    loadTopic(topicUrl, fallbackTitle, topicIdHint);
  }

  function closeDrawer() {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }

    cancelLoadMoreRequest();
    cancelReplyRequest();

    document.body.classList.remove(PAGE_OPEN_CLASS);
    document.body.classList.remove("ld-drawer-mode-overlay");
    setIframeModeEnabled(false);
    state.root?.setAttribute("aria-hidden", "true");
    state.currentUrl = "";
    state.currentEntryElement = null;
    state.currentEntryKey = "";
    state.currentTopicIdHint = null;
    state.currentTopicTrackingKey = "";
    state.currentViewTracked = false;
    state.currentTrackRequest = null;
    state.currentTrackRequestKey = "";
    state.currentResolvedTargetPostNumber = null;
    state.currentFallbackTitle = "";
    state.currentTopic = null;
    state.currentLatestRepliesTopic = null;
    state.currentTargetSpec = null;
    state.meta.textContent = "";
    state.loadMoreError = "";
    state.isLoadingMorePosts = false;
    resetReplyComposer();
    closeImagePreview();
    clearHighlight();
    setSettingsPanelOpen(false);
    syncNavigationState();
  }

  function highlightLink(link) {
    clearHighlight();
    state.activeLink = link;
    state.activeLink?.classList.add(ACTIVE_LINK_CLASS);
    syncNavigationState();
  }

  function clearHighlight() {
    state.activeLink?.classList.remove(ACTIVE_LINK_CLASS);
    state.activeLink = null;
  }

  function getTopicEntries() {
    const entries = [];
    const seen = new WeakSet();
    const duplicateCounts = new Map();
    const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);

    if (!(mainContent instanceof Element)) {
      return entries;
    }

    for (const link of mainContent.querySelectorAll(PRIMARY_TOPIC_LINK_SELECTOR)) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }

      const url = getTopicUrlFromLink(link);
      if (!url) {
        continue;
      }

      const entryElement = getTopicEntryContainer(link);
      if (seen.has(entryElement)) {
        continue;
      }

      seen.add(entryElement);
      const occurrence = (duplicateCounts.get(url) || 0) + 1;
      duplicateCounts.set(url, occurrence);
      entries.push({
        entryElement,
        entryKey: buildEntryKey(url, occurrence),
        topicIdHint: getTopicIdHintFromLink(link) || getTopicIdFromUrl(url),
        url,
        title: link.textContent.trim() || url,
        link
      });
    }

    return entries;
  }

  function resolveCurrentEntryIndex(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return -1;
    }

    if (state.currentEntryKey) {
      const indexByKey = entries.findIndex((entry) => entry.entryKey === state.currentEntryKey);
      if (indexByKey !== -1) {
        return indexByKey;
      }
    }

    if (state.currentEntryElement) {
      const indexByElement = entries.findIndex((entry) => entry.entryElement === state.currentEntryElement);
      if (indexByElement !== -1) {
        return indexByElement;
      }
    }

    return entries.findIndex((entry) => entry.url === state.currentUrl);
  }

  function syncNavigationState() {
    if (!state.prevButton || !state.nextButton) {
      return;
    }

    const entries = getTopicEntries();
    const currentIndex = resolveCurrentEntryIndex(entries);
    const hasDrawerOpen = Boolean(state.currentUrl);

    state.prevButton.disabled = !hasDrawerOpen || currentIndex <= 0;
    state.nextButton.disabled = !hasDrawerOpen || currentIndex === -1 || currentIndex >= entries.length - 1;
  }

  function navigateTopic(offset) {
    const entries = getTopicEntries();
    const currentIndex = resolveCurrentEntryIndex(entries);
    const nextEntry = currentIndex === -1 ? null : entries[currentIndex + offset];

    if (!nextEntry) {
      syncNavigationState();
      return;
    }

    nextEntry.link.scrollIntoView({ block: "nearest" });
    openDrawer(nextEntry.url, nextEntry.title, nextEntry.link);
  }

  async function loadTopic(topicUrl, fallbackTitle, topicIdHint = null) {
    closeImagePreview();
    cancelLoadMoreRequest();
    state.isLoadingMorePosts = false;
    state.loadMoreError = "";

    if (state.settings.previewMode === "iframe") {
      if (!state.currentViewTracked) {
        ensureTrackedTopicVisit(topicUrl, topicIdHint).catch(() => {});
      }
      renderIframeFallback(topicUrl, fallbackTitle, null, true);
      return;
    }

    if (state.abortController) {
      state.abortController.abort();
    }

    if (!state.currentViewTracked) {
      state.currentTrackRequest = null;
      state.currentTrackRequestKey = "";
    }

    const controller = new AbortController();
    state.abortController = controller;

    try {
      const targetSpec = getTopicTargetSpec(topicUrl, topicIdHint);
      let resolvedTargetPostNumber = null;
      let topic;
      let targetedTopic = null;
      let latestRepliesTopic = null;

      if (state.currentViewTracked) {
        topic = await fetchTrackedTopicJson(topicUrl, controller.signal, topicIdHint, {
          canonical: true,
          trackVisit: false
        });
      } else {
        topic = await ensureTrackedTopicVisit(topicUrl, topicIdHint, controller.signal);
      }

      if (shouldFetchTargetedTopic(topic, targetSpec)) {
        targetedTopic = await fetchTrackedTopicJson(topicUrl, controller.signal, topicIdHint, {
          canonical: false,
          trackVisit: false
        });
        topic = mergeTopicPreviewData(topic, targetedTopic);
        resolvedTargetPostNumber = resolveTopicTargetPostNumber(targetSpec, topic, targetedTopic);
      } else {
        resolvedTargetPostNumber = resolveTopicTargetPostNumber(targetSpec, topic, null);
      }

      if (shouldLoadLatestRepliesTopic(topic, targetSpec)) {
        if (targetSpec?.targetToken === "last" && targetedTopic) {
          latestRepliesTopic = targetedTopic;
        } else {
          try {
            latestRepliesTopic = await fetchLatestRepliesTopic(topicUrl, controller.signal, topicIdHint);
          } catch (latestError) {
            if (controller.signal.aborted) {
              throw latestError;
            }
            latestRepliesTopic = null;
          }
        }
      }

      if (controller.signal.aborted || state.currentUrl !== topicUrl) {
        return;
      }

      renderTopic(topic, topicUrl, fallbackTitle, resolvedTargetPostNumber, {
        latestRepliesTopic,
        targetSpec
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      renderIframeFallback(topicUrl, fallbackTitle, error);
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  function renderTopic(topic, topicUrl, fallbackTitle, resolvedTargetPostNumber = null, options = {}) {
    setIframeModeEnabled(false);

    const posts = topic?.post_stream?.posts || [];

    if (!posts.length) {
      renderIframeFallback(topicUrl, fallbackTitle, new Error("No posts available"));
      return;
    }

    const targetSpec = options.targetSpec || getTopicTargetSpec(topicUrl, state.currentTopicIdHint);
    const latestRepliesTopic = options.latestRepliesTopic || null;
    const viewModel = buildTopicViewModel(topic, latestRepliesTopic, targetSpec);
    const shouldPreserveScroll = Number.isFinite(options.preserveScrollTop);

    state.currentTopic = topic;
    state.currentLatestRepliesTopic = latestRepliesTopic;
    state.currentTargetSpec = targetSpec;
    state.currentTopicIdHint = typeof topic?.id === "number" ? topic.id : state.currentTopicIdHint;
    state.currentResolvedTargetPostNumber = resolvedTargetPostNumber;
    state.title.textContent = topic.title || fallbackTitle || "帖子预览";
    state.meta.textContent = buildTopicMeta(topic, viewModel.posts.length);
    state.content.replaceChildren(buildTopicView(topic, viewModel));
    syncReplyUI();

    if (shouldPreserveScroll && state.drawerBody) {
      state.drawerBody.scrollTop = options.preserveScrollTop;
    } else {
      scrollTopicViewToTargetPost(resolvedTargetPostNumber);
    }

    updateLoadMoreStatus();
    queueAutoLoadCheck();
  }

  function buildTopicView(topic, viewModel) {
    const wrapper = document.createElement("div");
    wrapper.className = "ld-topic-view";

    const visiblePosts = viewModel.posts;
    const basePosts = topic?.post_stream?.posts || [];

    if (!state.hasShownPreviewNotice) {
      const notice = document.createElement("div");
      notice.className = "ld-topic-note ld-topic-note-warning";
      notice.textContent = "抽屉预览是便捷阅读视图，标签和回复顺序可能与原帖页略有差异；需要完整阅读时可点右上角“新标签打开”。";
      wrapper.appendChild(notice);
      state.hasShownPreviewNotice = true;
    }

    if (Array.isArray(topic.tags) && topic.tags.length) {
      const tagList = document.createElement("div");
      tagList.className = "ld-tag-list";

      for (const tag of topic.tags) {
        const label = getTagLabel(tag);
        if (!label) {
          continue;
        }

        const item = document.createElement("span");
        item.className = "ld-tag";
        item.textContent = label;
        tagList.appendChild(item);
      }

      if (tagList.childElementCount > 0) {
        wrapper.appendChild(tagList);
      }
    }

    const postList = document.createElement("div");
    postList.className = "ld-topic-post-list";

    for (const post of visiblePosts) {
      postList.appendChild(buildPostCard(post));
    }

    wrapper.appendChild(postList);

    const totalPosts = topic?.posts_count || basePosts.length;
    const footer = document.createElement("div");
    footer.className = "ld-topic-footer";

    if (state.settings.postMode === "first" && basePosts.length > 1) {
      const note = document.createElement("div");
      note.className = "ld-topic-note";
      note.textContent = `当前为"仅首帖"模式。想看回复，可在右上角选项里切回"完整主题"。`;
      footer.appendChild(note);
    }

    const replyModeNote = buildReplyModeNote(viewModel);
    if (replyModeNote) {
      const note = document.createElement("div");
      note.className = "ld-topic-note";
      note.textContent = replyModeNote;
      footer.appendChild(note);
    }

    if (viewModel.hasHiddenPosts) {
      const note = document.createElement("div");
      note.className = "ld-topic-note";
      note.textContent = viewModel.canAutoLoadMore
        ? `当前已加载 ${visiblePosts.length} / ${totalPosts} 条帖子，继续下滑会自动加载更多回复。`
        : `当前抽屉预览了 ${visiblePosts.length} / ${totalPosts} 条帖子，完整内容可点右上角“新标签打开”。`;
      footer.appendChild(note);
    }

    if (viewModel.canAutoLoadMore) {
      const status = document.createElement("div");
      status.className = "ld-topic-note ld-topic-note-loading";
      status.setAttribute("aria-live", "polite");
      footer.appendChild(status);
      state.loadMoreStatus = status;
    } else {
      state.loadMoreStatus = null;
    }

    if (footer.childElementCount > 0) {
      wrapper.appendChild(footer);
    }

    return wrapper;
  }

  function buildTopicViewModel(topic, latestRepliesTopic = null, targetSpec = null) {
    const posts = topic?.post_stream?.posts || [];
    const moreAvailable = hasMoreTopicPosts(topic);

    if (state.settings.postMode === "first") {
      return {
        posts: posts.slice(0, 1),
        mode: "first",
        canAutoLoadMore: false,
        hasHiddenPosts: posts.length > 1 || moreAvailable
      };
    }

    if (targetSpec?.targetPostNumber) {
      return {
        posts,
        mode: "targeted",
        canAutoLoadMore: false,
        hasHiddenPosts: moreAvailable
      };
    }

    if (state.settings.replyOrder !== "latestFirst" || posts.length <= 1) {
      return {
        posts,
        mode: "default",
        canAutoLoadMore: !targetSpec?.hasTarget,
        hasHiddenPosts: moreAvailable
      };
    }

    if (topicHasCompletePostStream(topic)) {
      return {
        posts: [posts[0], ...posts.slice(1).reverse()],
        mode: "latestComplete",
        canAutoLoadMore: false,
        hasHiddenPosts: false
      };
    }

    if (latestRepliesTopic) {
      return {
        posts: getLatestRepliesDisplayPosts(topic, latestRepliesTopic),
        mode: "latestWindow",
        canAutoLoadMore: false,
        hasHiddenPosts: moreAvailable
      };
    }

    return {
      posts,
      mode: "latestUnavailable",
      canAutoLoadMore: false,
      hasHiddenPosts: moreAvailable
    };
  }

  function getTagLabel(tag) {
    if (typeof tag === "string") {
      return tag;
    }

    if (!tag || typeof tag !== "object") {
      return "";
    }

    return tag.name || tag.id || tag.text || tag.label || "";
  }

  function buildPostCard(post) {
    const article = document.createElement("article");
    article.className = "ld-post-card";
    if (typeof post.post_number === "number") {
      article.dataset.postNumber = String(post.post_number);
    }

    const header = document.createElement("div");
    header.className = "ld-post-header";

    const avatar = document.createElement("img");
    avatar.className = "ld-post-avatar";
    avatar.alt = post.username || "avatar";
    avatar.loading = "lazy";
    avatar.src = avatarUrl(post.avatar_template);

    const authorBlock = document.createElement("div");
    authorBlock.className = "ld-post-author";

    const authorRow = document.createElement("div");
    authorRow.className = "ld-post-author-row";

    const displayName = document.createElement("strong");
    displayName.textContent = post.name || post.username || "匿名用户";

    const username = document.createElement("span");
    username.className = "ld-post-username";
    username.textContent = post.username ? `@${post.username}` : "";

    authorRow.append(displayName, username);

    const meta = document.createElement("div");
    meta.className = "ld-post-meta";
    meta.textContent = buildPostMeta(post);

    authorBlock.append(authorRow, meta);
    header.append(avatar, authorBlock);

    const body = document.createElement("div");
    body.className = "ld-post-body cooked";
    body.innerHTML = post.cooked || "";

    for (const link of body.querySelectorAll("a[href]")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    const actions = document.createElement("div");
    actions.className = "ld-post-actions";

    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "ld-post-reply-button";
    replyButton.setAttribute("aria-label", `回复第 ${post.post_number || "?"} 条`);
    replyButton.innerHTML = `
      <span class="ld-post-reply-button-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M4 12.5c0-4.14 3.36-7.5 7.5-7.5h7a1.5 1.5 0 0 1 0 3h-7A4.5 4.5 0 0 0 7 12.5v1.38l1.44-1.44a1.5 1.5 0 0 1 2.12 2.12l-4 4a1.5 1.5 0 0 1-2.12 0l-4-4a1.5 1.5 0 1 1 2.12-2.12L4 13.88V12.5Z" fill="currentColor"></path>
        </svg>
      </span>
      <span class="ld-post-reply-button-label">回复这条</span>
    `;
    replyButton.addEventListener("click", () => openReplyPanelForPost(post));

    actions.appendChild(replyButton);
    article.append(header, body, actions);
    return article;
  }

  function handleDrawerBodyScroll() {
    maybeLoadMorePosts();
  }

  function toggleReplyPanel() {
    if (!state.currentTopic || state.isReplySubmitting) {
      return;
    }

    if (state.replyPanel?.hidden) {
      setReplyTarget(null);
    }

    setReplyPanelOpen(state.replyPanel?.hidden);
  }

  function openReplyPanelForPost(post) {
    if (!state.currentTopic || !post || state.isReplySubmitting) {
      return;
    }

    setReplyTarget(post);
    setReplyPanelOpen(true);
  }

  function setReplyPanelOpen(isOpen) {
    if (!state.replyPanel || !state.replyButton) {
      return;
    }

    if (isOpen && !state.currentTopic) {
      return;
    }

    state.replyPanel.hidden = !isOpen;
    state.replyButton.setAttribute("aria-expanded", String(isOpen));

    if (!isOpen) {
      setReplyTarget(null);
      return;
    }

    queueMicrotask(() => state.replyTextarea?.focus());
  }

  function setReplyTarget(post) {
    if (post && typeof post === "object" && Number.isFinite(post.post_number)) {
      state.replyTargetPostNumber = Number(post.post_number);
      state.replyTargetLabel = buildReplyTargetLabel(post);
    } else {
      state.replyTargetPostNumber = null;
      state.replyTargetLabel = "";
    }

    syncReplyUI();
  }

  function buildReplyTargetLabel(post) {
    const parts = [];

    if (Number.isFinite(post?.post_number)) {
      parts.push(`#${post.post_number}`);
    }

    if (post?.username) {
      parts.push(`@${post.username}`);
    }

    return parts.join(" ") || "这条回复";
  }

  function handleReplyTextareaKeydown(event) {
    if (!event.metaKey && !event.ctrlKey) {
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleReplySubmit();
  }

  async function handleReplySubmit() {
    if (!state.currentTopic || state.isReplySubmitting || !state.replyTextarea || !state.replyStatus) {
      return;
    }

    const raw = state.replyTextarea.value.trim();
    if (!raw) {
      state.replyStatus.textContent = "先写点内容再发送。";
      state.replyTextarea.focus();
      return;
    }

    cancelReplyRequest();
    state.isReplySubmitting = true;
    syncReplyUI();
    state.replyStatus.textContent = "正在发送回复...";

    const controller = new AbortController();
    state.replyAbortController = controller;

    try {
      const createdPost = await createTopicReply(
        state.currentTopic.id,
        raw,
        controller.signal,
        state.replyTargetPostNumber
      );
      if (controller.signal.aborted) {
        return;
      }

      state.replyTextarea.value = "";
      state.replyStatus.textContent = "回复已发送。";
      appendCreatedReplyToCurrentTopic(createdPost);
      setReplyPanelOpen(false);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      state.replyStatus.textContent = error?.message || "回复发送失败";
    } finally {
      if (state.replyAbortController === controller) {
        state.replyAbortController = null;
      }

      state.isReplySubmitting = false;
      syncReplyUI();
    }
  }

  function queueAutoLoadCheck() {
    requestAnimationFrame(() => {
      maybeLoadMorePosts();
    });
  }

  function maybeLoadMorePosts() {
    if (!state.drawerBody || !state.currentTopic) {
      return;
    }

    if (state.settings.postMode === "first" || state.settings.replyOrder === "latestFirst" || state.currentTargetSpec?.hasTarget || state.isLoadingMorePosts || !hasMoreTopicPosts(state.currentTopic)) {
      updateLoadMoreStatus();
      return;
    }

    const remainingDistance = state.drawerBody.scrollHeight - state.drawerBody.scrollTop - state.drawerBody.clientHeight;
    if (remainingDistance > LOAD_MORE_TRIGGER_OFFSET) {
      updateLoadMoreStatus();
      return;
    }

    loadMorePosts().catch(() => {});
  }

  async function loadMorePosts() {
    if (!state.currentTopic || state.isLoadingMorePosts || state.currentTargetSpec?.hasTarget) {
      return;
    }

    const nextPostIds = getNextTopicPostIds(state.currentTopic);
    if (!nextPostIds.length) {
      updateLoadMoreStatus();
      return;
    }

    cancelLoadMoreRequest();
    state.isLoadingMorePosts = true;
    state.loadMoreError = "";
    updateLoadMoreStatus();

    const controller = new AbortController();
    const currentUrl = state.currentUrl;
    const previousScrollTop = state.drawerBody?.scrollTop || 0;
    state.loadMoreAbortController = controller;

    try {
      const posts = await fetchTopicPostsBatch(currentUrl, nextPostIds, controller.signal, state.currentTopicIdHint);
      if (controller.signal.aborted || state.currentUrl !== currentUrl || !posts.length) {
        return;
      }

      const nextTopic = mergeTopicPreviewData(state.currentTopic, {
        posts_count: state.currentTopic.posts_count,
        post_stream: {
          posts
        }
      });

      state.isLoadingMorePosts = false;
      state.loadMoreError = "";
      renderTopic(nextTopic, currentUrl, state.currentFallbackTitle, state.currentResolvedTargetPostNumber, {
        targetSpec: state.currentTargetSpec,
        preserveScrollTop: previousScrollTop
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      state.isLoadingMorePosts = false;
      state.loadMoreError = error?.message || "加载更多失败";
      updateLoadMoreStatus();
    } finally {
      if (state.loadMoreAbortController === controller) {
        state.loadMoreAbortController = null;
      }
    }
  }

  function cancelLoadMoreRequest() {
    if (state.loadMoreAbortController) {
      state.loadMoreAbortController.abort();
      state.loadMoreAbortController = null;
    }
  }

  function cancelReplyRequest() {
    if (state.replyAbortController) {
      state.replyAbortController.abort();
      state.replyAbortController = null;
    }
  }

  function updateLoadMoreStatus() {
    if (!state.loadMoreStatus) {
      return;
    }

    if (!state.currentTopic || state.currentTargetSpec?.hasTarget) {
      state.loadMoreStatus.textContent = "";
      state.loadMoreStatus.hidden = true;
      return;
    }

    state.loadMoreStatus.hidden = false;

    if (state.isLoadingMorePosts) {
      state.loadMoreStatus.textContent = "正在加载更多回复...";
      return;
    }

    if (state.loadMoreError) {
      state.loadMoreStatus.textContent = `加载更多失败：${state.loadMoreError}`;
      return;
    }

    if (hasMoreTopicPosts(state.currentTopic)) {
      const loadedCount = (state.currentTopic.post_stream?.posts || []).length;
      const totalCount = state.currentTopic.posts_count || loadedCount;
      state.loadMoreStatus.textContent = `已加载 ${loadedCount} / ${totalCount}，继续下滑自动加载更多`;
      return;
    }

    state.loadMoreStatus.textContent = "已加载完当前主题内容";
  }

  function handleDrawerRootClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (!state.imagePreview?.hidden) {
      if (target.closest(".ld-image-preview-close") || !target.closest(".ld-image-preview-image")) {
        event.preventDefault();
        closeImagePreview();
      }
      return;
    }

    const image = target.closest(".ld-post-body img");
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openImagePreview(image);
  }

  function openImagePreview(image) {
    if (!state.imagePreview || !state.imagePreviewImage) {
      return;
    }

    const previewSrc = getPreviewImageSrc(image);
    if (!previewSrc) {
      return;
    }

    resetImagePreviewScale();
    state.imagePreviewImage.src = previewSrc;
    state.imagePreviewImage.alt = image.alt || "图片预览";
    state.imagePreviewImage.classList.remove("is-ready");
    state.imagePreview.hidden = false;
    state.imagePreview.setAttribute("aria-hidden", "false");
    if (state.imagePreviewImage.complete) {
      state.imagePreviewImage.classList.add("is-ready");
    } else {
      state.imagePreviewImage.addEventListener("load", handlePreviewImageLoad, { once: true });
      state.imagePreviewImage.addEventListener("error", handlePreviewImageLoad, { once: true });
    }
    state.imagePreviewCloseButton?.focus();
  }

  function closeImagePreview() {
    if (!state.imagePreview || !state.imagePreviewImage) {
      return;
    }

    state.imagePreview.hidden = true;
    state.imagePreview.setAttribute("aria-hidden", "true");
    resetImagePreviewScale();
    state.imagePreviewImage.classList.remove("is-ready");
    state.imagePreviewImage.removeAttribute("src");
    state.imagePreviewImage.alt = "图片预览";
  }

  function handlePreviewImageLoad() {
    state.imagePreviewImage?.classList.add("is-ready");
  }

  function handleDrawerRootWheel(event) {
    if (state.imagePreview?.hidden) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".ld-image-preview-stage")) {
      return;
    }

    event.preventDefault();

    const nextScale = clampImagePreviewScale(
      state.imagePreviewScale + (event.deltaY < 0 ? IMAGE_PREVIEW_SCALE_STEP : -IMAGE_PREVIEW_SCALE_STEP)
    );

    if (nextScale === state.imagePreviewScale) {
      return;
    }

    updateImagePreviewTransformOrigin(event.clientX, event.clientY);
    state.imagePreviewScale = nextScale;
    applyImagePreviewScale();
  }

  function resetImagePreviewScale() {
    state.imagePreviewScale = IMAGE_PREVIEW_SCALE_MIN;
    if (state.imagePreviewImage) {
      state.imagePreviewImage.style.transformOrigin = "center center";
    }
    applyImagePreviewScale();
  }

  function applyImagePreviewScale() {
    if (!state.imagePreview || !state.imagePreviewImage) {
      return;
    }

    state.imagePreviewImage.style.setProperty("--ld-image-preview-scale", String(state.imagePreviewScale));
    state.imagePreview.classList.toggle("is-zoomed", state.imagePreviewScale > IMAGE_PREVIEW_SCALE_MIN);
  }

  function clampImagePreviewScale(value) {
    return Math.min(IMAGE_PREVIEW_SCALE_MAX, Math.max(IMAGE_PREVIEW_SCALE_MIN, Number(value) || IMAGE_PREVIEW_SCALE_MIN));
  }

  function updateImagePreviewTransformOrigin(clientX, clientY) {
    if (!state.imagePreviewImage) {
      return;
    }

    const rect = state.imagePreviewImage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const offsetX = ((clientX - rect.left) / rect.width) * 100;
    const offsetY = ((clientY - rect.top) / rect.height) * 100;
    const originX = Math.min(100, Math.max(0, offsetX));
    const originY = Math.min(100, Math.max(0, offsetY));

    state.imagePreviewImage.style.transformOrigin = `${originX}% ${originY}%`;
  }

  function getPreviewImageSrc(image) {
    if (!(image instanceof HTMLImageElement)) {
      return "";
    }

    const link = image.closest("a[href]");
    if (link instanceof HTMLAnchorElement && looksLikeImageUrl(link.href)) {
      return link.href;
    }

    return image.currentSrc || image.src || "";
  }

  function looksLikeImageUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  function renderTopicError(topicUrl, fallbackTitle, error) {
    cancelLoadMoreRequest();
    cancelReplyRequest();
    state.currentTopic = null;
    state.currentTargetSpec = null;
    state.currentResolvedTargetPostNumber = null;
    state.isLoadingMorePosts = false;
    state.isReplySubmitting = false;
    state.loadMoreError = "";
    state.loadMoreStatus = null;
    state.title.textContent = fallbackTitle || "帖子预览";
    state.meta.textContent = "智能预览暂时不可用。";
    resetReplyComposer();

    const container = document.createElement("div");
    container.className = "ld-topic-error-state";

    const errorNote = document.createElement("div");
    errorNote.className = "ld-topic-note ld-topic-note-error";
    errorNote.textContent = `预览加载失败：${error?.message || "未知错误"}`;

    const hintNote = document.createElement("div");
    hintNote.className = "ld-topic-note";
    hintNote.textContent = `可以点右上角“新标签打开”查看原帖：${topicUrl}`;

    container.append(errorNote, hintNote);
    state.content.replaceChildren(container);
  }

  function renderIframeFallback(topicUrl, fallbackTitle, error, forcedIframe = false) {
    setIframeModeEnabled(true);
    cancelLoadMoreRequest();
    cancelReplyRequest();

    state.currentTopic = null;
    state.currentLatestRepliesTopic = null;
    state.currentTargetSpec = null;
    state.currentResolvedTargetPostNumber = null;
    state.isLoadingMorePosts = false;
    state.isReplySubmitting = false;
    state.loadMoreError = "";
    state.loadMoreStatus = null;
    state.title.textContent = fallbackTitle || "帖子预览";
    state.meta.textContent = forcedIframe ? "当前为整页模式。" : "接口预览失败，已回退为完整页面。";
    resetReplyComposer();

    const container = document.createElement("div");
    container.className = "ld-iframe-fallback";

    if (error) {
      const note = document.createElement("div");
      note.className = "ld-topic-note ld-topic-note-error";
      note.textContent = `预览接口不可用：${error?.message || "未知错误"}`;
      container.append(note);
    }

    const iframe = document.createElement("iframe");
    iframe.className = "ld-topic-iframe";
    iframe.src = topicUrl;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    container.append(iframe);
    state.content.replaceChildren(container);
  }

  function setIframeModeEnabled(enabled) {
    state.root?.classList.toggle(IFRAME_MODE_CLASS, enabled);
    document.body.classList.toggle(PAGE_IFRAME_OPEN_CLASS, Boolean(state.currentUrl) && enabled);
  }

  function refreshCurrentView() {
    if (!state.currentUrl) {
      return;
    }

    if (state.settings.previewMode === "iframe") {
      if (state.abortController) {
        state.abortController.abort();
        state.abortController = null;
        if (!state.currentViewTracked) {
          state.currentTrackRequest = null;
          state.currentTrackRequestKey = "";
        }
      }

      if (!state.currentViewTracked) {
        ensureTrackedTopicVisit(state.currentUrl, state.currentTopicIdHint).catch(() => {});
      }

      renderIframeFallback(state.currentUrl, state.currentFallbackTitle, null, true);
      return;
    }

    if (state.currentTopic) {
      const targetSpec = getTopicTargetSpec(state.currentUrl, state.currentTopicIdHint);
      const needsTargetReload = shouldFetchTargetedTopic(state.currentTopic, targetSpec)
        && !state.currentResolvedTargetPostNumber;
      const needsLatestRepliesReload = shouldLoadLatestRepliesTopic(state.currentTopic, targetSpec)
        && !state.currentLatestRepliesTopic;

      if (!needsTargetReload && !needsLatestRepliesReload) {
        renderTopic(state.currentTopic, state.currentUrl, state.currentFallbackTitle, state.currentResolvedTargetPostNumber, {
          latestRepliesTopic: state.currentLatestRepliesTopic,
          targetSpec
        });
        return;
      }
    }

    loadTopic(state.currentUrl, state.currentFallbackTitle, state.currentTopicIdHint);
  }

  function shouldLoadLatestRepliesTopic(topic, targetSpec) {
    if (state.settings.postMode === "first" || state.settings.replyOrder !== "latestFirst") {
      return false;
    }

    if (targetSpec?.targetPostNumber) {
      return false;
    }

    if (targetSpec?.hasTarget && targetSpec.targetToken && targetSpec.targetToken !== "last") {
      return false;
    }

    return !topicHasCompletePostStream(topic);
  }

  function getLatestRepliesDisplayPosts(topic, latestRepliesTopic) {
    const firstPost = getFirstTopicPost(topic) || getFirstTopicPost(latestRepliesTopic);
    const replies = [];
    const seenPostNumbers = new Set();

    for (const post of latestRepliesTopic?.post_stream?.posts || []) {
      if (typeof post?.post_number !== "number") {
        continue;
      }

      if (firstPost && post.post_number === firstPost.post_number) {
        continue;
      }

      if (seenPostNumbers.has(post.post_number)) {
        continue;
      }

      seenPostNumbers.add(post.post_number);
      replies.push(post);
    }

    replies.sort((left, right) => right.post_number - left.post_number);

    if (!firstPost) {
      return replies;
    }

    return [firstPost, ...replies];
  }

  function getFirstTopicPost(topic) {
    const posts = topic?.post_stream?.posts || [];
    return posts.find((post) => post?.post_number === 1) || posts[0] || null;
  }

  function buildReplyModeNote(viewModel) {
    if (viewModel.mode === "latestComplete") {
      return `当前为\u201C首帖 + 最新回复\u201D模式。首帖固定在顶部，其余回复按从新到旧显示。`;
    }

    if (viewModel.mode === "latestWindow") {
      return `当前为\u201C首帖 + 最新回复\u201D模式。首帖固定在顶部，下面显示的是最新一批回复；长帖不会一次性把整帖完整倒序。`;
    }

    if (viewModel.mode === "latestUnavailable") {
      return `当前已切到\u201C首帖 + 最新回复\u201D模式，但这次没拿到最新回复窗口，暂按当前顺序显示。`;
    }

    return "";
  }

  function getLatestRepliesTopicUrl(topicUrl, topicIdHint = null) {
    const url = new URL(topicUrl);
    const parsed = parseTopicPath(url.pathname, topicIdHint);

    url.hash = "";
    url.search = "";
    url.pathname = parsed?.topicPath
      ? `${parsed.topicPath}/last`
      : `${stripTrailingSlash(url.pathname)}/last`;

    return url.toString().replace(/\/$/, "");
  }

  async function fetchLatestRepliesTopic(topicUrl, signal, topicIdHint = null) {
    return fetchTrackedTopicJson(getLatestRepliesTopicUrl(topicUrl, topicIdHint), signal, topicIdHint, {
      canonical: false,
      trackVisit: false
    });
  }

  function renderLoading() {
    return `
      <div class="ld-loading-state" aria-label="loading">
        <div class="ld-loading-bar"></div>
        <div class="ld-loading-bar ld-loading-bar-short"></div>
        <div class="ld-loading-card"></div>
        <div class="ld-loading-card"></div>
      </div>
    `;
  }

  function toTopicJsonUrl(topicUrl, options = {}) {
    const { canonical = false, trackVisit = true, topicIdHint = null } = options;
    const url = new URL(topicUrl);
    const parsed = parseTopicPath(url.pathname, topicIdHint);

    url.hash = "";
    url.search = "";
    url.pathname = `${canonical ? (parsed?.topicPath || stripTrailingSlash(url.pathname)) : stripTrailingSlash(url.pathname)}.json`;
    if (trackVisit) {
      url.searchParams.set("track_visit", "true");
    }
    return url.toString();
  }

  async function fetchTrackedTopicJson(topicUrl, signal, topicIdHint = null, options = {}) {
    const { canonical = false, trackVisit = true } = options;
    const topicId = topicIdHint || getTopicIdFromUrl(topicUrl);
    const response = await fetch(toTopicJsonUrl(topicUrl, { canonical, trackVisit, topicIdHint }), {
      credentials: "include",
      signal,
      headers: trackVisit ? buildTopicRequestHeaders(topicId) : { Accept: "application/json" }
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.includes("json")) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    return response.json();
  }

  function ensureTrackedTopicVisit(topicUrl, topicIdHint = null, signal) {
    const trackingKey = getTopicTrackingKey(topicUrl, topicIdHint);

    if (state.currentTrackRequest && state.currentTrackRequestKey === trackingKey) {
      return state.currentTrackRequest;
    }

    const request = fetchTrackedTopicJson(topicUrl, signal, topicIdHint, {
      canonical: true,
      trackVisit: true
    }).then((topic) => {
      if (state.currentTopicTrackingKey === trackingKey) {
        state.currentViewTracked = true;
      }
      return topic;
    }).finally(() => {
      if (state.currentTrackRequest === request) {
        state.currentTrackRequest = null;
        state.currentTrackRequestKey = "";
      }
    });

    state.currentTrackRequest = request;
    state.currentTrackRequestKey = trackingKey;
    return request;
  }

  function toTopicPostsJsonUrl(topicUrl, postIds, topicIdHint = null) {
    const url = new URL(topicUrl);
    const parsed = parseTopicPath(url.pathname, topicIdHint);

    url.hash = "";
    url.search = "";
    url.pathname = parsed?.topicId
      ? `/t/${parsed.topicId}/posts.json`
      : `${stripTrailingSlash(url.pathname)}/posts.json`;

    for (const postId of postIds) {
      if (Number.isFinite(postId)) {
        url.searchParams.append("post_ids[]", String(postId));
      }
    }

    return url.toString().replace(/\/$/, "");
  }

  async function fetchTopicPostsBatch(topicUrl, postIds, signal, topicIdHint = null) {
    const response = await fetch(toTopicPostsJsonUrl(topicUrl, postIds, topicIdHint), {
      credentials: "include",
      signal,
      headers: {
        Accept: "application/json"
      }
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("json")) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    const data = await response.json();
    return data?.post_stream?.posts || [];
  }

  async function createTopicReply(topicId, raw, signal, replyToPostNumber = null) {
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      throw new Error("未找到登录令牌，请刷新页面后重试");
    }

    const body = new URLSearchParams();
    body.set("raw", raw);
    body.set("topic_id", String(topicId));
    if (Number.isFinite(replyToPostNumber)) {
      body.set("reply_to_post_number", String(replyToPostNumber));
    }

    const response = await fetch(`${location.origin}/posts.json`, {
      method: "POST",
      credentials: "include",
      signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": csrfToken
      },
      body
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("json")
      ? await response.json()
      : null;

    if (!response.ok) {
      const message = Array.isArray(data?.errors) && data.errors.length > 0
        ? data.errors.join("；")
        : (data?.error || `Unexpected response: ${response.status}`);
      throw new Error(message);
    }

    return data;
  }

  function getCsrfToken() {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    return token.trim();
  }

  function buildTopicRequestHeaders(topicId) {
    const headers = {
      Accept: "application/json"
    };

    if (topicId) {
      headers["Discourse-Track-View"] = "true";
      headers["Discourse-Track-View-Topic-Id"] = String(topicId);
    }

    return headers;
  }

  function getTopicStreamIds(topic) {
    const stream = topic?.post_stream?.stream;
    if (Array.isArray(stream) && stream.length > 0) {
      return stream.filter((postId) => Number.isFinite(postId));
    }

    return (topic?.post_stream?.posts || [])
      .map((post) => post?.id)
      .filter((postId) => Number.isFinite(postId));
  }

  function getLoadedTopicPostIds(topic) {
    return (topic?.post_stream?.posts || [])
      .map((post) => post?.id)
      .filter((postId) => Number.isFinite(postId));
  }

  function getNextTopicPostIds(topic, batchSize = LOAD_MORE_BATCH_SIZE) {
    const streamIds = getTopicStreamIds(topic);
    if (!streamIds.length) {
      return [];
    }

    const loadedPostIds = new Set(getLoadedTopicPostIds(topic));
    return streamIds.filter((postId) => !loadedPostIds.has(postId)).slice(0, batchSize);
  }

  function hasMoreTopicPosts(topic) {
    if (getNextTopicPostIds(topic, 1).length > 0) {
      return true;
    }

    const posts = topic?.post_stream?.posts || [];
    const totalPosts = Number(topic?.posts_count || 0);
    return totalPosts > 0 && posts.length < totalPosts;
  }

  function topicHasPostNumber(topic, postNumber) {
    if (!postNumber) {
      return false;
    }

    return (topic?.post_stream?.posts || []).some((post) => post?.post_number === postNumber);
  }

  function getTopicTargetSpec(topicUrl, topicIdHint = null) {
    try {
      const parsed = parseTopicPath(new URL(topicUrl).pathname, topicIdHint);
      if (!parsed) {
        return null;
      }

      return {
        hasTarget: parsed.targetSegments.length > 0,
        targetSegments: parsed.targetSegments,
        targetPostNumber: parsed.targetPostNumber,
        targetToken: parsed.targetToken
      };
    } catch {
      return null;
    }
  }

  function shouldFetchTargetedTopic(topic, targetSpec) {
    if (!targetSpec?.hasTarget || state.settings.postMode === "first") {
      return false;
    }

    if (targetSpec.targetPostNumber) {
      return !topicHasPostNumber(topic, targetSpec.targetPostNumber);
    }

    if (targetSpec.targetToken === "last") {
      return !topicHasCompletePostStream(topic);
    }

    return true;
  }

  function topicHasCompletePostStream(topic) {
    return !hasMoreTopicPosts(topic);
  }

  function resolveTopicTargetPostNumber(targetSpec, topic, targetedTopic) {
    if (!targetSpec?.hasTarget) {
      return null;
    }

    if (targetSpec.targetPostNumber) {
      if (topicHasPostNumber(targetedTopic, targetSpec.targetPostNumber) || topicHasPostNumber(topic, targetSpec.targetPostNumber)) {
        return targetSpec.targetPostNumber;
      }
      return null;
    }

    const sourcePosts = targetedTopic?.post_stream?.posts || [];
    if (sourcePosts.length > 0) {
      if (targetSpec.targetToken === "last") {
        return sourcePosts[sourcePosts.length - 1]?.post_number || null;
      }

      return sourcePosts[0]?.post_number || null;
    }

    const fallbackPosts = topic?.post_stream?.posts || [];
    if (targetSpec.targetToken === "last" && topicHasCompletePostStream(topic) && fallbackPosts.length > 0) {
      return fallbackPosts[fallbackPosts.length - 1]?.post_number || null;
    }

    return null;
  }

  function mergeTopicPreviewData(primaryTopic, supplementalTopic) {
    const mergedPosts = new Map();
    const mergedStream = [];
    const seenStreamPostIds = new Set();

    for (const post of primaryTopic?.post_stream?.posts || []) {
      if (typeof post?.post_number === "number") {
        mergedPosts.set(post.post_number, post);
      }
    }

    for (const post of supplementalTopic?.post_stream?.posts || []) {
      if (typeof post?.post_number === "number" && !mergedPosts.has(post.post_number)) {
        mergedPosts.set(post.post_number, post);
      }
    }

    for (const postId of getTopicStreamIds(primaryTopic)) {
      if (!seenStreamPostIds.has(postId)) {
        seenStreamPostIds.add(postId);
        mergedStream.push(postId);
      }
    }

    for (const postId of getTopicStreamIds(supplementalTopic)) {
      if (!seenStreamPostIds.has(postId)) {
        seenStreamPostIds.add(postId);
        mergedStream.push(postId);
      }
    }

    for (const postId of getLoadedTopicPostIds({ post_stream: { posts: Array.from(mergedPosts.values()) } })) {
      if (!seenStreamPostIds.has(postId)) {
        seenStreamPostIds.add(postId);
        mergedStream.push(postId);
      }
    }

    const posts = Array.from(mergedPosts.values()).sort((left, right) => left.post_number - right.post_number);

    return {
      ...primaryTopic,
      posts_count: Math.max(Number(primaryTopic?.posts_count || 0), Number(supplementalTopic?.posts_count || 0)) || primaryTopic?.posts_count || supplementalTopic?.posts_count,
      post_stream: {
        ...(primaryTopic?.post_stream || {}),
        stream: mergedStream,
        posts
      }
    };
  }

  function appendCreatedReplyToCurrentTopic(createdPost) {
    if (!state.currentTopic || !createdPost || typeof createdPost !== "object") {
      return;
    }

    const createdPostId = Number(createdPost.id);
    const createdPostNumber = Number(createdPost.post_number);
    if (!Number.isFinite(createdPostId) || !Number.isFinite(createdPostNumber)) {
      return;
    }

    const previousScrollTop = state.drawerBody?.scrollTop || 0;
    const nextTopic = mergeTopicPreviewData(state.currentTopic, {
      posts_count: Math.max(
        Number(state.currentTopic.posts_count || 0),
        Number(createdPost.topic_posts_count || 0),
        (state.currentTopic.post_stream?.posts || []).length + 1
      ),
      post_stream: {
        stream: [createdPostId],
        posts: [createdPost]
      }
    });

    renderTopic(nextTopic, state.currentUrl, state.currentFallbackTitle, null, {
      targetSpec: state.currentTargetSpec,
      preserveScrollTop: previousScrollTop
    });

    requestAnimationFrame(() => {
      const target = state.content?.querySelector(`.ld-post-card[data-post-number="${createdPostNumber}"]`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function isPrimaryTopicLink(link) {
    if (!(link instanceof HTMLAnchorElement)) {
      return false;
    }

    if (link.closest(LIST_ROW_SELECTOR)) {
      return link.matches(PRIMARY_TOPIC_LINK_SELECTOR);
    }

    return link.matches(PRIMARY_TOPIC_LINK_SELECTOR);
  }

  function buildEntryKey(url, occurrence) {
    return occurrence > 1 ? `${url}::${occurrence}` : url;
  }

  function getTopicEntryContainer(link) {
    if (!(link instanceof Element)) {
      return null;
    }

    return link.closest(ENTRY_CONTAINER_SELECTOR)
      || link.closest("[data-topic-id]")
      || link;
  }

  function readTopicIdHint(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    const rawTopicId = element.getAttribute("data-topic-id") || element.dataset?.topicId || "";
    return /^\d+$/.test(rawTopicId) ? Number(rawTopicId) : null;
  }

  function getTopicIdHintFromLink(link) {
    if (!(link instanceof Element)) {
      return null;
    }

    const directTopicId = readTopicIdHint(link);
    if (directTopicId) {
      return directTopicId;
    }

    const hintedAncestor = link.closest("[data-topic-id]");
    if (hintedAncestor) {
      return readTopicIdHint(hintedAncestor);
    }

    return readTopicIdHint(getTopicEntryContainer(link));
  }

  function getTopicTrackingKey(topicUrl, topicIdHint = null) {
    try {
      const parsed = parseTopicPath(new URL(topicUrl).pathname, topicIdHint);
      if (parsed?.topicId) {
        return `topic:${parsed.topicId}`;
      }
      return parsed?.topicPath || topicUrl;
    } catch {
      return topicUrl;
    }
  }

  function normalizeTopicUrl(url) {
    const parsed = parseTopicPath(url.pathname);

    url.hash = "";
    url.search = "";
    url.pathname = parsed?.topicPath || stripTrailingSlash(url.pathname);

    return url.toString().replace(/\/$/, "");
  }

  function getTopicIdFromUrl(topicUrl, topicIdHint = null) {
    try {
      return parseTopicPath(new URL(topicUrl).pathname, topicIdHint)?.topicId || null;
    } catch {
      return null;
    }
  }

  function getTopicTargetPostNumber(topicUrl, topicIdHint = null) {
    return getTopicTargetSpec(topicUrl, topicIdHint)?.targetPostNumber || null;
  }

  function scrollTopicViewToTargetPost(targetPostNumber) {
    if (!targetPostNumber) {
      return;
    }

    requestAnimationFrame(() => {
      const target = state.content?.querySelector(`.ld-post-card[data-post-number="${targetPostNumber}"]`);
      target?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }

  function parseTopicPath(pathname, topicIdHint = null) {
    const trimmedPath = stripTrailingSlash(pathname);
    const segments = trimmedPath.split("/");
    const first = segments[2] || "";
    const second = segments[3] || "";

    if (segments[1] !== "t") {
      return null;
    }

    const firstIsNumber = /^\d+$/.test(first);
    const secondIsNumber = /^\d+$/.test(second);

    let topicId = null;
    let topicPath = "";
    let extraSegments = [];

    if (firstIsNumber) {
      topicId = Number(first);
      topicPath = `/t/${first}`;
      extraSegments = segments.slice(3).filter(Boolean);
    } else if (secondIsNumber) {
      topicId = Number(second);
      topicPath = `/t/${first}/${second}`;
      extraSegments = segments.slice(4).filter(Boolean);
    } else {
      return null;
    }

    const destinationPath = extraSegments.length > 0
      ? `${topicPath}/${extraSegments.join("/")}`
      : topicPath;
    const targetPostNumber = /^\d+$/.test(extraSegments[0] || "")
      ? Number(extraSegments[0])
      : null;
    const targetToken = !targetPostNumber && extraSegments[0]
      ? String(extraSegments[0])
      : null;

    return {
      topicId,
      topicPath,
      destinationPath,
      targetSegments: extraSegments,
      targetPostNumber,
      targetToken
    };
  }

  function stripTrailingSlash(pathname) {
    return pathname.replace(/\/+$/, "") || pathname;
  }

  function avatarUrl(template) {
    if (!template) {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%23d8dee9'/%3E%3C/svg%3E";
    }

    return new URL(template.replace("{size}", "96"), location.origin).toString();
  }

  function buildTopicMeta(topic, loadedPostCount) {
    const parts = [];

    if (topic.created_by?.username) {
      parts.push(`楼主 @${topic.created_by.username}`);
    }

    if (topic.created_at) {
      parts.push(formatDate(topic.created_at));
    }

    if (typeof topic.views === "number") {
      parts.push(`${topic.views.toLocaleString()} 浏览`);
    }

    const totalPosts = topic.posts_count || loadedPostCount;
    parts.push(`${totalPosts} 帖`);

    return parts.join(" · ");
  }

  function buildPostMeta(post) {
    const parts = [];

    if (post.created_at) {
      parts.push(formatDate(post.created_at));
    }

    if (typeof post.reads === "number") {
      parts.push(`${post.reads} 阅读`);
    }

    if (typeof post.reply_count === "number" && post.reply_count > 0) {
      parts.push(`${post.reply_count} 回复`);
    }

    return parts.join(" · ");
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function isTypingTarget(target) {
    return target instanceof HTMLElement && (
      target.isContentEditable ||
      target.matches("input, textarea, select") ||
      Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
    );
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      const settings = {
        ...DEFAULT_SETTINGS,
        ...(saved && typeof saved === "object" ? saved : {})
      };

      if (!(settings.drawerWidth in DRAWER_WIDTHS) && settings.drawerWidth !== "custom") {
        settings.drawerWidth = DEFAULT_SETTINGS.drawerWidth;
      }

      if (settings.drawerMode !== "push" && settings.drawerMode !== "overlay") {
        settings.drawerMode = DEFAULT_SETTINGS.drawerMode;
      }

      settings.drawerWidthCustom = clampDrawerWidth(settings.drawerWidthCustom);
      return settings;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function resetReplyComposer() {
    if (state.replyTextarea) {
      state.replyTextarea.value = "";
      state.replyTextarea.placeholder = "写点什么... 支持 Markdown。Ctrl+Enter 或 Cmd+Enter 可发送";
    }

    if (state.replyStatus) {
      state.replyStatus.textContent = "";
    }

    state.isReplySubmitting = false;
    setReplyPanelOpen(false);
    syncReplyUI();
  }

  function syncReplyUI() {
    const hasTopic = Boolean(state.currentTopic?.id);
    const isTargetedReply = Number.isFinite(state.replyTargetPostNumber);

    const isIframeMode = state.root?.classList.contains(IFRAME_MODE_CLASS);

    if (state.replyButton) {
      state.replyButton.hidden = !Boolean(state.currentUrl) || isIframeMode;
      state.replyButton.disabled = !hasTopic || state.isReplySubmitting;
      state.replyButton.classList.toggle("is-disabled", !hasTopic || state.isReplySubmitting);
    }

    if (state.replyTextarea) {
      state.replyTextarea.disabled = !hasTopic || state.isReplySubmitting;
      if (hasTopic) {
        state.replyTextarea.placeholder = isTargetedReply
          ? `回复 ${state.replyTargetLabel}... 支持 Markdown。Ctrl+Enter 或 Cmd+Enter 可发送`
          : `回复《${state.currentTopic.title || state.currentFallbackTitle || "当前主题"}》... 支持 Markdown。Ctrl+Enter 或 Cmd+Enter 可发送`;
      }
    }

    if (state.replyPanelTitle) {
      state.replyPanelTitle.textContent = isTargetedReply
        ? `回复 ${state.replyTargetLabel}`
        : "回复主题";
    }

    if (state.replySubmitButton) {
      state.replySubmitButton.disabled = !hasTopic || state.isReplySubmitting;
      state.replySubmitButton.textContent = state.isReplySubmitting ? "发送中..." : "发送回复";
    }

    if (state.replyCancelButton) {
      state.replyCancelButton.disabled = state.isReplySubmitting;
    }
  }

  function syncSettingsUI() {
    if (!state.settingsPanel) {
      return;
    }

    for (const control of state.settingsPanel.querySelectorAll("[data-setting]")) {
      const key = control.dataset.setting;
      if (key && key in state.settings) {
        control.value = state.settings[key];
      }
    }
  }

  function toggleSettingsPanel() {
    setSettingsPanelOpen(state.settingsPanel.hidden);
  }

  function handleSettingsPanelClick(event) {
    if (event.target === state.settingsPanel) {
      setSettingsPanelOpen(false);
    }
  }

  function setSettingsPanelOpen(isOpen) {
    if (!state.settingsPanel || !state.settingsToggle) {
      return;
    }

    if (isOpen) {
      updateSettingsPopoverPosition();
      queueMicrotask(() => state.settingsCard?.querySelector(".ld-setting-control")?.focus());
    }

    state.settingsPanel.hidden = !isOpen;
    state.settingsToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function handleSettingsChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    const key = target.dataset.setting;
    if (!key || !(key in state.settings)) {
      return;
    }

    state.settings[key] = target.value;
    saveSettings();

    if (key === "drawerWidth") {
      applyDrawerWidth();
      syncSettingsUI();
      setSettingsPanelOpen(false);
      return;
    }

    if (key === "drawerMode") {
      applyDrawerMode();
      setSettingsPanelOpen(false);
      return;
    }

    refreshCurrentView();
    setSettingsPanelOpen(false);
  }

  function resetSettings() {
    state.settings = { ...DEFAULT_SETTINGS };
    syncSettingsUI();
    saveSettings();
    applyDrawerWidth();
    applyDrawerMode();
    refreshCurrentView();
    setSettingsPanelOpen(false);
  }

  function applyDrawerWidth() {
    const width = state.settings.drawerWidth === "custom"
      ? `${clampDrawerWidth(state.settings.drawerWidthCustom)}px`
      : (DRAWER_WIDTHS[state.settings.drawerWidth] || DRAWER_WIDTHS.medium);

    document.documentElement.style.setProperty(
      "--ld-drawer-width",
      width
    );

    updateSettingsPopoverPosition();
  }

  function applyDrawerMode() {
    const isOverlay = state.settings.drawerMode === "overlay";
    document.body.classList.toggle("ld-drawer-mode-overlay", isOverlay);
  }

  function clampDrawerWidth(value) {
    const numeric = Number(value);
    const maxWidth = Math.min(1400, Math.max(420, window.innerWidth - 40));

    if (!Number.isFinite(numeric)) {
      return Math.min(DEFAULT_SETTINGS.drawerWidthCustom, maxWidth);
    }

    return Math.min(Math.max(Math.round(numeric), 320), maxWidth);
  }

  function startDrawerResize(event) {
    if (event.button !== 0 || window.innerWidth <= 720) {
      return;
    }

    event.preventDefault();
    state.isResizing = true;
    document.body.classList.add("ld-drawer-resizing");
    state.settings.drawerWidth = "custom";
    syncSettingsUI();
    updateCustomDrawerWidth(event.clientX);
    state.resizeHandle?.setPointerCapture?.(event.pointerId);
  }

  function handleDrawerResizeMove(event) {
    if (!state.isResizing) {
      return;
    }

    event.preventDefault();
    updateCustomDrawerWidth(event.clientX);
  }

  function stopDrawerResize(event) {
    if (!state.isResizing) {
      return;
    }

    state.isResizing = false;
    document.body.classList.remove("ld-drawer-resizing");
    saveSettings();

    if (event?.pointerId !== undefined && state.resizeHandle?.hasPointerCapture?.(event.pointerId)) {
      state.resizeHandle.releasePointerCapture(event.pointerId);
    }
  }

  function updateCustomDrawerWidth(clientX) {
    state.settings.drawerWidth = "custom";
    state.settings.drawerWidthCustom = clampDrawerWidth(window.innerWidth - clientX);
    applyDrawerWidth();
  }

  function updateSettingsPopoverPosition() {
    if (!state.header || !state.settingsPanel) {
      return;
    }

    state.root.style.setProperty("--ld-settings-top", `${state.header.offsetHeight + 8}px`);
  }

  function handleWindowResize() {
    if (state.settings.drawerWidth === "custom") {
      state.settings.drawerWidthCustom = clampDrawerWidth(state.settings.drawerWidthCustom);
      applyDrawerWidth();
      saveSettings();
    } else {
      updateSettingsPopoverPosition();
    }
  }

  function watchLocationChanges() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      queueMicrotask(handleLocationChange);
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      queueMicrotask(handleLocationChange);
      return result;
    };

    window.addEventListener("popstate", handleLocationChange, true);

    let syncQueued = false;
    const queueNavigationSync = () => {
      if (syncQueued) {
        return;
      }

      syncQueued = true;
      requestAnimationFrame(() => {
        syncQueued = false;
        syncNavigationState();
      });
    };

    const observer = new MutationObserver(() => {
      if (location.href !== state.lastLocation) {
        handleLocationChange();
      } else if (state.currentUrl) {
        queueNavigationSync();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function hasPreviewableTopicLinks() {
    return getTopicEntries().length > 0;
  }

  function handleLocationChange() {
    state.lastLocation = location.href;

    if (!hasPreviewableTopicLinks()) {
      closeDrawer();
      return;
    }

    syncNavigationState();
  }

  init();
})();
