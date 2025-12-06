// Time row component: displays timezone selector and editable time value.
import { formatOffset } from "../utils/time";
import type { TimezoneEntry } from "../types";

type TimeRowProps = {
  tz: TimezoneEntry; // 当前行的时区条目
  index: number; // 行号，用于背景条纹
  value: string; // 时间字符串
  accent: { color1: string; color2: string }; // 背景装饰色
  options: { offsetMinutes: number; label: string }[]; // 下拉可选时区
  onTimeChange: (v: string) => void; // 时间输入回调
  onOffsetChange: (offset: number) => void; // 选择时区回调
  onRemove?: () => void; // 删除回调（可选）
  highlight: boolean; // 是否高亮
  dateFormatPlaceholder: string; // 输入框占位提示
  selectAriaLabel: string; // 下拉框无障碍 label
};

export function TimeRow({
  tz,
  index,
  value,
  accent,
  onTimeChange,
  onOffsetChange,
  onRemove,
  highlight,
  options,
  dateFormatPlaceholder,
  selectAriaLabel
}: TimeRowProps) {
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
          aria-label={selectAriaLabel}
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
          placeholder={dateFormatPlaceholder}
        />
      </div>
    </div>
  );
}
