WidgetMetadata = {
  id: "forward.trending-by-genre",
  title: "流行趋势分类",
  version: "1.4.0",
  requiredVersion: "0.0.1",
  description: "按国家/地区模块查看近期流行趋势，并在模块内选择爱情、恐怖、动画、喜剧等类别。",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  modules: [
    createRegionModule("loadTrendingAllRegions", "全部地区", "all"),
    createRegionModule("loadTrendingCN", "中国大陆", "CN"),
    createRegionModule("loadTrendingHK", "中国香港", "HK"),
    createRegionModule("loadTrendingTW", "中国台湾", "TW"),
    createRegionModule("loadTrendingJP", "日本", "JP"),
    createRegionModule("loadTrendingKR", "韩国", "KR"),
    createRegionModule("loadTrendingUS", "美国", "US"),
    createRegionModule("loadTrendingGB", "英国", "GB"),
    createRegionModule("loadTrendingFR", "法国", "FR"),
    createRegionModule("loadTrendingIN", "印度", "IN"),
    createRegionModule("loadTrendingTH", "泰国", "TH"),
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

function createRegionModule(id, title, country) {
  return {
    id,
    title,
    functionName: "loadTrendingByGenre",
    cacheDuration: 1800,
    requiresWebView: false,
    params: [
      { name: "country", title: "地区", type: "constant", value: country },
      {
        name: "genre",
        title: "类别",
        type: "enumeration",
        value: "all",
        enumOptions: [
          { title: "全部", value: "all" },
          { title: "爱情", value: "romance" },
          { title: "恐怖", value: "horror" },
          { title: "动画", value: "animation" },
          { title: "喜剧", value: "comedy" },
          { title: "动作", value: "action" },
          { title: "冒险", value: "adventure" },
          { title: "犯罪", value: "crime" },
          { title: "纪录片", value: "documentary" },
          { title: "剧情", value: "drama" },
          { title: "家庭", value: "family" },
          { title: "奇幻", value: "fantasy" },
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
  };
}

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
