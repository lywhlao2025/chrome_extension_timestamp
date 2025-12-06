const inputEl = document.getElementById("input");
const convertBtn = document.getElementById("convert");
const resultEl = document.getElementById("result");
const toastEl = document.getElementById("toast");
const addTzBtn = document.getElementById("add-tz");

// Offsets in minutes relative to UTC. First entry is default and cannot be removed.
let timezones = [];

let lastTimestampMs = null;
let lastEditedIndex = null;
let lastEditedSource = "timestamp"; // "timestamp" | "row"
const DATE_FORMAT_HELP = "YYYY-MM-DD HH:mm:ss";

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1400);
}

function parseTimestamp(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "请输入时间戳" };

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return { error: "不是有效数字" };

  // 10 digits: seconds; 13 digits: milliseconds.
  const isSeconds = trimmed.length <= 10;
  const millis = isSeconds ? numeric * 1000 : numeric;

  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return { error: "无法解析时间" };

  return { date, millis };
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

function labelWithOffset(tz) {
  const base = tz.label || formatOffset(tz.offsetMinutes);
  return `${base}（${formatOffset(tz.offsetMinutes)}）`;
}

const PRESET_ZONES = [
  { offsetMinutes: -12 * 60, label: "贝克岛" },
  { offsetMinutes: -11 * 60, label: "纽埃" },
  { offsetMinutes: -10 * 60, label: "檀香山" },
  { offsetMinutes: -9 * 60, label: "阿拉斯加" },
  { offsetMinutes: -8 * 60, label: "洛杉矶" },
  { offsetMinutes: -7 * 60, label: "丹佛" },
  { offsetMinutes: -6 * 60, label: "芝加哥" },
  { offsetMinutes: -5 * 60, label: "纽约/多伦多" },
  { offsetMinutes: -4 * 60, label: "圣保罗/大西洋" },
  { offsetMinutes: -3 * 60, label: "布宜诺斯艾利斯" },
  { offsetMinutes: -2 * 60, label: "南乔治亚" },
  { offsetMinutes: -1 * 60, label: "亚速尔群岛" },
  { offsetMinutes: 0, label: "伦敦" },
  { offsetMinutes: 1 * 60, label: "柏林/巴黎" },
  { offsetMinutes: 2 * 60, label: "雅典/开罗" },
  { offsetMinutes: 3 * 60, label: "莫斯科/内罗毕" },
  { offsetMinutes: 4 * 60, label: "迪拜" },
  { offsetMinutes: 5 * 60, label: "伊斯兰堡" },
  { offsetMinutes: 6 * 60, label: "达卡" },
  { offsetMinutes: 7 * 60, label: "曼谷" },
  { offsetMinutes: 8 * 60, label: "北京/新加坡" },
  { offsetMinutes: 9 * 60, label: "东京/首尔" },
  { offsetMinutes: 10 * 60, label: "悉尼" },
  { offsetMinutes: 11 * 60, label: "所罗门群岛" },
  { offsetMinutes: 12 * 60, label: "奥克兰" },
  { offsetMinutes: 13 * 60, label: "汤加" },
  { offsetMinutes: 14 * 60, label: "基里巴斯" }
];

function findPresetLabel(offsetMinutes) {
  const found = PRESET_ZONES.find((z) => z.offsetMinutes === offsetMinutes);
  return found ? found.label : formatOffset(offsetMinutes);
}

function toParts(timestampMs, offsetMinutes) {
  // Shift by offset then read UTC parts; this effectively gives local time for that offset.
  const d = new Date(timestampMs + offsetMinutes * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds()
  };
}

function partsToTimestamp(parts, offsetMinutes) {
  const { year, month, day, hour, minute, second } = parts;
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return baseUtc - offsetMinutes * 60 * 1000;
}

function formatDateString(timestampMs, offsetMinutes) {
  const { year, month, day, hour, minute, second } = toParts(timestampMs, offsetMinutes);
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function getTimeColors(timestampMs, offsetMinutes) {
  const d = new Date(timestampMs + offsetMinutes * 60 * 1000);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;

  // Gentle palettes by phase
  if (hour >= 6 && hour < 12) {
    return { color1: "rgba(255, 122, 122, 0.32)", color2: "rgba(255, 122, 122, 0.12)" }; // morning red tint
  }
  if (hour >= 12 && hour < 18) {
    return { color1: "rgba(255, 204, 102, 0.32)", color2: "rgba(255, 204, 102, 0.12)" }; // afternoon yellow tint
  }
  if (hour >= 18 && hour < 21) {
    return { color1: "rgba(255, 170, 102, 0.28)", color2: "rgba(255, 150, 80, 0.1)" }; // dusk warm
  }
  // Night/dawn darker
  return { color1: "rgba(36, 42, 58, 0.38)", color2: "rgba(20, 24, 35, 0.18)" };
}

function saveTimezones() {
  try {
    localStorage.setItem("timezones", JSON.stringify(timezones));
  } catch (e) {
    console.warn("Failed to save timezones", e);
  }
}

function loadTimezones() {
  try {
    const raw = localStorage.getItem("timezones");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        timezones = parsed;
        return;
      }
    }
  } catch (e) {
    console.warn("Failed to load timezones", e);
  }
  timezones = [{ label: "北京/新加坡", offsetMinutes: 8 * 60, editableOffset: true }];
}

function parseDateString(str) {
  const trimmed = str.trim();
  // Accept "YYYY-MM-DD HH:mm:ss" with flexible separators.
  const re = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const m = trimmed.match(re);
  if (!m) return { error: `格式应为 ${DATE_FORMAT_HELP}` };
  const [_, y, mo, d, h, mi, s] = m;
  return {
    parts: {
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour: Number(h),
      minute: Number(mi),
      second: Number(s)
    }
  };
}

function renderResults(timestampMs) {
  resultEl.innerHTML = "";
  timezones.forEach((tz, idx) => {
    const row = document.createElement("div");
    row.className = "tz-row";
    const { color1, color2 } = getTimeColors(timestampMs, tz.offsetMinutes);
    row.style.setProperty("--accent1", color1);
    row.style.setProperty("--accent2", color2);

    const labelWrap = document.createElement("div");
    labelWrap.className = "tz-label-wrap";

    let labelEl = null;
    if (!tz.editableOffset) {
      labelEl = document.createElement("span");
      labelEl.className = "tz-label";
      labelEl.textContent = labelWithOffset(tz);
      labelWrap.append(labelEl);
    }

    if (tz.editableOffset) {
      const select = document.createElement("select");
      select.className = "tz-select";
      buildOffsetOptions(select, tz.offsetMinutes);
      select.addEventListener("change", () => {
        tz.offsetMinutes = Number(select.value);
        tz.label = select.selectedOptions[0]?.dataset.name || findPresetLabel(tz.offsetMinutes);
        if (labelEl) labelEl.textContent = labelWithOffset(tz);
        if (lastTimestampMs !== null) renderResults(lastTimestampMs);
        saveTimezones();
      });
      labelWrap.append(select);
    }

    const timeInput = document.createElement("input");
    timeInput.type = "text";
    timeInput.className = "time-input";
    timeInput.value = formatDateString(timestampMs, tz.offsetMinutes);
    timeInput.placeholder = DATE_FORMAT_HELP;
    timeInput.dataset.tzIndex = idx;
    timeInput.addEventListener("input", () => {
      lastEditedIndex = idx;
      lastEditedSource = "row";
    });

    if (idx > 0) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "×";
      removeBtn.title = "删除时区";
      removeBtn.addEventListener("click", () => {
        const ok = confirm("确定删除该时区吗？");
        if (!ok) return;
        timezones.splice(idx, 1);
        saveTimezones();
        renderResults(lastTimestampMs);
      });
      row.append(removeBtn);
    }

    row.append(labelWrap, timeInput);
    resultEl.appendChild(row);
  });
}

function readDateStringFromRow(idx) {
  const input = resultEl.querySelector(`input[data-tz-index="${idx}"]`);
  if (!input) return { error: "未找到对应行" };
  const parsed = parseDateString(input.value);
  if (parsed.error) return parsed;
  return parsed;
}

function highlightElements(elements) {
  elements.forEach((el) => {
    if (!el) return;
    el.classList.add("sun-highlight");
    setTimeout(() => el.classList.remove("sun-highlight"), 500);
  });
}

function convertInput(suppressHighlight = false) {
  let baseMs;
  const source = lastEditedSource;
  const sourceIndex = lastEditedIndex;

  if (lastEditedSource === "row" && lastEditedIndex !== null && timezones[lastEditedIndex]) {
    const { parts, error } = readDateStringFromRow(lastEditedIndex);
    if (error) {
      resultEl.textContent = error;
      return;
    }
    baseMs = partsToTimestamp(parts, timezones[lastEditedIndex].offsetMinutes);
    inputEl.value = Math.round(baseMs); // reflect back in input
  } else {
    const { error, millis } = parseTimestamp(inputEl.value);
    if (error) {
      resultEl.textContent = error;
      return;
    }
    baseMs = millis;
  }

  lastTimestampMs = baseMs;
  lastEditedSource = "timestamp";
  renderResults(baseMs);
  if (!suppressHighlight) {
    if (source === "timestamp") {
      const rows = Array.from(resultEl.querySelectorAll(".tz-row"));
      highlightElements(rows);
    } else {
      const rows = Array.from(resultEl.querySelectorAll(".tz-row")).filter((_, i) => i !== sourceIndex);
      highlightElements([inputEl, ...rows]);
    }
  }
}

function addTimezone() {
  // Ensure we have a base timestamp to render.
  if (lastTimestampMs === null) {
    const parsed = parseTimestamp(inputEl.value || "");
    if (parsed.error) {
      showToast("先输入时间戳再添加时区");
      return;
    }
    lastTimestampMs = parsed.millis;
  }

  const offsetMinutes = 0;
  timezones.push({
    label: findPresetLabel(offsetMinutes),
    offsetMinutes,
    editableOffset: true
  });
  saveTimezones();
  renderResults(lastTimestampMs);
}

convertBtn.addEventListener("click", () => convertInput());
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") convertInput();
});
inputEl.addEventListener("input", () => {
  lastEditedSource = "timestamp";
  lastEditedIndex = null;
});
addTzBtn.addEventListener("click", addTimezone);

function buildOffsetOptions(select, currentMinutes) {
  select.innerHTML = "";
  PRESET_ZONES.forEach((zone) => {
    const option = document.createElement("option");
    option.value = zone.offsetMinutes;
    option.dataset.name = zone.label;
    option.textContent = `${zone.label}（${formatOffset(zone.offsetMinutes)}）`;
    if (zone.offsetMinutes === currentMinutes) option.selected = true;
    select.append(option);
  });
}

function initWithNow() {
  const now = Date.now();
  inputEl.value = now.toString();
  convertInput(true);
}

loadTimezones();
initWithNow();
