import { useCallback, useEffect, useMemo, useState } from "react"; // React hooks
import "./index.css"; // 全局样式
import { PRESET_ZONES, findPresetLabel as findPresetLabelRaw } from "./data/presets"; // 时区预设
import { DATE_FORMAT_HELP, getStrings } from "./i18n/strings"; // 多语言文案与日期格式占位
import { ConfirmModal } from "./components/ConfirmModal"; // 删除确认弹窗
import { TimeRow } from "./components/TimeRow"; // 单行时区组件
import { Toast } from "./components/Toast"; // 底部提示
import { loadSavedTimezones, saveTimezones } from "./services/storage"; // 存储读写
import type { HighlightState, Source, TimezoneEntry } from "./types"; // 类型定义
import { formatDateString, formatOffset, getTimeColors, parseDateString, parseTimestampInput, partsToTimestamp } from "./utils/time"; // 时间处理工具

const INITIAL_NOW = Date.now(); // 初始时间戳，用于首次展示

const DEFAULT_TZ: TimezoneEntry = {
  id: "default", // 唯一标识
  label: "北京/新加坡", // 初始显示名称
  offsetMinutes: 8 * 60, // 默认 UTC+8
  editableOffset: true // 允许修改偏移
};

const resolvePresetLabel = (offsetMinutes: number, isZh: boolean) =>
  findPresetLabelRaw(offsetMinutes, isZh) ?? formatOffset(offsetMinutes); // 根据语言取预设名，若无则用 UTC 偏移

/**
 * App: orchestrates timestamp parsing/formatting, multi-timezone editing, and UI layout.
 */
function App() {
  const [timezones, setTimezones] = useState<TimezoneEntry[]>(() => loadSavedTimezones([DEFAULT_TZ])); // 已配置的时区列表
  const [timestampInput, setTimestampInput] = useState(() => INITIAL_NOW.toString()); // 顶部时间戳输入
  const [timeStrings, setTimeStrings] = useState<Record<string, string>>({}); // 每行显示的格式化时间
  const [lastEdited, setLastEdited] = useState<{ source: Source; rowId?: string }>({ source: "timestamp" }); // 上一次编辑来源
  const [lastTimestampMs, setLastTimestampMs] = useState<number | null>(INITIAL_NOW); // 当前基准 UTC 毫秒
  const [highlight, setHighlight] = useState<HighlightState>({ timestamp: false, rows: [] }); // 高亮状态
  const [toast, setToast] = useState<string | null>(null); // toast 文案
  const [confirmTarget, setConfirmTarget] = useState<TimezoneEntry | null>(null); // 待删除行
  const [langOverride, setLangOverride] = useState<"auto" | "zh" | "en">("auto"); // 语言覆盖
  const isZh = useMemo(() => {
    if (langOverride === "zh") return true; // 强制中文
    if (langOverride === "en") return false; // 强制英文
    return navigator.language?.toLowerCase().startsWith("zh") ?? false; // 跟随系统
  }, [langOverride]);
  const strings = useMemo(() => getStrings(isZh), [isZh]); // 当前语言文案

  const showToast = (text: string) => {
    setToast(text); // 立即显示
    setTimeout(() => setToast(null), 1400); // 1.4s 后自动关闭
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
      const prevTimes = { ...timeStrings }; // 记录旧值用于差异高亮
      let base = overrideMs ?? lastTimestampMs; // 基准 UTC 毫秒：外部传入 > 已保存 > 当前输入
      if (edited.source === "row" && edited.rowId) {
        const currentStr = timeStrings[edited.rowId] ?? ""; // 当前行文本
        const parsed = parseDateString(currentStr, strings); // 行文本解析为日期字段
        if (parsed.error) {
          showToast(parsed.error);
          return;
        }
        const rowTz = tzList.find((t) => t.id === edited.rowId); // 找到对应行的偏移
        if (!rowTz) return; // 未找到则退出
        base = partsToTimestamp(parsed.parts!, rowTz.offsetMinutes); // 反推 UTC 毫秒
        setTimestampInput(Math.round(base).toString()); // 反推的 UTC 写回顶部
      } else {
        const parsed = parseTimestampInput(timestampInput, strings); // 顶部输入解析
        if ("error" in parsed) {
          showToast(parsed.error);
          return;
        }
        base = parsed.millis; // 顶部输入解析结果
      }

      if (base == null) return;

      const resolvedBase = base as number; // 确认数值
      const updatedTimes: Record<string, string> = {}; // 新的格式化时间字典
      const changedRows: string[] = []; // 记录有变动的行
      tzList.forEach((tz) => {
        updatedTimes[tz.id] = formatDateString(resolvedBase, tz.offsetMinutes); // 生成格式化时间
        if (prevTimes[tz.id] !== updatedTimes[tz.id]) changedRows.push(tz.id); // 差异用于高亮
      });
      setTimeStrings(updatedTimes); // 更新所有行字符串
      setLastTimestampMs(resolvedBase); // 保存基准毫秒
      setLastEdited({ source: "timestamp" }); // 标记来源为顶部

      if (!suppressHighlight) {
        if (edited.source === "timestamp") {
          setHighlight({ timestamp: false, rows: changedRows }); // 顶部输入触发：仅行高亮
        } else {
          const otherChangedRows = changedRows.filter((id) => id !== edited.rowId); // 其他行变化
          const timestampChanged = resolvedBase !== lastTimestampMs; // 基准是否变
          setHighlight({ timestamp: timestampChanged, rows: otherChangedRows }); // 行/顶部高亮控制
        }
      }
    },
    [lastEdited, lastTimestampMs, strings, timeStrings, timestampInput, timezones]
  );

  useEffect(() => {
    saveTimezones(timezones); // 每次时区列表变更持久化到 localStorage
  }, [timezones]);

  useEffect(() => {
    // 高亮存在时，500ms 后自动清除
    if (highlight.timestamp || highlight.rows.length) {
      const id = setTimeout(() => setHighlight({ timestamp: false, rows: [] }), 500);
      return () => clearTimeout(id);
    }
  }, [highlight]);

  // 基准毫秒，仅在显式转换后更新；输入变动不自动联动
  const baseMs = useMemo(() => (lastTimestampMs !== null ? lastTimestampMs : INITIAL_NOW), [lastTimestampMs]);

  /**
   * 更新单行偏移，同时刷新格式化时间。
   */
  const handleOffsetChange = (id: string, offset: number) => {
    setTimezones((prev) => {
      const next = prev.map((tz) =>
        tz.id === id ? { ...tz, offsetMinutes: offset, label: resolvePresetLabel(offset, isZh) } : tz // 更新偏移与展示名
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
    setTimeStrings((prev) => ({ ...prev, [id]: value })); // 更新该行文本
    setLastEdited({ source: "row", rowId: id }); // 记录来源
  };

  const handleTimestampChange = (value: string) => {
    setTimestampInput(value); // 顶部输入修改
    setLastEdited({ source: "timestamp" }); // 记录来源
  };

  /**
   * 新增一个时区（默认 UTC+0），并用当前基准时间初始化显示。
   */
  const handleAddTimezone = () => {
    const parsed = parseTimestampInput(timestampInput, strings);
    const base = lastTimestampMs ?? ("millis" in parsed ? parsed.millis : Date.now());
    const newId = `tz-${Date.now()}`; // 新行唯一 id
    const offsetMinutes = 0; // 默认 UTC+0
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
    const filtered = timezones.filter((tz) => tz.id !== id); // 过滤掉目标行
    setTimezones(filtered); // 更新列表
    setTimeStrings((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const highlightTimestamp = highlight.timestamp;
  const usedOffsets = new Set(timezones.map((t) => t.offsetMinutes));

  return (
    // 主容器卡片
    <div className="min-w-[340px] max-w-[560px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">{strings.inputLabel}</div> {/* 输入标签 */}
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
            // 单行时区
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
