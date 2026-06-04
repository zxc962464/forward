WidgetMetadata = {
  id: "forward.trending-by-genre",
  title: "流行趋势分类",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "默认展示近期整体流行趋势，也可以按恐怖、动画、爱情、喜剧等类别筛选电影和剧集。",
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
          name: "genre",
          title: "类别",
          type: "enumeration",
          value: "all",
          enumOptions: [
            { title: "全部", value: "all" },
            { title: "动作", value: "action" },
            { title: "冒险", value: "adventure" },
            { title: "动画", value: "animation" },
            { title: "喜剧", value: "comedy" },
            { title: "犯罪", value: "crime" },
            { title: "纪录片", value: "documentary" },
            { title: "剧情", value: "drama" },
            { title: "家庭", value: "family" },
            { title: "奇幻", value: "fantasy" },
            { title: "恐怖", value: "horror" },
            { title: "爱情", value: "romance" },
            { title: "科幻", value: "science_fiction" },
            { title: "悬疑", value: "mystery" },
            { title: "战争", value: "war" },
          ],
        },
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
  action: { movie: 28, tv: 10759 },
  adventure: { movie: 12, tv: 10759 },
  animation: { movie: 16, tv: 16 },
  comedy: { movie: 35, tv: 35 },
  crime: { movie: 80, tv: 80 },
  documentary: { movie: 99, tv: 99 },
  drama: { movie: 18, tv: 18 },
  family: { movie: 10751, tv: 10751 },
  fantasy: { movie: 14, tv: 10765 },
  horror: { movie: 27, tv: undefined },
  romance: { movie: 10749, tv: undefined },
  science_fiction: { movie: 878, tv: 10765 },
  mystery: { movie: 9648, tv: 9648 },
  war: { movie: 10752, tv: 10768 },
};

async function loadTrendingByGenre(params = {}) {
  const page = Number(params.page || 1);
  const language = params.language || "zh-CN";
  const window = params.window === "day" ? "day" : "week";
  const media = normalizeMedia(params.media);
  const genre = params.genre || "all";

  const res = await Widget.tmdb.get(`trending/${media}/${window}`, {
    params: { page, language },
  });

  return (res.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv" || media !== "all")
    .map((item) => withMediaType(item, media))
    .filter((item) => matchesGenre(item, genre))
    .map(mapTmdbItem)
    .filter(Boolean);
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

function matchesGenre(item, genre) {
  if (!genre || genre === "all") return true;
  const mediaType = item.media_type;
  const genreId = GENRES[genre] && GENRES[genre][mediaType];
  if (!genreId) return false;
  return (item.genre_ids || []).includes(genreId);
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
