const AI_NAMES = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  perplexity: "Perplexity",
  grok: "Grok",
  zai: "z.ai",
};

// Short, relatable comparison for an amount of water (ml).
function equivalentText(ml) {
  if (ml <= 0) return "Nothing yet.";
  const glasses = ml / 250;        // a drinking glass ≈ 250 ml
  const drinkingDays = ml / 2700;  // ~2.7 L drinking water per person/day
  if (drinkingDays >= 1) return `≈ ${drinkingDays.toFixed(1)} days of a person's drinking water`;
  if (glasses >= 1) return `≈ ${glasses.toFixed(1)} glasses of water`;
  return `≈ ${glasses.toFixed(2)} of a glass of water`;
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function render() {
  chrome.storage.local.get(["historiqueSaisie", "totalWater"], (result) => {
    const total = result.totalWater || 0;
    const history = result.historiqueSaisie || [];

    document.getElementById("total").innerText = total.toFixed(1);
    document.getElementById("equivalent").innerText = equivalentText(total);

    renderByAI(history);
    renderHistory(history);
  });
}

// Sum water per AI and list only the AIs that have used water,
// most water first.
function renderByAI(history) {
  const totals = {};
  history.forEach((e) => {
    totals[e.site] = (totals[e.site] || 0) + (e.water || 0);
  });

  const list = document.getElementById("byai");
  list.innerHTML = "";

  const used = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (!used.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.innerText = "No AI used yet.";
    list.appendChild(li);
    return;
  }

  used.forEach(([key, ml]) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.innerText = AI_NAMES[key] || key;

    const amount = document.createElement("span");
    amount.className = "amount";
    amount.innerText = `${ml.toFixed(1)} ml`;

    li.appendChild(name);
    li.appendChild(amount);
    list.appendChild(li);
  });
}

function renderHistory(history) {
  const list = document.getElementById("history");
  list.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.innerText = "No prompts captured yet.";
    list.appendChild(li);
    return;
  }

  history.slice().reverse().forEach((entry) => {
    const li = document.createElement("li");

    const left = document.createElement("div");
    left.innerHTML =
      `<span class="site">${entry.site}</span>` +
      `<div class="meta">${entry.chars} chars · ${timeAgo(entry.date)}</div>`;

    const right = document.createElement("span");
    right.className = "amount";
    right.innerText = `${entry.water} ml`;

    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
}

// Guarded so a missing button never crashes rendering.
const clearBtn = document.getElementById("clear");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    chrome.storage.local.set({ historiqueSaisie: [], totalWater: 0 }, render);
  });
}

render();
