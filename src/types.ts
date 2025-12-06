// Shared types across components and services.
export type Source = "timestamp" | "row";

export type TimezoneEntry = {
  id: string; // 唯一标识
  label: string; // 当前语言显示名
  offsetMinutes: number; // 偏移分钟
  editableOffset: boolean; // 是否允许修改偏移
};

export type HighlightState = {
  timestamp: boolean; // 顶部输入框是否高亮
  rows: string[]; // 高亮的行 id 列表
};
