const fs = require("fs");
const assert = require("assert/strict");

const calls = [];

global.Widget = {
  tmdb: {
    get: async (api, options = {}) => {
      calls.push({ api, params: options.params || {} });
      if (api === "discover/tv") {
        return {
          results: [
            {
              id: 101,
              name: "Recent Anime",
              poster_path: "/poster-tv.jpg",
              backdrop_path: "/backdrop-tv.jpg",
              first_air_date: "2026-05-01",
              vote_average: 8.2,
              overview: "recent tv anime",
            },
          ],
        };
      }
      if (api === "trending/all/week") {
        return {
          results: [
            {
              id: 202,
              media_type: "tv",
              name: "Trending Anime",
              genre_ids: [16],
              poster_path: "/poster-trending.jpg",
            },
            {
              id: 303,
              media_type: "movie",
              title: "Live Action",
              genre_ids: [28],
            },
          ],
        };
      }
      if (api === "discover/movie") {
        return {
          results: [
            {
              id: 404,
              title: "Animation Movie",
              poster_path: "/poster-movie.jpg",
              release_date: "2026-04-01",
              vote_average: 7.5,
            },
          ],
        };
      }
      if (api === "search/multi") {
        return {
          results: [
            {
              id: 505,
              media_type: "movie",
              title: "Search Anime",
              genre_ids: [16],
              poster_path: "/poster-search.jpg",
            },
            {
              id: 606,
              media_type: "person",
              name: "Someone",
            },
          ],
        };
      }
      throw new Error("unmocked tmdb api: " + api);
    },
  },
  http: {
    get: async (url, options = {}) => {
      calls.push({ url, params: options.params || {} });
      if (url.includes("/subject_collection/tv_animation/items")) {
        return {
          data: {
            subject_collection_items: [
              {
                id: "357",
                title: "Douban Anime",
                type: "tv",
                cover: { url: "https://example.com/douban.jpg" },
                rating: { value: 8.8 },
                card_subtitle: "动画 / 日本",
                year: 2026,
              },
            ],
          },
        };
      }
      throw new Error("unmocked http url: " + url);
    },
  },
};
global.WidgetMetadata = {};

eval(fs.readFileSync(process.argv[2] || "./widgets/recent-hot-anime.js", "utf8"));

(async () => {
  assert.equal(WidgetMetadata.id, "forward.recent-hot-anime");
  assert.equal(WidgetMetadata.search.functionName, "search");
  assert.equal(WidgetMetadata.modules[0].functionName, "loadRecentHotAnime");

  const recent = await loadRecentHotAnime({ source: "tmdb_recent_tv", page: 1, language: "zh-CN" });
  assert.equal(recent[0].id, 101);
  assert.equal(recent[0].type, "tmdb");
  assert.equal(recent[0].mediaType, "tv");
  assert.equal(recent[0].posterPath, "/poster-tv.jpg");
  assert.equal(recent[0].poster_path, undefined);

  const trending = await loadRecentHotAnime({ source: "tmdb_trending", page: 1 });
  assert.equal(trending.length, 1);
  assert.equal(trending[0].id, 202);

  const movies = await loadRecentHotAnime({ source: "tmdb_movies", page: 1 });
  assert.equal(movies[0].mediaType, "movie");

  const douban = await loadRecentHotAnime({ source: "douban_tv", page: 2 });
  assert.equal(douban[0].type, "douban");
  assert.equal(douban[0].mediaType, "tv");
  assert.equal(douban[0].posterPath, "https://example.com/douban.jpg");
  assert.equal(douban[0].link, undefined);

  const results = await search({ keyword: "anime", page: 1, language: "zh-CN" });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 505);
  assert.equal(results[0].mediaType, "movie");

  assert.ok(calls.some((call) => call.api === "discover/tv" && call.params.with_genres === 16));
  assert.ok(calls.some((call) => call.api === "discover/movie" && call.params.with_genres === 16));
  assert.ok(calls.some((call) => call.url && call.url.includes("/subject_collection/tv_animation/items") && call.params.start === 20));

  console.log("ok", calls);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
