const LAT = 34.22;
const LON = 135.16;

function degreesToJapanese(deg: number): string {
  const dirs = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  return dirs[Math.round(deg / 45) % 8];
}

function weatherCodeToJapanese(code: number): string {
  if (code === 0) return "快晴";
  if (code === 1) return "晴れ";
  if (code === 2) return "晴れ時々曇り";
  if (code === 3) return "曇り";
  if (code <= 48) return "霧";
  if (code <= 55) return "霧雨";
  if (code <= 65) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "にわか雨";
  if (code <= 86) return "にわか雪";
  return "雷雨";
}

function formatDateText(jst: Date): string {
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const hour = jst.getUTCHours();
  let timeOfDay: string;
  if (hour < 5) timeOfDay = "深夜";
  else if (hour <= 10) timeOfDay = "朝";
  else if (hour <= 15) timeOfDay = "昼";
  else if (hour <= 18) timeOfDay = "夕方";
  else timeOfDay = "夜";
  return `${month}月${day}日${timeOfDay}${hour}時`;
}

function formatDateTextDetail(jst: Date): string {
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const hour = jst.getUTCHours();
  const min = String(jst.getUTCMinutes()).padStart(2, "0");
  let timeOfDay: string;
  if (hour < 5) timeOfDay = "深夜";
  else if (hour <= 10) timeOfDay = "朝";
  else if (hour <= 15) timeOfDay = "昼";
  else if (hour <= 18) timeOfDay = "夕方";
  else timeOfDay = "夜";
  return `${month}月${day}日${timeOfDay}${hour}時${min}分`;
}

function getTideType(date: Date): string {
  const known = new Date("2000-01-06T18:14:00Z");
  const lunarCycle = 29.530588853;
  const diffDays = (date.getTime() - known.getTime()) / 86400000;
  const age = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
  if (age < 1) return "大潮";
  if (age < 5) return "中潮";
  if (age < 8) return "小潮";
  if (age < 9) return "長潮";
  if (age < 10) return "若潮";
  if (age < 13) return "中潮";
  if (age < 18) return "大潮";
  if (age < 22) return "中潮";
  if (age < 25) return "小潮";
  if (age < 26) return "長潮";
  if (age < 27) return "若潮";
  if (age < 30) return "中潮";
  return "大潮";
}

// 1エントリ = 時刻4桁 + 潮位3桁 = 7文字 固定。これが4回繰り返される（28文字）。
// 欠測は時刻"9999"・潮位"999"。
function parseTideSection(s: string): { time: string; height: number }[] {
  const tides: { time: string; height: number }[] = [];
  for (let k = 0; k < 4; k++) {
    const entry = s.slice(k * 7, k * 7 + 7);
    if (entry.length < 7) break;

    const timeStr   = entry.slice(0, 4).trim();   // "637" or "1430"
    const heightStr = entry.slice(4, 7).trim();   // "183" / "-12" / "999"

    if (timeStr === "9999" || heightStr === "999") continue;

    const time   = parseInt(timeStr, 10);
    const h      = Math.floor(time / 100);
    const min    = time % 100;
    const height = parseInt(heightStr, 10);

    if (h >= 0 && h <= 23 && min >= 0 && min <= 59 && !isNaN(height)) {
      tides.push({
        time: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        height,
      });
    }
  }
  return tides;
}

// JMA仕様: 1〜72=毎時潮位 / 73〜78=年月日 / 79〜80=地点記号 /
// 81〜108=満潮(28) / 109〜136=干潮(28)
function parseDayTides(text: string, yy: string, mm: string, dd: string): {
  high: { time: string; height: number }[];
  low:  { time: string; height: number }[];
} {
  const target = `${yy}${mm}${dd}WY`;  // 例: "26 5 2WY"
  for (const line of text.split("\n")) {
    const idx = line.indexOf(target);
    if (idx === -1) continue;

    const tideStart = idx + target.length;
    const highSec = line.slice(tideStart,        tideStart + 28);
    const lowSec  = line.slice(tideStart + 28,   tideStart + 56);

    return {
      high: parseTideSection(highSec),
      low:  parseTideSection(lowSec),
    };
  }
  return { high: [], low: [] };
}

async function getTideData(date: Date): Promise<{ kocho: string; mancho: string; kochoFirst: boolean }> {
  try {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const currentMinutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

    const year = jst.getUTCFullYear();
    const yy   = String(year).slice(2);
    const mm   = String(jst.getUTCMonth() + 1).padStart(2, " ");  // スペース埋め
    const dd   = String(jst.getUTCDate()).padStart(2, " ");        // スペース埋め

    const tomorrow = new Date(jst.getTime() + 24 * 60 * 60 * 1000);
    const tyy = String(tomorrow.getUTCFullYear()).slice(2);
    const tmm = String(tomorrow.getUTCMonth() + 1).padStart(2, " ");
    const tdd = String(tomorrow.getUTCDate()).padStart(2, " ");

    const url = `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/WY.txt`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("JMA fetch failed");
    const text = await res.text();

    const today   = parseDayTides(text, yy,  mm,  dd);
    const nextDay = parseDayTides(text, tyy, tmm, tdd);

    const allHigh = [
      ...today.high,
      ...nextDay.high.map(t => ({ ...t, time: t.time + "+1d" })),
    ];
    const allLow = [
      ...today.low,
      ...nextDay.low.map(t => ({ ...t, time: t.time + "+1d" })),
    ];

    const getMin = (t: string) => {
      const base = t.replace("+1d", "");
      const m = toMin(base);
      return t.endsWith("+1d") ? m + 1440 : m;
    };

    const nextTide = (tides: typeof allHigh) => {
      if (tides.length === 0) {
        return { time: "--:--", min: 0 };
      }
      const future = tides.filter(t => getMin(t.time) >= currentMinutes);
      const pick = future.length > 0
        ? future.sort((a, b) => getMin(a.time) - getMin(b.time))[0]
        : tides.sort((a, b) => getMin(a.time) - getMin(b.time)).slice(-1)[0];
      return { time: pick.time.replace("+1d", ""), min: getMin(pick.time) };
    };

    const nextHigh = nextTide(allHigh);
    const nextLow  = nextTide(allLow);

    console.log(`  次の満潮: ${nextHigh.time} (${nextHigh.min}分)`);
    console.log(`  次の干潮: ${nextLow.time} (${nextLow.min}分)`);

    return {
      mancho: nextHigh.time,
      kocho:  nextLow.time,
      kochoFirst: nextLow.min <= nextHigh.min,
    };
  } catch (e) {
    console.error("潮汐データ取得エラー:", e);
  }
  return { kocho: "--:--", mancho: "--:--", kochoFirst: true };
}

export type SurfData = {
  waveHeight: number;
  windSpeed: number;
  windDirection: string;
  dateText: string;
  dateTextDetail: string;
  weather: string;
  tideType: string;
  kocho: string;
  mancho: string;
  kochoFirst: boolean;
};

export async function getSurfData(): Promise<SurfData> {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = jst.toISOString().slice(0, 10);
  const idx = Math.min(jst.getUTCHours(), 23);

  const [marineRes, weatherRes, tideData] = await Promise.all([
    fetch(
      `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&hourly=wave_height` +
        `&start_date=${today}&end_date=${today}` +
        `&timezone=Asia%2FTokyo`
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&hourly=wind_speed_10m,wind_direction_10m,weather_code` +
        `&wind_speed_unit=ms` +
        `&start_date=${today}&end_date=${today}` +
        `&timezone=Asia%2FTokyo`
    ),
    getTideData(now),
  ]);

  if (!marineRes.ok) throw new Error(`Marine API error: HTTP ${marineRes.status}`);
  if (!weatherRes.ok) throw new Error(`Weather API error: HTTP ${weatherRes.status}`);

  const marineData = await marineRes.json();
  const weatherData = await weatherRes.json();

  const waveHeight: number = marineData.hourly.wave_height[idx] ?? 0;
  const windSpeedRaw: number = weatherData.hourly.wind_speed_10m[idx] ?? 0;
  const windDeg: number = weatherData.hourly.wind_direction_10m[idx] ?? 0;
  const weatherCode: number = weatherData.hourly.weather_code[idx] ?? 0;

  return {
    waveHeight,
    windSpeed: Math.round(windSpeedRaw * 10) / 10,
    windDirection: degreesToJapanese(windDeg),
    dateText: formatDateText(jst),
    dateTextDetail: formatDateTextDetail(jst),
    weather: weatherCodeToJapanese(weatherCode),
    tideType: getTideType(now),
    kocho: tideData.kocho,
    mancho: tideData.mancho,
    kochoFirst: tideData.kochoFirst,
  };
}
