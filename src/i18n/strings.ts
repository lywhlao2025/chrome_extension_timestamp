// Locale strings and helpers.
export const DATE_FORMAT_HELP = "YYYY-MM-DD HH:mm:ss";

export type Strings = {
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

export function getStrings(isZh: boolean): Strings {
  if (isZh) {
    return {
      inputLabel: "输入时间戳（秒或毫秒）",
      placeholder: "如 1700000000 或 1700000000000",
      convert: "转换",
      addTz: "添加时区",
      encourage: "请我喝杯咖啡",
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
    encourage: "Buy me a coffee",
    deleteConfirm: "Remove this timezone?",
    errTimestampEmpty: "Please enter a timestamp",
    errTimestampNaN: "Not a valid number",
    errTimestampInvalid: "Cannot parse time",
    errDateFormat: `Format should be ${DATE_FORMAT_HELP}`
  };
}
