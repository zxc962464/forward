WidgetMetadata = {
  id: "forward.trending-by-genre",
  title: "流行趋势分类",
  version: "1.3.0",
  requiredVersion: "0.0.1",
  description: "默认展示近期整体流行趋势，也可以用组合筛选查看中国爱情片、日本恐怖片等资源。",
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
          name: "filter",
          title: "筛选",
          type: "enumeration",
          value: "all:all",
          enumOptions: [
            { title: "全部趋势", value: "all:all" },
            { title: "爱情片", value: "all:romance" },
            { title: "恐怖片", value: "all:horror" },
            { title: "动画片", value: "all:animation" },
            { title: "喜剧片", value: "all:comedy" },
            { title: "动作片", value: "all:action" },
            { title: "科幻片", value: "all:science_fiction" },
            { title: "中国大陆爱情片", value: "CN:romance" },
            { title: "中国大陆喜剧片", value: "CN:comedy" },
            { title: "中国大陆动作片", value: "CN:action" },
            { title: "中国香港动作片", value: "HK:action" },
            { title: "中国台湾爱情片", value: "TW:romance" },
            { title: "日本恐怖片", value: "JP:horror" },
            { title: "日本动画片", value: "JP:animation" },
            { title: "日本爱情片", value: "JP:romance" },
            { title: "韩国爱情片", value: "KR:romance" },
            { title: "韩国犯罪片", value: "KR:crime" },
            { title: "美国恐怖片", value: "US:horror" },
            { title: "美国科幻片", value: "US:science_fiction" },
            { title: "美国喜剧片", value: "US:comedy" },
            { title: "英国剧情片", value: "GB:drama" },
            { title: "法国爱情片", value: "FR:romance" },
            { title: "印度爱情片", value: "IN:romance" },
            { title: "泰国恐怖片", value: "TH:horror" },
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

const COUNTRIES = {
  CN: "中国大陆",
  HK: "中国香港",
  TW: "中国台湾",
  JP: "日本",
  KR: "韩国",
  US: "美国",
  GB: "英国",
  FR: "法国",
  IN: "印度",
  TH: "泰国",
};

async function loadTrendingByGenre(params = {}) {
  const page = Number(params.page || 1);
  const language = params.language || "zh-CN";
  const window = params.window === "day" ? "day" : "week";
  const media = normalizeMedia(params.media);
  const filter = parseFilter(params.filter, params.genre, params.country);
  const genre = filter.genre;
  const country = filter.country;

  if (genre !== "all" || country !== "all") {
    return loadDiscoverByFilters(genre, country, window, media, page, language);
  }

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

function normalizeCountry(country) {
  if (COUNTRIES[country]) return country;
  return "all";
}

function parseFilter(filter, legacyGenre, legacyCountry) {
  if (!filter && (legacyGenre || legacyCountry)) {
    return {
      country: normalizeCountry(legacyCountry),
      genre: legacyGenre || "all",
    };
  }

  const parts = String(filter || "all:all").split(":");
  return {
    country: normalizeCountry(parts[0]),
    genre: parts[1] || "all",
  };
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

async function loadDiscoverByFilters(genre, country, window, media, page, language) {
  const requests = media === "all" ? ["movie", "tv"] : [media];
  const groups = await Promise.all(
    requests.map(async (mediaType) => {
      const genreId = GENRES[genre] && GENRES[genre][mediaType];
      if (genre !== "all" && !genreId) return [];
      const query = {
        page,
        language,
        sort_by: window === "day" ? "popularity.desc" : "vote_count.desc",
        include_adult: false,
      };
      if (genreId) query.with_genres = genreId;
      if (country !== "all") query.with_origin_country = country;

      const res = await Widget.tmdb.get(`discover/${mediaType}`, {
        params: query,
      });
      return (res.results || [])
        .map((item) => mapTmdbItem({ ...item, media_type: mediaType }))
        .filter(Boolean);
    })
  );

  return groups.flat().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
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
