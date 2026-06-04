WidgetMetadata = {
  id: "forward.trending-by-genre",
  title: "流行趋势分类",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  description: "默认展示近期整体流行趋势，列表内提供恐怖、动画、爱情、喜剧等分类入口。",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  modules: [
    {
      id: "loadTrendingByGenre",
      title: "近期流行趋势",
      functionName: "loadTrendingByGenre",
      cacheDuration: 1800,
      requiresWebView: false,
      params: [
        {
          name: "window",
          title: "周期",
          type: "enumeration",
          value: "week",
          enumOptions: [
            { title: "本周", value: "week" },
            { title: "今日", value: "day" },
          ],
        },
        {
          name: "media",
          title: "类型",
          type: "enumeration",
          value: "all",
          enumOptions: [
            { title: "全部", value: "all" },
            { title: "电影", value: "movie" },
            { title: "剧集", value: "tv" },
          ],
        },
        { name: "page", title: "页码", type: "page" },
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
      ],
    },
  ],
  search: {
    title: "搜索影视",
    functionName: "search",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      { name: "page", title: "页码", type: "page" },
      { name: "language", title: "语言", type: "language", value: "zh-CN" },
    ],
  },
};

const GENRES = {
  action: { title: "动作", movie: 28, tv: 10759 },
  adventure: { title: "冒险", movie: 12, tv: 10759 },
  animation: { title: "动画", movie: 16, tv: 16 },
  comedy: { title: "喜剧", movie: 35, tv: 35 },
  crime: { title: "犯罪", movie: 80, tv: 80 },
  documentary: { title: "纪录片", movie: 99, tv: 99 },
  drama: { title: "剧情", movie: 18, tv: 18 },
  family: { title: "家庭", movie: 10751, tv: 10751 },
  fantasy: { title: "奇幻", movie: 14, tv: 10765 },
  horror: { title: "恐怖", movie: 27, tv: undefined },
  romance: { title: "爱情", movie: 10749, tv: undefined },
  science_fiction: { title: "科幻", movie: 878, tv: 10765 },
  mystery: { title: "悬疑", movie: 9648, tv: 9648 },
  war: { title: "战争", movie: 10752, tv: 10768 },
};

const CATEGORY_ORDER = [
  "horror",
  "animation",
  "romance",
  "comedy",
  "action",
  "science_fiction",
  "mystery",
  "drama",
  "crime",
  "fantasy",
  "adventure",
  "family",
  "documentary",
  "war",
];

async function loadTrendingByGenre(params = {}) {
  const page = Number(params.page || 1);
  const language = params.language || "zh-CN";
  const window = params.window === "day" ? "day" : "week";
  const media = normalizeMedia(params.media);

  const res = await Widget.tmdb.get(`trending/${media}/${window}`, {
    params: { page, language },
  });

  const items = (res.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv" || media !== "all")
    .map((item) => withMediaType(item, media))
    .map(mapTmdbItem)
    .filter(Boolean);

  if (page > 1) return items;
  return [...buildCategoryItems(window, media, language), ...items];
}

async function loadDetail(link) {
  const parsed = parseCategoryLink(link);
  if (!parsed) return null;

  const genre = GENRES[parsed.genre];
  const media = normalizeMedia(parsed.media);
  const window = parsed.window === "day" ? "day" : "week";
  const language = parsed.language || "zh-CN";
  const relatedItems = await loadCategoryItems(parsed.genre, window, media, language);

  return {
    id: link,
    type: "url",
    title: `${genre.title}热门趋势`,
    link,
    description: "按当前分类聚合近期热门电影和剧集。",
    relatedItems,
  };
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

  return (res.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map(mapTmdbItem)
    .filter(Boolean);
}

function normalizeMedia(media) {
  if (media === "movie" || media === "tv") return media;
  return "all";
}

function withMediaType(item, media) {
  if (item.media_type) return item;
  return { ...item, media_type: media };
}

async function loadCategoryItems(genre, window, media, language) {
  const requests = media === "all" ? ["movie", "tv"] : [media];
  const groups = await Promise.all(
    requests.map(async (mediaType) => {
      const genreId = GENRES[genre] && GENRES[genre][mediaType];
      if (!genreId) return [];
      const res = await Widget.tmdb.get(`discover/${mediaType}`, {
        params: {
          page: 1,
          language,
          sort_by: window === "day" ? "popularity.desc" : "vote_count.desc",
          with_genres: genreId,
          include_adult: false,
        },
      });
      return (res.results || []).map((item) => mapTmdbItem({ ...item, media_type: mediaType })).filter(Boolean);
    })
  );

  return groups.flat().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 30);
}

function buildCategoryItems(window, media, language) {
  return CATEGORY_ORDER.map((genre) => {
    const data = GENRES[genre];
    return {
      id: `category:${genre}`,
      type: "url",
      title: data.title,
      description: `查看${data.title}类近期热门资源`,
      link: buildCategoryLink(genre, window, media, language),
    };
  });
}

function buildCategoryLink(genre, window, media, language) {
  return `category:${genre}:window=${window}:media=${media}:language=${encodeURIComponent(language)}`;
}

function parseCategoryLink(link) {
  const parts = String(link || "").split(":");
  if (parts[0] !== "category" || !GENRES[parts[1]]) return null;
  const data = { genre: parts[1], window: "week", media: "all", language: "zh-CN" };

  for (const part of parts.slice(2)) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index);
    const value = part.slice(index + 1);
    if (key === "window") data.window = value;
    if (key === "media") data.media = value;
    if (key === "language") data.language = decodeURIComponent(value);
  }

  return data;
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
