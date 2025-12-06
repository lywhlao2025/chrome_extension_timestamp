// Preset timezone offsets with dual-language labels.
export type PresetZone = { offsetMinutes: number; labelZh: string; labelEn: string };

export const PRESET_ZONES: PresetZone[] = [
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

export function findPresetLabel(offsetMinutes: number, isZh: boolean) {
  const found = PRESET_ZONES.find((z) => z.offsetMinutes === offsetMinutes);
  return found ? (isZh ? found.labelZh : found.labelEn) : null;
}
