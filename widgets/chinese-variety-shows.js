WidgetMetadata = {
  id: "forward.chinese-variety-shows",
  title: "国内综艺",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "收集中国大陆综艺节目信息，支持 TMDB 与豆瓣热门综艺来源。",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  modules: [
    {
      id: "loadChineseVarietyShows",
      title: "国内综艺",
      functionName: "loadChineseVarietyShows",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        {
          name: "source",
          title: "来源",
          type: "enumeration",
          value: "tmdb_popular",
          enumOptions: [
            { title: "TMDB 热门大陆综艺", value: "tmdb_popular" },
            { title: "TMDB 近期大陆综艺", value: "tmdb_recent" },
            { title: "豆瓣热门综艺", value: "douban_hot" },
          ],
        },
        {
          name: "genre",
          title: "类型",
          type: "enumeration",
          value: "all",
          enumOptions: [
            { title: "全部综艺", value: "all" },
            { title: "真人秀", value: "reality" },
            { title: "脱口秀", value: "talk" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
      ],
    },
  ],
  search: {
    title: "搜索综艺",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      { name: "page", title: "页码", type: "page" },
      { name: "language", title: "语言", type: "language", value: "zh-CN" },
    ],
  },
};

const TMDB_VARIETY_GENRES = {
  all: "10764|10767",
  reality: 10764,
  talk: 10767,
};
const DOUBAN_MOBILE_API = "https://m.douban.com/rexxar/api/v2";

async function loadChineseVarietyShows(params = {}) {
  const source = params.source || "tmdb_popular";
  const page = Number(params.page || 1);
  const language = params.language || "zh-CN";
  const genre = normalizeGenre(params.genre);

  if (source === "douban_hot") {
    return loadDoubanVariety(page);
  }
  return loadTmdbChineseVariety(source, genre, page, language);
}

async function search(params = {}) {
  const keyword = String(params.keyword || "").trim();
  if (!keyword) return [];

  const page = Number(params.page || 1);
  const language = params.language || "zh-CN";
  const res = await Widget.tmdb.get("search/tv", {
    params: {
      query: keyword,
      page,
      language,
      include_adult: false,
    },
  });

  return (res.results || [])
    .filter((item) => item.origin_country && item.origin_country.includes("CN"))
    .filter((item) => isVarietyGenre(item.genre_ids || []))
    .map((item) => mapTmdbTvItem(item))
    .filter(Boolean);
}

async function loadTmdbChineseVariety(source, genre, page, language) {
  const params = {
    page,
    language,
    with_origin_country: "CN",
    with_genres: TMDB_VARIETY_GENRES[genre],
    sort_by: source === "tmdb_recent" ? "first_air_date.desc" : "popularity.desc",
    include_null_first_air_dates: false,
  };
  if (source === "tmdb_recent") {
    params["first_air_date.gte"] = daysAgo(365);
  }

  const res = await Widget.tmdb.get("discover/tv", { params });
  return (res.results || []).map((item) => mapTmdbTvItem(item)).filter(Boolean);
}

async function loadDoubanVariety(page) {
  const count = 20;
  const start = Math.max(0, (page - 1) * count);
  const res = await Widget.http.get(`${DOUBAN_MOBILE_API}/subject_collection/tv_variety_show/items`, {
    headers: {
      Referer: "https://m.douban.com/tv/variety",
      "User-Agent": "Mozilla/5.0",
    },
    params: {
      start,
      count,
      for_mobile: 1,
    },
  });

  const data = res.data || {};
  const items = data.subject_collection_items || data.items || data.subjects || [];
  return items.map(mapDoubanItem).filter(Boolean);
}

function normalizeGenre(genre) {
  if (genre === "reality" || genre === "talk") return genre;
  return "all";
}

function isVarietyGenre(genreIds) {
  return genreIds.includes(10764) || genreIds.includes(10767);
}

function mapTmdbTvItem(item) {
  return {
    id: item.id,
    type: "tmdb",
    mediaType: "tv",
    title: item.name || item.original_name || "",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: item.first_air_date,
    rating: item.vote_average,
    description: item.overview,
  };
}

function mapDoubanItem(item) {
  const id = item.id || item.subject_id || item.uri && String(item.uri).split("/").filter(Boolean).pop();
  if (!id) return null;

  const cover = item.cover && (item.cover.url || item.cover.normal || item.cover.large);
  const rating = item.rating && (item.rating.value || item.rating.star_count);
  return {
    id: String(id),
    type: "douban",
    mediaType: "tv",
    title: item.title || item.name || "",
    posterPath: cover,
    releaseDate: item.year ? String(item.year) : undefined,
    rating: rating ? Number(rating) : undefined,
    description: item.card_subtitle || item.info,
  };
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
