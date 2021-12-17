const COLOR_CODES = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  blackBg: "\x1b[40m",
  redBg: "\x1b[41m",
  greenBg: "\x1b[42m",
  yellowBg: "\x1b[43m",
  blueBg: "\x1b[44m",
  magentaBg: "\x1b[45m",
  cyanBg: "\x1b[46m",
  whiteBg: "\x1b[47m",
};

export function colorize(text, ...colors) {
  let [color1, color2] = colors;
  if (!COLOR_CODES[color1]) {
    console.warn(`Invalid console color: '${color1}'`);
    color1 = COLOR_CODES.reset;
  }
  if (color2 && !COLOR_CODES[color2]) {
    console.warn(`Invalid console color: '${color2}'`);
    color2 = "";
  }
  const colorCode1 = COLOR_CODES[color1] || "";
  const colorCode2 = COLOR_CODES[color2] || "";
  const colorCodes = colorCode1 + colorCode2;
  return COLOR_CODES.reset + colorCodes + text + COLOR_CODES.reset;
}
