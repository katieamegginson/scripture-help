(function () {
  const HISTORY_KEY = "scripture-help-history";
  const SAVED_KEY = "scripture-help-saved";
  const MAX_HISTORY = 18;

  const elements = {
    lookupForm: document.querySelector("#lookupForm"),
    promptInput: document.querySelector("#promptInput"),
    submitButton: document.querySelector("#submitButton"),
    clearButton: document.querySelector("#clearButton"),
    seedPromptButton: document.querySelector("#seedPromptButton"),
    promptSuggestions: document.querySelector("#promptSuggestions"),
    emptyState: document.querySelector("#emptyState"),
    resultsContainer: document.querySelector("#resultsContainer"),
    resultsMeta: document.querySelector("#resultsMeta"),
    savedContainer: document.querySelector("#savedContainer"),
    savedCount: document.querySelector("#savedCount"),
    historyContainer: document.querySelector("#historyContainer"),
    historyCount: document.querySelector("#historyCount"),
    resultCardTemplate: document.querySelector("#resultCardTemplate"),
    serverStatus: document.querySelector("#serverStatus"),
    installButton: document.querySelector("#installButton"),
    installHint: document.querySelector("#installHint"),
  };

  const state = {
    history: readFromStorage(HISTORY_KEY, []),
    saved: readFromStorage(SAVED_KEY, []),
    activeRequest: null,
    installPrompt: null,
    serverConfigured: false,
    accessVerified: false,
    bibleVersion: "NIV",
  };

  renderPromptSuggestions();
  renderHistory();
  renderSaved();
  bindEvents();
  hydrateServerStatus();
  registerServiceWorker();

  function bindEvents() {
    elements.lookupForm.addEventListener("submit", handleLookup);
    elements.clearButton.addEventListener("click", clearComposer);
    elements.seedPromptButton.addEventListener("click", seedPrompt);
    elements.installButton.addEventListener("click", installApp);

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      elements.installButton.hidden = false;
      elements.installHint.textContent = "Install Scripture Help for one-tap access on your phone.";
    });

    window.addEventListener("appinstalled", () => {
      state.installPrompt = null;
      elements.installButton.hidden = true;
      elements.installHint.textContent = "Installed. Scripture Help will now feel like a native app.";
    });
  }

  function renderPromptSuggestions() {
    elements.promptSuggestions.innerHTML = "";

    window.PROMPT_EXAMPLES.forEach((prompt) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = prompt;
      button.addEventListener("click", () => {
        elements.promptInput.value = prompt;
        elements.promptInput.focus();
      });
      elements.promptSuggestions.appendChild(button);
    });
  }

  async function hydrateServerStatus() {
    try {
      const response = await fetch("/api/status");

      if (!response.ok) {
        throw new Error("Status request failed");
      }

      const payload = await response.json();
      state.serverConfigured = payload.configured;
      state.accessVerified = Boolean(payload.accessVerified);
      state.bibleVersion = payload.bibleVersion || "NIV";
      elements.serverStatus.textContent = payload.message;
    } catch (error) {
      elements.serverStatus.textContent =
        "Could not reach the backend. Start the server to enable live NIV lookups.";
    }
  }

  async function handleLookup(event) {
    event.preventDefault();

    const prompt = elements.promptInput.value.trim();

    if (!prompt) {
      elements.promptInput.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Recommendation request failed");
      }

      const payload = await response.json();
      state.activeRequest = payload;
      state.history = [payload, ...state.history].slice(0, MAX_HISTORY);
      writeToStorage(HISTORY_KEY, state.history);

      renderResults(payload);
      renderHistory();
      if (payload.warning) {
        elements.serverStatus.textContent = payload.warning;
      }
    } catch (error) {
      const fallback = buildOfflineFallback(prompt);
      state.activeRequest = fallback;
      state.history = [fallback, ...state.history].slice(0, MAX_HISTORY);
      writeToStorage(HISTORY_KEY, state.history);
      renderResults(fallback);
      renderHistory();
      elements.serverStatus.textContent =
        "Backend unavailable, so the app used local reference suggestions only.";
    } finally {
      setLoading(false);
    }
  }

  function buildOfflineFallback(prompt) {
    const insight = window.ScriptureEngine.buildRecommendationSet(prompt);

    return {
      id: crypto.randomUUID(),
      prompt,
      createdAt: new Date().toISOString(),
      themes: insight.topics.map((topic) => topic.label),
      verses: insight.recommendations.map((item) => ({
        ...item,
        text: "",
        sourceMode: "reference-only",
      })),
      bibleVersion: state.bibleVersion,
      sourceConfigured: false,
    };
  }

  function renderResults(request) {
    elements.emptyState.hidden = true;
    elements.resultsContainer.innerHTML = "";
    elements.resultsMeta.textContent = `${request.verses.length} verses for ${request.themes.join(", ")}`;

    request.verses.forEach((verse) => {
      const fragment = elements.resultCardTemplate.content.cloneNode(true);
      const reference = fragment.querySelector(".verse-reference");
      const theme = fragment.querySelector(".verse-theme");
      const text = fragment.querySelector(".verse-text");
      const summary = fragment.querySelector(".verse-summary");
      const saveToggle = fragment.querySelector(".save-toggle");
      const copyButton = fragment.querySelector(".copy-button");

      reference.textContent = verse.reference;
      theme.textContent = verse.topicLabel;
      text.textContent = verse.text || `${request.bibleVersion || "NIV"} verse text will appear here when the backend is configured.`;
      summary.textContent = verse.summary;

      const isSaved = state.saved.some((item) => item.reference === verse.reference);
      saveToggle.textContent = isSaved ? "Saved" : "Save";
      saveToggle.addEventListener("click", () => {
        toggleSavedVerse(verse);
        renderResults(state.activeRequest);
      });

      copyButton.addEventListener("click", async () => {
        const payload = verse.text
          ? `${verse.reference}\n\n${verse.text}`
          : `${verse.reference}\n\n${verse.summary}`;

        await navigator.clipboard.writeText(payload);
        copyButton.textContent = "Copied";
        window.setTimeout(() => {
          copyButton.textContent = "Copy";
        }, 1200);
      });

      elements.resultsContainer.appendChild(fragment);
    });
  }

  function renderHistory() {
    elements.historyContainer.innerHTML = "";
    elements.historyContainer.classList.toggle("empty-list", state.history.length === 0);
    elements.historyCount.textContent = `${state.history.length} item${state.history.length === 1 ? "" : "s"}`;

    state.history.forEach((entry) => {
      const card = document.createElement("article");
      const title = document.createElement("h3");
      const meta = document.createElement("p");
      const prompt = document.createElement("p");
      const actions = document.createElement("div");
      const reopen = document.createElement("button");

      card.className = "history-card";
      actions.className = "history-actions";
      title.textContent = entry.themes.join(", ");
      meta.className = "history-meta";
      meta.textContent = `${formatDate(entry.createdAt)} • ${entry.verses.map((verse) => verse.reference).join(", ")}`;
      prompt.textContent = entry.prompt;

      reopen.type = "button";
      reopen.className = "ghost-button";
      reopen.textContent = "Reload";
      reopen.addEventListener("click", () => {
        state.activeRequest = entry;
        elements.promptInput.value = entry.prompt;
        renderResults(entry);
      });

      actions.appendChild(reopen);
      card.append(title, meta, prompt, actions);
      elements.historyContainer.appendChild(card);
    });
  }

  function renderSaved() {
    elements.savedContainer.innerHTML = "";
    elements.savedContainer.classList.toggle("empty-list", state.saved.length === 0);
    elements.savedCount.textContent = `${state.saved.length} saved`;

    state.saved.forEach((verse) => {
      const card = document.createElement("article");
      const top = document.createElement("div");
      const heading = document.createElement("div");
      const reference = document.createElement("p");
      const theme = document.createElement("p");
      const text = document.createElement("p");
      const summary = document.createElement("p");
      const actions = document.createElement("div");
      const removeButton = document.createElement("button");
      const copyButton = document.createElement("button");

      card.className = "saved-card";
      top.className = "saved-card-top";
      actions.className = "saved-actions";
      reference.className = "saved-reference";
      theme.className = "verse-theme";
      text.className = "saved-text";
      summary.className = "saved-summary";

      reference.textContent = verse.reference;
      theme.textContent = verse.topicLabel;
      text.textContent = verse.text || "Saved as a reference until live verse text is available.";
      summary.textContent = verse.summary;

      removeButton.type = "button";
      removeButton.className = "ghost-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        state.saved = state.saved.filter((item) => item.reference !== verse.reference);
        writeToStorage(SAVED_KEY, state.saved);
        renderSaved();
        if (state.activeRequest) {
          renderResults(state.activeRequest);
        }
      });

      copyButton.type = "button";
      copyButton.className = "secondary-button";
      copyButton.textContent = "Copy";
      copyButton.addEventListener("click", async () => {
        const payload = verse.text
          ? `${verse.reference}\n\n${verse.text}`
          : `${verse.reference}\n\n${verse.summary}`;
        await navigator.clipboard.writeText(payload);
      });

      heading.append(reference, theme);
      top.append(heading);
      actions.append(removeButton, copyButton);
      card.append(top, text, summary, actions);
      elements.savedContainer.appendChild(card);
    });
  }

  function toggleSavedVerse(verse) {
    const existing = state.saved.find((item) => item.reference === verse.reference);

    if (existing) {
      state.saved = state.saved.filter((item) => item.reference !== verse.reference);
    } else {
      state.saved = [
        {
          reference: verse.reference,
          text: verse.text,
          summary: verse.summary,
          topicLabel: verse.topicLabel,
          sourceMode: verse.sourceMode,
        },
        ...state.saved,
      ];
    }

    writeToStorage(SAVED_KEY, state.saved);
    renderSaved();
  }

  async function installApp() {
    if (!state.installPrompt) {
      elements.installHint.textContent =
        "On iPhone, tap Share in Safari and choose Add to Home Screen.";
      return;
    }

    await state.installPrompt.prompt();
    state.installPrompt = null;
    elements.installButton.hidden = true;
  }

  function clearComposer() {
    elements.promptInput.value = "";
    elements.promptInput.focus();
  }

  function seedPrompt() {
    const examples = window.PROMPT_EXAMPLES;
    const randomIndex = Math.floor(Math.random() * examples.length);
    elements.promptInput.value = examples[randomIndex];
    elements.promptInput.focus();
  }

  function setLoading(isLoading) {
    elements.submitButton.disabled = isLoading;
    elements.submitButton.textContent = isLoading ? "Searching..." : "Find Scripture";
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      elements.installHint.textContent =
        "Service worker registration failed, so offline support is unavailable right now.";
    }
  }

  function formatDate(isoString) {
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function readFromStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeToStorage(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
})();
