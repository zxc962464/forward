WidgetMetadata = {
  id: "forward.recent-hot-anime",
  title: "近期热门动漫",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "从 TMDB 和豆瓣等影视数据源获取近期热门动画剧集与动画电影。",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  modules: [
    {
      id: "loadRecentHotAnime",
      title: "近期热门动漫",
      functionName: "loadRecentHotAnime",
      cacheDuration: 3600,
      requiresWebView: false,
      params: [
        {
          name: "source",
          title: "来源",
          type: "enumeration",
          value: "tmdb_recent_tv",
          enumOptions: [
            { title: "TMDB 近期动画剧集", value: "tmdb_recent_tv" },
            { title: "TMDB 本周趋势动画", value: "tmdb_trending" },
            { title: "TMDB 热门动画电影", value: "tmdb_movies" },
            { title: "豆瓣热门动画剧集", value: "douban_tv" },
            { title: "豆瓣热门动画电影", value: "douban_movie" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
      ],
    },
  ],
  search: {
    title: "搜索动漫",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      { name: "page", title: "页码", type: "page" },
      { name: "language", title: "语言", type: "language", value: "zh-CN" },
    ],
  },
};

const TMDB_ANIMATION_GENRE_ID = 16;
const DOUBAN_MOBILE_API = "https://m.douban.com/rexxar/api/v2";

async function loadRecentHotAnime(params = {}) {
  const source = params.source || "tmdb_recent_tv";
  const page = Number(params.page || 1);
  const language = params.language || "zh-CN";

  if (source === "tmdb_trending") {
    return loadTmdbTrendingAnime(page, language);
  }
  if (source === "tmdb_movies") {
    return loadTmdbPopularAnimationMovies(page, language);
  }
  if (source === "douban_tv") {
    return loadDoubanCollection("tv_animation", page);
  }
  if (source === "douban_movie") {
    return loadDoubanCollection("movie_animation", page);
  }
  return loadTmdbRecentAnimationTv(page, language);
}

async function search(params = {}) {
  const keyword = String(params.keyword || "").trim();
  if (!keyword) return [];

  const page = Number(params.page || 1);
  const language = params.language || "zh-CN";
  const res = await Widget.tmdb.get("search/multi", {
    params: {
      query: keyword,
      page,
      language,
      include_adult: false,
    },
  });

  const results = (res.results || []).filter((item) => {
    if (item.media_type !== "movie" && item.media_type !== "tv") return false;
    return (item.genre_ids || []).includes(TMDB_ANIMATION_GENRE_ID);
  });

  return results.map(mapTmdbItem).filter(Boolean);
}

async function loadTmdbRecentAnimationTv(page, language) {
  const minDate = daysAgo(120);
  const res = await Widget.tmdb.get("discover/tv", {
    params: {
      page,
      language,
      sort_by: "popularity.desc",
      with_genres: TMDB_ANIMATION_GENRE_ID,
      "first_air_date.gte": minDate,
      include_null_first_air_dates: false,
    },
  });
  return (res.results || []).map((item) => mapTmdbItem({ ...item, media_type: "tv" }));
}

async function loadTmdbTrendingAnime(page, language) {
  const res = await Widget.tmdb.get("trending/all/week", {
    params: { page, language },
  });
  return (res.results || [])
    .filter((item) => {
      if (item.media_type !== "movie" && item.media_type !== "tv") return false;
      return (item.genre_ids || []).includes(TMDB_ANIMATION_GENRE_ID);
    })
    .map(mapTmdbItem)
    .filter(Boolean);
}

async function loadTmdbPopularAnimationMovies(page, language) {
  const res = await Widget.tmdb.get("discover/movie", {
    params: {
      page,
      language,
      sort_by: "popularity.desc",
      with_genres: TMDB_ANIMATION_GENRE_ID,
      include_adult: false,
    },
  });
  return (res.results || []).map((item) => mapTmdbItem({ ...item, media_type: "movie" }));
}

async function loadDoubanCollection(collectionId, page) {
  const count = 20;
  const start = Math.max(0, (page - 1) * count);
  const res = await Widget.http.get(`${DOUBAN_MOBILE_API}/subject_collection/${collectionId}/items`, {
    headers: {
      Referer: "https://m.douban.com/",
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

function mapTmdbItem(item) {
  const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
  if (mediaType !== "movie" && mediaType !== "tv") return null;

  return {
    id: item.id,
    type: "tmdb",
    mediaType,
    title: item.title || item.name || item.original_title || item.original_name || "",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: item.release_date || item.first_air_date,
    rating: item.vote_average,
    description: item.overview,
  };
}

function mapDoubanItem(item) {
  const id = item.id || item.subject_id || item.uri && String(item.uri).split("/").filter(Boolean).pop();
  if (!id) return null;

  const type = item.type || item.subtype || "";
  const isTv = type === "tv" || type === "drama" || /剧|番|动画/.test(item.card_subtitle || "");
  const rating = item.rating && (item.rating.value || item.rating.star_count);
  const cover = item.cover && (item.cover.url || item.cover.normal || item.cover.large);

  return {
    id: String(id),
    type: "douban",
    mediaType: isTv ? "tv" : "movie",
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
