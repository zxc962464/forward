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
        return {
          results: [
            {
              id: 401,
              title: "Comedy Movie",
              genre_ids: [35],
              poster_path: "/discover-comedy.jpg",
              vote_average: 8.1,
            },
          ],
        };
      }
      if (api === "discover/tv") {
        return {
          results: [
            {
              id: 402,
              name: "Comedy Show",
              genre_ids: [35],
              poster_path: "/discover-comedy-tv.jpg",
              vote_average: 7.6,
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
  assert.equal(WidgetMetadata.modules[0].params.some((param) => param.name === "genre"), false);

  const all = await loadTrendingByGenre({ window: "week", media: "all", page: 1, language: "zh-CN" });
  assert.equal(all[0].type, "url");
  assert.equal(all[0].title, "恐怖");
  assert.ok(all[0].link.startsWith("category:horror:"));
  assert.equal(all[14].type, "tmdb");
  assert.equal(all[14].mediaType, "movie");
  assert.equal(all[14].posterPath, "/horror.jpg");
  assert.equal(all[14].poster_path, undefined);

  const pageTwo = await loadTrendingByGenre({ window: "week", media: "all", page: 2 });
  assert.equal(pageTwo.length, 2);
  assert.equal(pageTwo[0].type, "tmdb");

  const romanceMovies = await loadTrendingByGenre({ window: "day", media: "movie", page: 2 });
  assert.equal(romanceMovies.length, 2);
  assert.equal(romanceMovies[0].id, 201);
  assert.equal(romanceMovies[0].mediaType, "movie");

  const detail = await loadDetail(all[3].link);
  assert.equal(detail.type, "url");
  assert.equal(detail.title, "喜剧热门趋势");
  assert.equal(Array.isArray(detail.relatedItems), true);
  assert.equal(detail.relatedItems.length, 2);
  assert.equal(detail.relatedItems[0].id, 401);
  assert.equal(detail.relatedItems[0].mediaType, "movie");

  const results = await search({ keyword: "show", page: 1, language: "zh-CN" });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 301);
  assert.equal(results[0].mediaType, "tv");

  assert.ok(calls.some((call) => call.api === "trending/all/week" && call.params.language === "zh-CN"));
  assert.ok(calls.some((call) => call.api === "trending/movie/day" && call.params.page === 2));
  assert.ok(calls.some((call) => call.api === "discover/movie" && call.params.with_genres === 35));
  assert.ok(calls.some((call) => call.api === "discover/tv" && call.params.with_genres === 35));
  assert.ok(calls.some((call) => call.api === "search/multi" && call.params.query === "show"));

  console.log("ok", calls);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
