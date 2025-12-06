import { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";
import { PRESET_ZONES, findPresetLabel as findPresetLabelRaw } from "./data/presets";
import { DATE_FORMAT_HELP, getStrings } from "./i18n/strings";
import { ConfirmModal } from "./components/ConfirmModal";
import { TimeRow } from "./components/TimeRow";
import { Toast } from "./components/Toast";
import { loadSavedTimezones, saveTimezones } from "./services/storage";
import { HighlightState, Source, TimezoneEntry } from "./types";
import { formatDateString, formatOffset, getTimeColors, parseDateString, parseTimestampInput, partsToTimestamp } from "./utils/time";

const INITIAL_NOW = Date.now();

const DEFAULT_TZ: TimezoneEntry = {
  id: "default",
  label: "北京/新加坡",
  offsetMinutes: 8 * 60,
  editableOffset: true
};

const resolvePresetLabel = (offsetMinutes: number, isZh: boolean) =>
  findPresetLabelRaw(offsetMinutes, isZh) ?? formatOffset(offsetMinutes);

/**
 * App: orchestrates timestamp parsing/formatting, multi-timezone editing, and UI layout.
 */
function App() {
  const [timezones, setTimezones] = useState<TimezoneEntry[]>(() => loadSavedTimezones([DEFAULT_TZ]));
  const [timestampInput, setTimestampInput] = useState(() => INITIAL_NOW.toString());
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

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 1400);
  };

  /**
   * 核心转换：根据当前输入或行内编辑，计算基准 UTC 毫秒并刷新所有行。
   * @param suppressHighlight 是否跳过高亮动画
   * @param tzList 要更新的时区列表（默认当前 state）
   * @param overrideMs 外部指定的基准毫秒
   * @param edited 来源（timestamp 输入 or row 编辑），用于决定高亮
   */
  const convert = useCallback(
    (
      suppressHighlight = false,
      tzList: TimezoneEntry[] = timezones,
      overrideMs?: number | null,
      edited: { source: Source; rowId?: string } = lastEdited
    ) => {
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
    },
    [lastEdited, lastTimestampMs, strings, timeStrings, timestampInput, timezones]
  );

  useEffect(() => {
    // 初次挂载后刷新一次转换，保证 timeStrings 初始化
    const currentMs = Number(timestampInput) || INITIAL_NOW;
    setTimeout(() => convert(true, timezones, currentMs), 0);
  }, [convert, timezones, timestampInput]);

  useEffect(() => {
    saveTimezones(timezones);
  }, [timezones]);

  useEffect(() => {
    if (highlight.timestamp || highlight.rows.length) {
      const id = setTimeout(() => setHighlight({ timestamp: false, rows: [] }), 500);
      return () => clearTimeout(id);
    }
  }, [highlight]);

  const baseMs = useMemo(() => {
    if (lastTimestampMs !== null) return lastTimestampMs;
    const parsed = parseTimestampInput(timestampInput, strings);
    return "millis" in parsed ? parsed.millis : INITIAL_NOW;
  }, [lastTimestampMs, timestampInput, strings]);

  /**
   * 更新单行偏移，同时刷新格式化时间。
   */
  const handleOffsetChange = (id: string, offset: number) => {
    setTimezones((prev) => {
      const next = prev.map((tz) =>
        tz.id === id ? { ...tz, offsetMinutes: offset, label: resolvePresetLabel(offset, isZh) } : tz
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
      label: resolvePresetLabel(offsetMinutes, isZh),
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
        onRemove={
          idx === 0
            ? undefined
            : () =>
                setConfirmTarget({
                  ...tz,
                  label: resolvePresetLabel(tz.offsetMinutes, isZh)
                })
        }
        highlight={highlightRow}
        dateFormatPlaceholder={DATE_FORMAT_HELP}
        selectAriaLabel={isZh ? "选择时区" : "Select timezone"}
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

      <ConfirmModal
        open={!!confirmTarget}
        message={
          confirmTarget
            ? isZh
              ? `确定删除 ${resolvePresetLabel(confirmTarget.offsetMinutes, true)} 时区吗？`
              : `Remove timezone ${resolvePresetLabel(confirmTarget.offsetMinutes, false)}?`
            : ""
        }
        cancelText={isZh ? "取消" : "Cancel"}
        confirmText={isZh ? "确定" : "Confirm"}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) handleRemoveTimezone(confirmTarget.id);
          setConfirmTarget(null);
        }}
      />
    </div>
  );
}

export default App;
