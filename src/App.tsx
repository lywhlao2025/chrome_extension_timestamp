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
  deleteConfirm: string;
  errTimestampEmpty: string;
  errTimestampNaN: string;
  errTimestampInvalid: string;
  errDateFormat: string;
};

const STORAGE_KEY = "timezones";

const PRESET_ZONES: { offsetMinutes: number; label: string }[] = [
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

function findPresetLabel(offsetMinutes: number) {
  const found = PRESET_ZONES.find((z) => z.offsetMinutes === offsetMinutes);
  return found ? found.label : formatOffset(offsetMinutes);
}

type ParseTimestampResult = { millis: number } | { error: string };

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

function formatDateString(timestampMs: number, offsetMinutes: number) {
  const { year, month, day, hour, minute, second } = toParts(timestampMs, offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

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

function partsToTimestamp(parts: ReturnType<typeof parseDateString>["parts"], offsetMinutes: number) {
  const { year, month, day, hour, minute, second } = parts!;
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return baseUtc - offsetMinutes * 60 * 1000;
}

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
  const isZh = useMemo(() => navigator.language?.toLowerCase().startsWith("zh") ?? false, []);
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

  const handleOffsetChange = (id: string, offset: number) => {
    setTimezones((prev) => {
      const next = prev.map((tz) => (tz.id === id ? { ...tz, offsetMinutes: offset, label: findPresetLabel(offset) } : tz));
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

  const handleAddTimezone = () => {
    const parsed = parseTimestampInput(timestampInput, strings);
    const base = lastTimestampMs ?? ("millis" in parsed ? parsed.millis : Date.now());
    const newId = `tz-${Date.now()}`;
    const offsetMinutes = 0;
    const newTz: TimezoneEntry = {
      id: newId,
      label: findPresetLabel(offsetMinutes),
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

  const handleRemoveTimezone = (id: string) => {
    const ok = confirm(strings.deleteConfirm);
    if (!ok) return;
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
        <div className="text-sm text-slate-500">{strings.inputLabel}</div>
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
            );
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
                onRemove={idx === 0 ? undefined : () => handleRemoveTimezone(tz.id)}
                highlight={highlightRow}
              />
            );
          })}
      </div>

      <div className="flex justify-end">
        <button
          className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
          onClick={handleAddTimezone}
        >
          {strings.addTz}
        </button>
      </div>

      {toast && <Toast text={toast} />}
    </div>
  );
}

export default App;
