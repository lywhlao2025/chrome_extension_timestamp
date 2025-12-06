import { useEffect, useMemo, useState } from "react";
import "./index.css";

type Source = "timestamp" | "row";

type TimezoneEntry = {
  id: string;
  label: string;
  offsetMinutes: number;
  editableOffset: boolean;
};

type HighlightState = {
  timestamp: boolean;
  rows: string[];
};

type Strings = {
  inputLabel: string;
  placeholder: string;
  convert: string;
  addTz: string;
  encourage: string;
  deleteConfirm: string;
  errTimestampEmpty: string;
  errTimestampNaN: string;
  errTimestampInvalid: string;
  errDateFormat: string;
};

const STORAGE_KEY = "timezones";

type PresetZone = { offsetMinutes: number; labelZh: string; labelEn: string };

const PRESET_ZONES: PresetZone[] = [
  { offsetMinutes: -12 * 60, labelZh: "贝克岛", labelEn: "Baker Island" },
  { offsetMinutes: -11 * 60, labelZh: "纽埃", labelEn: "Niue" },
  { offsetMinutes: -10 * 60, labelZh: "檀香山", labelEn: "Honolulu" },
  { offsetMinutes: -9 * 60, labelZh: "阿拉斯加", labelEn: "Alaska" },
  { offsetMinutes: -8 * 60, labelZh: "洛杉矶", labelEn: "Los Angeles" },
  { offsetMinutes: -7 * 60, labelZh: "丹佛", labelEn: "Denver" },
  { offsetMinutes: -6 * 60, labelZh: "芝加哥", labelEn: "Chicago" },
  { offsetMinutes: -5 * 60, labelZh: "纽约/多伦多", labelEn: "New York/Toronto" },
  { offsetMinutes: -4 * 60, labelZh: "圣保罗/大西洋", labelEn: "Sao Paulo/Atlantic" },
  { offsetMinutes: -3 * 60, labelZh: "布宜诺斯艾利斯", labelEn: "Buenos Aires" },
  { offsetMinutes: -2 * 60, labelZh: "南乔治亚", labelEn: "South Georgia" },
  { offsetMinutes: -1 * 60, labelZh: "亚速尔群岛", labelEn: "Azores" },
  { offsetMinutes: 0, labelZh: "伦敦", labelEn: "London" },
  { offsetMinutes: 1 * 60, labelZh: "柏林/巴黎", labelEn: "Berlin/Paris" },
  { offsetMinutes: 2 * 60, labelZh: "雅典/开罗", labelEn: "Athens/Cairo" },
  { offsetMinutes: 3 * 60, labelZh: "莫斯科/内罗毕", labelEn: "Moscow/Nairobi" },
  { offsetMinutes: 4 * 60, labelZh: "迪拜", labelEn: "Dubai" },
  { offsetMinutes: 5 * 60, labelZh: "伊斯兰堡", labelEn: "Islamabad" },
  { offsetMinutes: 6 * 60, labelZh: "达卡", labelEn: "Dhaka" },
  { offsetMinutes: 7 * 60, labelZh: "曼谷", labelEn: "Bangkok" },
  { offsetMinutes: 8 * 60, labelZh: "北京/新加坡", labelEn: "Beijing/Singapore" },
  { offsetMinutes: 9 * 60, labelZh: "东京/首尔", labelEn: "Tokyo/Seoul" },
  { offsetMinutes: 10 * 60, labelZh: "悉尼", labelEn: "Sydney" },
  { offsetMinutes: 11 * 60, labelZh: "所罗门群岛", labelEn: "Solomon Islands" },
  { offsetMinutes: 12 * 60, labelZh: "奥克兰", labelEn: "Auckland" },
  { offsetMinutes: 13 * 60, labelZh: "汤加", labelEn: "Tonga" },
  { offsetMinutes: 14 * 60, labelZh: "基里巴斯", labelEn: "Kiribati" }
];

const DEFAULT_TZ: TimezoneEntry = {
  id: "default",
  label: "北京/新加坡",
  offsetMinutes: 8 * 60,
  editableOffset: true
};

const DATE_FORMAT_HELP = "YYYY-MM-DD HH:mm:ss";

function getStrings(isZh: boolean): Strings {
  if (isZh) {
    return {
      inputLabel: "输入时间戳（秒或毫秒）",
      placeholder: "如 1700000000 或 1700000000000",
      convert: "转换",
      addTz: "添加时区",
      encourage: "鼓励一下",
      deleteConfirm: "确定删除该时区吗？",
      errTimestampEmpty: "请输入时间戳",
      errTimestampNaN: "不是有效数字",
      errTimestampInvalid: "无法解析时间",
      errDateFormat: `格式应为 ${DATE_FORMAT_HELP}`
    };
  }
  return {
    inputLabel: "Enter timestamp (seconds or ms)",
    placeholder: "e.g. 1700000000 or 1700000000000",
    convert: "Convert",
    addTz: "Add timezone",
    encourage: "Say thanks",
    deleteConfirm: "Remove this timezone?",
    errTimestampEmpty: "Please enter a timestamp",
    errTimestampNaN: "Not a valid number",
    errTimestampInvalid: "Cannot parse time",
    errDateFormat: `Format should be ${DATE_FORMAT_HELP}`
  };
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

function findPresetLabel(offsetMinutes: number, isZh: boolean) {
  const found = PRESET_ZONES.find((z) => z.offsetMinutes === offsetMinutes);
  if (!found) return formatOffset(offsetMinutes);
  return isZh ? found.labelZh : found.labelEn;
}

type ParseTimestampResult = { millis: number } | { error: string };

/**
 * Parse timestamp text (seconds or milliseconds).
 * @param raw user input string
 * @param strings localized strings for error messages
 * @returns { millis } on success, otherwise { error }
 */
function parseTimestampInput(raw: string, strings: Strings): ParseTimestampResult {
  const trimmed = raw.trim();
  if (!trimmed) return { error: strings.errTimestampEmpty };
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return { error: strings.errTimestampNaN };
  const isSeconds = trimmed.length <= 10;
  const millis = isSeconds ? numeric * 1000 : numeric;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return { error: strings.errTimestampInvalid };
  return { millis };
}

function toParts(timestampMs: number, offsetMinutes: number) {
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

/**
 * Format UTC ms + offset into "YYYY-MM-DD HH:mm:ss".
 */
function formatDateString(timestampMs: number, offsetMinutes: number) {
  const { year, month, day, hour, minute, second } = toParts(timestampMs, offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/**
 * Parse a date string "YYYY-MM-DD HH:mm:ss" or "YYYY/MM/DD HH:mm:ss".
 * @returns parts on success, or { error }
 */
function parseDateString(str: string, strings: Strings) {
  const trimmed = str.trim();
  const re = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const m = trimmed.match(re);
  if (!m) return { error: strings.errDateFormat };
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

/**
 * Convert parsed date fields + offset back to UTC milliseconds.
 * @param parts date parts from parseDateString
 * @param offsetMinutes timezone offset in minutes
 */
function partsToTimestamp(parts: ReturnType<typeof parseDateString>["parts"], offsetMinutes: number) {
  const { year, month, day, hour, minute, second } = parts!;
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return baseUtc - offsetMinutes * 60 * 1000;
}

/**
 * Return accent colors based on day segment (morning/afternoon/evening/night).
 */
function getTimeColors(timestampMs: number, offsetMinutes: number) {
  const d = new Date(timestampMs + offsetMinutes * 60 * 1000);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;

  if (hour >= 6 && hour < 12) {
    return { color1: "rgba(255, 122, 122, 0.32)", color2: "rgba(255, 122, 122, 0.12)" };
  }
  if (hour >= 12 && hour < 18) {
    return { color1: "rgba(255, 204, 102, 0.32)", color2: "rgba(255, 204, 102, 0.12)" };
  }
  if (hour >= 18 && hour < 21) {
    return { color1: "rgba(255, 170, 102, 0.28)", color2: "rgba(255, 150, 80, 0.1)" };
  }
  return { color1: "rgba(36, 42, 58, 0.38)", color2: "rgba(20, 24, 35, 0.18)" };
}

function loadSavedTimezones(): TimezoneEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TimezoneEntry[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [DEFAULT_TZ];
}

function saveTimezones(list: TimezoneEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function Toast({ text }: { text: string }) {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/85 px-3 py-2 text-xs text-white shadow-lg">
      {text}
    </div>
  );
}

function TimeRow(props: {
  tz: TimezoneEntry;
  index: number;
  value: string;
  accent: { color1: string; color2: string };
  options: { offsetMinutes: number; label: string }[];
  onTimeChange: (v: string) => void;
  onOffsetChange: (offset: number) => void;
  onRemove?: () => void;
  highlight: boolean;
}) {
  const { tz, index, value, accent, onTimeChange, onOffsetChange, onRemove, highlight, options } = props;
  const stripe = index % 2 === 0 ? "from-slate-50/70 to-slate-100/50" : "from-sky-50/60 to-sky-100/40";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b ${stripe} px-3 py-3 pr-12 shadow-sm ${highlight ? "sun-highlight" : ""}`}
    >
      <div
        className="pointer-events-none absolute -top-4 right-0 h-2/3 w-2/3 opacity-60"
        style={{
          background: `radial-gradient(circle at 90% 10%, ${accent.color1} 0%, ${accent.color2} 65%, transparent 100%)`
        }}
      />

      {onRemove && (
        <button
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-gray-100 text-sm font-semibold text-slate-500 hover:bg-gray-200"
          onClick={onRemove}
          title="删除时区"
        >
          ×
        </button>
      )}

      <div className="flex flex-col gap-2">
        <select
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
          value={tz.offsetMinutes}
          onChange={(e) => onOffsetChange(Number(e.target.value))}
        >
          {options.map((zone) => (
            <option key={zone.offsetMinutes} value={zone.offsetMinutes}>
              {zone.label}（{formatOffset(zone.offsetMinutes)}）
            </option>
          ))}
        </select>

        <input
          type="text"
          className={`w-full rounded-lg border border-slate-200 bg-white px-3 pt-3 pb-3 text-lg leading-6 font-mono text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 ${
            highlight ? "sun-highlight" : ""
          }`}
          value={value}
          onChange={(e) => onTimeChange(e.target.value)}
          placeholder={DATE_FORMAT_HELP}
        />
      </div>
    </div>
  );
}

function App() {
  const [timestampInput, setTimestampInput] = useState("");
  const [timezones, setTimezones] = useState<TimezoneEntry[]>([]);
  const [timeStrings, setTimeStrings] = useState<Record<string, string>>({});
  const [lastEdited, setLastEdited] = useState<{ source: Source; rowId?: string }>({ source: "timestamp" });
  const [lastTimestampMs, setLastTimestampMs] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<HighlightState>({ timestamp: false, rows: [] });
  const [toast, setToast] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TimezoneEntry | null>(null);
  const [langOverride, setLangOverride] = useState<"auto" | "zh" | "en">("auto");
  const isZh = useMemo(() => {
    if (langOverride === "zh") return true;
    if (langOverride === "en") return false;
    return navigator.language?.toLowerCase().startsWith("zh") ?? false;
  }, [langOverride]);
  const strings = useMemo(() => getStrings(isZh), [isZh]);

  useEffect(() => {
    const loaded = loadSavedTimezones();
    setTimezones(loaded);
    const now = Date.now();
    setTimestampInput(now.toString());
    setLastEdited({ source: "timestamp" });
    // Defer convert to next tick to ensure state is ready
    setTimeout(() => convert(true, loaded, now), 0);
  }, []);

  useEffect(() => {
    // 当语言切换时，同步预设区域的显示名称
    setTimezones((prev) =>
      prev.map((tz) => ({
        ...tz,
        label: findPresetLabel(tz.offsetMinutes, isZh)
      }))
    );
  }, [isZh]);

  useEffect(() => {
    saveTimezones(timezones);
  }, [timezones]);

  useEffect(() => {
    if (highlight.timestamp || highlight.rows.length) {
      const id = setTimeout(() => setHighlight({ timestamp: false, rows: [] }), 500);
      return () => clearTimeout(id);
    }
  }, [highlight]);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 1400);
  };

  const baseMs = useMemo(() => {
    if (lastTimestampMs !== null) return lastTimestampMs;
    const parsed = parseTimestampInput(timestampInput, strings);
    return "millis" in parsed ? parsed.millis : Date.now();
  }, [lastTimestampMs, timestampInput, strings]);

  /**
   * 核心转换：根据当前输入或行内编辑，计算基准 UTC 毫秒并刷新所有行。
   * @param suppressHighlight 是否跳过高亮动画
   * @param tzList 要更新的时区列表（默认当前 state）
   * @param overrideMs 外部指定的基准毫秒
   * @param edited 来源（timestamp 输入 or row 编辑），用于决定高亮
   */
  function convert(
    suppressHighlight = false,
    tzList: TimezoneEntry[] = timezones,
    overrideMs?: number | null,
    edited: { source: Source; rowId?: string } = lastEdited
  ) {
    const prevTimes = { ...timeStrings };
    let base = overrideMs ?? lastTimestampMs;
    if (edited.source === "row" && edited.rowId) {
      const currentStr = timeStrings[edited.rowId] ?? "";
      const parsed = parseDateString(currentStr, strings);
      if (parsed.error) {
        showToast(parsed.error);
        return;
      }
      const rowTz = tzList.find((t) => t.id === edited.rowId);
      if (!rowTz) return;
      base = partsToTimestamp(parsed.parts!, rowTz.offsetMinutes);
      setTimestampInput(Math.round(base).toString());
    } else {
      const parsed = parseTimestampInput(timestampInput, strings);
      if ("error" in parsed) {
        showToast(parsed.error);
        return;
      }
      base = parsed.millis;
    }

    if (base == null) return;

    const resolvedBase = base as number;
    const updatedTimes: Record<string, string> = {};
    const changedRows: string[] = [];
    tzList.forEach((tz) => {
      updatedTimes[tz.id] = formatDateString(resolvedBase, tz.offsetMinutes);
      if (prevTimes[tz.id] !== updatedTimes[tz.id]) changedRows.push(tz.id);
    });
    setTimeStrings(updatedTimes);
    setLastTimestampMs(resolvedBase);
    setLastEdited({ source: "timestamp" });

    if (!suppressHighlight) {
      if (edited.source === "timestamp") {
        setHighlight({ timestamp: false, rows: changedRows });
      } else {
        const otherChangedRows = changedRows.filter((id) => id !== edited.rowId);
        const timestampChanged = resolvedBase !== lastTimestampMs;
        setHighlight({ timestamp: timestampChanged, rows: otherChangedRows });
      }
    }
  }

  /**
   * 更新单行偏移，同时刷新格式化时间。
   */
  const handleOffsetChange = (id: string, offset: number) => {
    setTimezones((prev) => {
      const next = prev.map((tz) =>
        tz.id === id ? { ...tz, offsetMinutes: offset, label: findPresetLabel(offset, isZh) } : tz
      );
      // Re-render formatted times with updated offsets
      if (lastTimestampMs !== null) {
        const updated: Record<string, string> = {};
        next.forEach((tz) => {
          updated[tz.id] = formatDateString(lastTimestampMs, tz.offsetMinutes);
        });
        setTimeStrings(updated);
      }
      return next;
    });
  };

  const handleTimeChange = (id: string, value: string) => {
    setTimeStrings((prev) => ({ ...prev, [id]: value }));
    setLastEdited({ source: "row", rowId: id });
  };

  const handleTimestampChange = (value: string) => {
    setTimestampInput(value);
    setLastEdited({ source: "timestamp" });
  };

  /**
   * 新增一个时区（默认 UTC+0），并用当前基准时间初始化显示。
   */
  const handleAddTimezone = () => {
    const parsed = parseTimestampInput(timestampInput, strings);
    const base = lastTimestampMs ?? ("millis" in parsed ? parsed.millis : Date.now());
    const newId = `tz-${Date.now()}`;
    const offsetMinutes = 0;
    const newTz: TimezoneEntry = {
      id: newId,
      label: findPresetLabel(offsetMinutes, isZh),
      offsetMinutes,
      editableOffset: true
    };
    const updatedList = [...timezones, newTz];
    setTimezones(updatedList);
    setTimeStrings((prev) => ({
      ...prev,
      [newId]: formatDateString(base, offsetMinutes)
    }));
  };

  /**
   * 删除指定时区行，同时清理已存的时间字符串。
   */
  const handleRemoveTimezone = (id: string) => {
    const filtered = timezones.filter((tz) => tz.id !== id);
    setTimezones(filtered);
    setTimeStrings((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const highlightTimestamp = highlight.timestamp;
  const usedOffsets = new Set(timezones.map((t) => t.offsetMinutes));

  return (
    <div className="min-w-[340px] max-w-[560px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">{strings.inputLabel}</div>
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-blue-200"
            value={langOverride}
            onChange={(e) => setLangOverride(e.target.value as "auto" | "zh" | "en")}
            aria-label="Language"
          >
            <option value="auto">{isZh ? "跟随系统" : "Auto"}</option>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            className={`flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 font-mono ${
              highlightTimestamp ? "sun-highlight" : ""
            }`}
            value={timestampInput}
            onChange={(e) => handleTimestampChange(e.target.value)}
            placeholder={strings.placeholder}
          />
          <button
            className="rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-white font-semibold shadow-lg hover:from-blue-600 hover:to-blue-700"
            onClick={() => convert()}
          >
            {strings.convert}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {timezones.map((tz, idx) => {
          const accent = getTimeColors(baseMs, tz.offsetMinutes);
          const value = timeStrings[tz.id] ?? formatDateString(baseMs, tz.offsetMinutes);
          const highlightRow = highlight.rows.includes(tz.id);
          const options = PRESET_ZONES.filter(
            (zone) => zone.offsetMinutes === tz.offsetMinutes || !usedOffsets.has(zone.offsetMinutes)
          ).map((zone) => ({
            offsetMinutes: zone.offsetMinutes,
            label: isZh ? zone.labelZh : zone.labelEn
          }));
          return (
            <TimeRow
              key={tz.id}
              tz={tz}
              index={idx}
              value={value}
              accent={accent}
              options={options}
              onTimeChange={(val) => handleTimeChange(tz.id, val)}
              onOffsetChange={(val) => handleOffsetChange(tz.id, val)}
              onRemove={idx === 0 ? undefined : () => setConfirmTarget(tz)}
              highlight={highlightRow}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <a
          className="text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-blue-600 hover:decoration-blue-300"
          href="https://github.com/lywhlao2025/chrome_extension_timestamp"
          target="_blank"
          rel="noreferrer"
        >
          {strings.encourage}
        </a>
        <button
          className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
          onClick={handleAddTimezone}
        >
          {strings.addTz}
        </button>
      </div>

      {toast && <Toast text={toast} />}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
          <div className="w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-sm font-semibold text-slate-800">
                {isZh ? `确定删除 ${confirmTarget.label} 时区吗？` : `Remove timezone ${confirmTarget.label}?`}
              </div>
              <div className="flex w-full gap-2 pt-1">
                <button
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200"
                  onClick={() => setConfirmTarget(null)}
                >
                  取消
                </button>
                <button
                  className="flex-1 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-2.5 py-2 text-xs font-semibold text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
                  onClick={() => {
                    if (confirmTarget) handleRemoveTimezone(confirmTarget.id);
                    setConfirmTarget(null);
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
