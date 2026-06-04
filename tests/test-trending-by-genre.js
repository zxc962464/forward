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

  const all = await loadTrendingByGenre({ genre: "all", window: "week", media: "all", page: 1, language: "zh-CN" });
  assert.equal(all.length, 2);
  assert.equal(all[0].type, "tmdb");
  assert.equal(all[0].mediaType, "movie");
  assert.equal(all[0].posterPath, "/horror.jpg");
  assert.equal(all[0].poster_path, undefined);

  const horror = await loadTrendingByGenre({ genre: "horror", window: "week", media: "all", page: 1 });
  assert.equal(horror.length, 1);
  assert.equal(horror[0].id, 101);

  const romanceMovies = await loadTrendingByGenre({ genre: "romance", window: "day", media: "movie", page: 2 });
  assert.equal(romanceMovies.length, 1);
  assert.equal(romanceMovies[0].id, 201);
  assert.equal(romanceMovies[0].mediaType, "movie");

  const results = await search({ keyword: "show", page: 1, language: "zh-CN" });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 301);
  assert.equal(results[0].mediaType, "tv");

  assert.ok(calls.some((call) => call.api === "trending/all/week" && call.params.language === "zh-CN"));
  assert.ok(calls.some((call) => call.api === "trending/movie/day" && call.params.page === 2));
  assert.ok(calls.some((call) => call.api === "search/multi" && call.params.query === "show"));

  console.log("ok", calls);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
