const CONSUMPTION_PER_100_CHARS = {
  "claude": 4.0,
  "chatgpt": 1.5,
  "gemini": 1.2,
  "deepseek": 15.0,
  "mistral": 6.0,
  "perplexity": 8.0,
  "grok": 8.0,
  "zai": 1.0,
};

const SITES = [
  {
    key: "chatgpt",
    hosts: ["chat.openai.com", "chatgpt.com"],
    inputSelectors: [
      "#prompt-textarea",
      "textarea[data-id]",
      "form textarea",
    ],
  },
  {
    key: "claude",
    hosts: ["claude.ai"],
    inputSelectors: [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"]',
      "textarea",
    ],
  },
  {
    key: "gemini",
    hosts: ["gemini.google.com", "bard.google.com"],
    inputSelectors: [
      "div.ql-editor[contenteditable='true']",
      'div[contenteditable="true"]',
      "textarea",
    ],
  },
  {
    key: "deepseek",
    hosts: ["chat.deepseek.com", "deepseek.com"],
    inputSelectors: [
      "textarea#chat-input",
      'textarea[placeholder*="Message" i]',
      "textarea",
    ],
  },
  {
    key: "mistral",
    hosts: ["chat.mistral.ai", "mistral.ai"],
    inputSelectors: [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"]',
      "textarea",
    ],
  },
  {
    key: "perplexity",
    hosts: ["perplexity.ai"],
    inputSelectors: [
      'textarea[placeholder*="Ask" i]',
      'div[contenteditable="true"]',
      "textarea",
    ],
  },
  {
    key: "grok",
    hosts: ["grok.com", "x.ai"],
    inputSelectors: [
      'textarea[aria-label*="Grok" i]',
      'div[contenteditable="true"]',
      "textarea",
    ],
  },
  {
    key: "zai",
    hosts: ["chat.z.ai", "z.ai"],
    inputSelectors: [
      'textarea[placeholder*="Message" i]',
      'div[contenteditable="true"]',
      "textarea",
    ],
  },
];


function detectSite() {
  const host = window.location.hostname;
  return SITES.find((s) => s.hosts.some((h) => host.includes(h))) || null;
}


function readPromptText(site) {
  for (const selector of site.inputSelectors) {
    const el = document.querySelector(selector);
    if (!el) continue;

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      if (el.value && el.value.trim()) return el.value.trim();
    }

    if (el.isContentEditable) {
      const text = (el.innerText || el.textContent || "").trim();
      if (text) return text;
    }
  }
  return "";
}

function estimateWater(siteKey, text) {
  const rate = CONSUMPTION_PER_100_CHARS[siteKey] || 0;
  return (text.length / 100) * rate;
}

function saveCapture(siteKey, text) {
  const water = estimateWater(siteKey, text);

  // Ignore prompts too small to register (would show as "0.0 ml").
  if (water < 0.05) return;

  chrome.storage.local.get(["historiqueSaisie", "totalWater"], (result) => {
    const historique = result.historiqueSaisie || [];
    const total = (result.totalWater || 0) + water;

    historique.push({
      date: new Date().toISOString(),
      site: siteKey,
      url: window.location.href,
      chars: text.length,
      water: Number(water.toFixed(2)),
    });

    chrome.storage.local.set(
      { historiqueSaisie: historique, totalWater: total },
      () => {
        console.log(
          `[WaterIntelligence] +${water.toFixed(2)} ml (${text.length} chars) → total ${total.toFixed(2)} ml`
        );
        updateOverlay(total);
      }
    );
  });
}

let overlayEl = null;

function ensureOverlay() {
  if (overlayEl && document.body.contains(overlayEl)) return overlayEl;
  overlayEl = document.createElement("div");
  overlayEl.id = "mon-extension-overlay";
  document.body.appendChild(overlayEl);
  return overlayEl;
}

function updateOverlay(total) {
  const el = ensureOverlay();
  el.innerText = `💧 ${total.toFixed(1)} ml`;
}

const site = detectSite();

if (site) {
  console.log(`[WaterIntelligence] Active on ${site.key} (${window.location.hostname})`);

  chrome.storage.local.get(["totalWater"], (r) => updateOverlay(r.totalWater || 0));

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      const text = readPromptText(site);
      if (text) saveCapture(site.key, text);
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(
        'button[data-testid="send-button"], ' +
          'button[aria-label*="Send" i], ' +
          'button[aria-label*="Envoyer" i], ' +
          'button[type="submit"]'
      );
      if (!btn) return;
      const text = readPromptText(site);
      if (text) saveCapture(site.key, text);
    },
    true
  );
} else {
  console.log("[WaterIntelligence] No supported AI site detected on this page.");
}
