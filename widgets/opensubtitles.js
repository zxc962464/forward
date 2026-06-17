WidgetMetadata = {
  id: "forward.opensubtitles",
  title: "OpenSubtitles 字幕",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  description: "通过 OpenSubtitles.com API 搜索并获取电影/剧集字幕下载链接。",
  author: "Forward",
  site: "https://www.opensubtitles.com",
  modules: [
    {
      id: "loadSubtitle",
      title: "OpenSubtitles",
      functionName: "loadSubtitle",
      type: "subtitle",
      cacheDuration: 1800,
      requiresWebView: false,
      params: [
        {
          name: "languages",
          title: "字幕语言",
          type: "enumeration",
          value: "zh-cn,zh-tw,en",
          enumOptions: [
            { title: "中文优先", value: "zh-cn,zh-tw,en" },
            { title: "简体中文", value: "zh-cn" },
            { title: "繁体中文", value: "zh-tw" },
            { title: "英文", value: "en" },
            { title: "日文", value: "ja" },
            { title: "韩文", value: "ko" },
          ],
        },
        { name: "apiKey", title: "API Key", type: "input", value: "YV7RGXajPq1tGFgeCYbz1qZZSF0Xukdc" },
      ],
    },
  ],
};

const OPENSUBTITLES_API = "https://api.opensubtitles.com/api/v1";
const DEFAULT_API_KEY = "YV7RGXajPq1tGFgeCYbz1qZZSF0Xukdc";
const USER_AGENT = "ForwardWidget v1.0";

async function loadSubtitle(params = {}) {
  const apiKey = String(params.apiKey || DEFAULT_API_KEY).trim();
  const languages = normalizeLanguages(params.languages);
  const searchParams = buildSearchParams(params, languages);
  const search = await Widget.http.get(`${OPENSUBTITLES_API}/subtitles`, {
    headers: buildHeaders(apiKey),
    params: searchParams,
  });

  const subtitles = (search.data && search.data.data) || [];
  const results = [];
  for (let i = 0; i < subtitles.length && results.length < 20; i++) {
    const item = subtitles[i];
    const mapped = await mapSubtitle(apiKey, item);
    if (mapped) results.push(mapped);
  }
  return results;
}

function buildSearchParams(params, languages) {
  const query = {
    languages,
    order_by: "download_count",
    order_direction: "desc",
  };

  const imdbId = normalizeImdbId(params.imdbId || params.imdb_id);
  if (imdbId) {
    query.imdb_id = imdbId;
  } else if (params.tmdbId || params.tmdb_id) {
    query.tmdb_id = String(params.tmdbId || params.tmdb_id);
  } else if (params.title || params.seriesName) {
    query.query = String(params.seriesName || params.title).trim();
  }

  const type = params.type === "tv" ? "tv" : params.type === "movie" ? "movie" : "";
  if (type) query.type = type;
  if (params.season) query.season_number = Number(params.season);
  if (params.episode) query.episode_number = Number(params.episode);

  return query;
}

async function mapSubtitle(apiKey, item) {
  const attr = item && item.attributes || {};
  const files = attr.files || [];
  if (!files.length || !files[0].file_id) return null;

  const fileId = files[0].file_id;
  const download = await Widget.http.post(`${OPENSUBTITLES_API}/download`, { file_id: fileId }, {
    headers: {
      ...buildHeaders(apiKey),
      "Content-Type": "application/json",
    },
  });
  const data = download.data || {};
  if (!data.link) return null;

  return {
    id: String(fileId),
    title: buildTitle(attr),
    lang: attr.language || "",
    count: Number(attr.download_count || 0),
    url: data.link,
  };
}

function buildTitle(attr) {
  const language = attr.language || "unknown";
  const release = attr.release || attr.file_name || "OpenSubtitles";
  const format = attr.format ? `.${attr.format}` : "";
  return `${language} - ${release}${format}`;
}

function buildHeaders(apiKey) {
  return {
    "Api-Key": apiKey,
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
}

function normalizeLanguages(languages) {
  return String(languages || "zh-cn,zh-tw,en")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");
}

function normalizeImdbId(imdbId) {
  if (!imdbId) return "";
  return String(imdbId).replace(/^tt/i, "").replace(/^0+/, "") || String(imdbId).replace(/^tt/i, "");
}
