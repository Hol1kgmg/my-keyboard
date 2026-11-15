const rows = [
  ["Q", "W", "E", "R", "T", null, null, null, "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "Tab", null, "Escape", "H", "J", "K", "L", "Semicolon"],
  ["Z", "X", "C", "V", "B", null, null, "Minus", "N", "M", "Comma", "Period", "Slash"],
];
const labels = {
  Escape: "Esc",
  Semicolon: ";",
  Minus: "-",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Eisu: "英数",
  Hiragana: "ひら",
};
const legends = {
  Tab: "tab",
  Escape: "esc",
  Backspace: "⌫",
  Shift: "shift",
  Space: "space",
  Enter: "↩︎",
};
let blankCount = 0;
function key(name, row, column, center, width = 1) {
  const label = name === null ? `無刻印 ${++blankCount}` : (labels[name] ?? name);
  return {
    id: `Key_${name ?? `Blank_R${row + 1}C${column + 1}`}`,
    label,
    legend: name === null ? "" : (legends[name] ?? label),
    row,
    centerU: center,
    widthU: width,
    centerMm: [(center - 6.5) * 19.05, (1.5 - row) * 19.05],
    pressDistance: 0.0012,
    dark: false,
  };
}

export const keyboardLayout = rows.flatMap((row, r) =>
  row.map((name, c) => key(name, r, c, c + 0.5)),
);
const bottom = [
  null,
  null,
  null,
  "Eisu",
  "Backspace",
  "Shift",
  "Space",
  "Enter",
  "Hiragana",
  null,
  null,
  null,
];
keyboardLayout.push(
  ...bottom.map((name, c) => {
    const wide = c >= 4 && c <= 7;
    const center = wide ? 4.625 + (c - 4) * 1.25 : c >= 8 ? c + 1.5 : c + 0.5;
    return key(name, 3, c, center, wide ? 1.25 : 1);
  }),
);
