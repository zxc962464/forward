const fs = require("fs");
const assert = require("assert/strict");

const calls = [];

global.Widget = {
  tmdb: {
    get: async (api, options = {}) => {
      calls.push({ api, params: options.params || {} });
      if (api === "trending/all/week") {
        return {
          results: [
            {
              id: 101,
              media_type: "movie",
              title: "Popular Horror",
              genre_ids: [27],
              poster_path: "/horror.jpg",
              vote_average: 7.1,
            },
            {
              id: 102,
              media_type: "tv",
              name: "Popular Comedy",
              genre_ids: [35],
              poster_path: "/comedy.jpg",
            },
            {
              id: 103,
              media_type: "person",
              name: "Actor",
            },
          ],
        };
      }
      if (api === "trending/movie/day") {
        return {
          results: [
            {
              id: 201,
              title: "Romance Movie",
              genre_ids: [10749],
              poster_path: "/romance.jpg",
            },
            {
              id: 202,
              title: "Action Movie",
              genre_ids: [28],
            },
          ],
        };
      }
      if (api === "discover/movie") {
        const genre = String(options.params && options.params.with_genres);
        const country = options.params && options.params.with_origin_country;
        if (genre === "27" && country === "JP") {
          return {
            results: [
              {
                id: 401,
                title: "Japanese Horror",
                genre_ids: [27],
                poster_path: "/discover-horror.jpg",
                vote_average: 7.8,
              },
            ],
          };
        }
        if (genre === "10749" && country === "CN") {
          return {
            results: [
              {
                id: 402,
                title: "Chinese Romance",
                genre_ids: [10749],
                poster_path: "/discover-romance.jpg",
                vote_average: 8.1,
              },
            ],
          };
        }
        if (genre === "16" && country === "JP") {
          return {
            results: [
              {
                id: 404,
                title: "Japanese Anime Movie",
                genre_ids: [16],
                poster_path: "/anime-movie.jpg",
                vote_average: 8.6,
              },
            ],
          };
        }
        if (genre === "undefined" && country === "KR") {
          return {
            results: [
              {
                id: 403,
                title: "Korean Popular Movie",
                poster_path: "/discover-kr.jpg",
                vote_average: 7.3,
              },
            ],
          };
        }
        if (genre === "undefined" && options.params && options.params.without_genres === 16) {
          return {
            results: [
              {
                id: 405,
                title: "Non Anime Movie",
                genre_ids: [28],
                poster_path: "/movie.jpg",
                vote_average: 7.4,
              },
            ],
          };
        }
        return { results: [] };
      }
      if (api === "discover/tv") {
        const genre = String(options.params && options.params.with_genres);
        const country = options.params && options.params.with_origin_country;
        if (genre === "16" && country === "JP") {
          return {
            results: [
              {
                id: 406,
                name: "Japanese Anime TV",
                genre_ids: [16],
                poster_path: "/anime-tv.jpg",
                vote_average: 8.2,
              },
            ],
          };
        }
        return { results: [] };
      }
      if (api === "search/multi") {
        return {
          results: [
            {
              id: 301,
              media_type: "tv",
              name: "Search Show",
              genre_ids: [18],
              poster_path: "/show.jpg",
            },
            {
              id: 302,
              media_type: "person",
              name: "Person",
            },
          ],
        };
      }
      throw new Error("unmocked tmdb api: " + api);
    },
  },
};
global.WidgetMetadata = {};

eval(fs.readFileSync(process.argv[2] || "./widgets/trending-by-genre.js", "utf8"));

(async () => {
  assert.equal(WidgetMetadata.id, "forward.trending-by-genre");
  assert.equal(WidgetMetadata.modules[0].functionName, "loadTrendingByGenre");
  assert.equal(WidgetMetadata.search.functionName, "search");
  assert.equal(WidgetMetadata.modules.length, 11);
  assert.equal(WidgetMetadata.modules[0].title, "全部地区");
  assert.equal(WidgetMetadata.modules[1].title, "中国大陆");
  assert.equal(WidgetMetadata.modules[4].title, "日本");
  assert.equal(WidgetMetadata.modules[1].params.some((param) => param.name === "country" && param.type === "constant" && param.value === "CN"), true);
  assert.equal(WidgetMetadata.modules[1].params.some((param) => param.name === "genre"), true);
  assert.equal(WidgetMetadata.modules[1].params.some((param) => param.name === "filter"), false);
  const mediaParam = WidgetMetadata.modules[1].params.find((param) => param.name === "media");
  assert.equal(mediaParam.enumOptions.some((option) => option.value === "anime"), true);

  const all = await loadTrendingByGenre({ genre: "all", country: "all", window: "week", media: "all", page: 1, language: "zh-CN" });
  assert.equal(all.length, 2);
  assert.equal(all[0].type, "tmdb");
  assert.equal(all[0].mediaType, "movie");
  assert.equal(all[0].posterPath, "/horror.jpg");
  assert.equal(all[0].poster_path, undefined);

  const horror = await loadTrendingByGenre({ genre: "horror", country: "JP", window: "week", media: "all", page: 1 });
  assert.equal(horror.length, 1);
  assert.equal(horror[0].id, 401);

  const romanceMovies = await loadTrendingByGenre({ genre: "romance", country: "CN", window: "day", media: "movie", page: 2 });
  assert.equal(romanceMovies.length, 1);
  assert.equal(romanceMovies[0].id, 402);
  assert.equal(romanceMovies[0].mediaType, "movie");

  const koreanPopular = await loadTrendingByGenre({ genre: "all", country: "KR", window: "week", media: "movie", page: 1 });
  assert.equal(koreanPopular.length, 1);
  assert.equal(koreanPopular[0].id, 403);

  const anime = await loadTrendingByGenre({ genre: "all", country: "JP", window: "week", media: "anime", page: 1 });
  assert.equal(anime.length, 2);
  assert.equal(anime[0].mediaType, "movie");
  assert.equal(anime[1].mediaType, "tv");

  const nonAnimeMovies = await loadTrendingByGenre({ genre: "all", country: "all", window: "week", media: "movie", page: 1 });
  assert.equal(nonAnimeMovies.length, 1);
  assert.equal(nonAnimeMovies[0].id, 405);

  const results = await search({ keyword: "show", page: 1, language: "zh-CN" });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 301);
  assert.equal(results[0].mediaType, "tv");

  assert.ok(calls.some((call) => call.api === "trending/all/week" && call.params.language === "zh-CN"));
  assert.ok(calls.some((call) => call.api === "discover/movie" && call.params.with_genres === "27" && call.params.with_origin_country === "JP"));
  assert.ok(calls.some((call) => call.api === "discover/movie" && call.params.with_genres === "10749" && call.params.with_origin_country === "CN" && call.params.page === 2));
  assert.ok(calls.some((call) => call.api === "discover/movie" && call.params.with_origin_country === "KR" && call.params.with_genres === undefined));
  assert.ok(calls.some((call) => call.api === "discover/movie" && call.params.with_genres === "16" && call.params.with_origin_country === "JP" && call.params.without_genres === undefined));
  assert.ok(calls.some((call) => call.api === "discover/tv" && call.params.with_genres === "16" && call.params.with_origin_country === "JP" && call.params.without_genres === undefined));
  assert.ok(calls.some((call) => call.api === "discover/movie" && call.params.without_genres === 16 && call.params.with_genres === undefined));
  assert.ok(calls.some((call) => call.api === "search/multi" && call.params.query === "show"));

  console.log("ok", calls);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
