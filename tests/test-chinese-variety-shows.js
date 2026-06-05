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
              name: "Chinese Variety",
              genre_ids: [10764],
              origin_country: ["CN"],
              poster_path: "/variety.jpg",
              first_air_date: "2026-05-01",
              vote_average: 7.6,
              overview: "popular variety show",
            },
          ],
        };
      }
      if (api === "search/tv") {
        return {
          results: [
            {
              id: 201,
              name: "Search Variety",
              genre_ids: [10767],
              origin_country: ["CN"],
              poster_path: "/search.jpg",
            },
            {
              id: 202,
              name: "Foreign Variety",
              genre_ids: [10764],
              origin_country: ["US"],
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
      if (url.includes("/subject_collection/tv_variety_show/items")) {
        return {
          data: {
            subject_collection_items: [
              {
                id: "301",
                title: "Douban Variety",
                type: "tv",
                cover: { url: "https://example.com/douban-variety.jpg" },
                rating: { value: 8.4 },
                card_subtitle: "综艺 / 中国大陆",
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

eval(fs.readFileSync(process.argv[2] || "./widgets/chinese-variety-shows.js", "utf8"));

(async () => {
  assert.equal(WidgetMetadata.id, "forward.chinese-variety-shows");
  assert.equal(WidgetMetadata.modules[0].functionName, "loadChineseVarietyShows");
  assert.equal(WidgetMetadata.search.functionName, "search");

  const tmdb = await loadChineseVarietyShows({ source: "tmdb_popular", genre: "reality", page: 1, language: "zh-CN" });
  assert.equal(tmdb.length, 1);
  assert.equal(tmdb[0].type, "tmdb");
  assert.equal(tmdb[0].mediaType, "tv");
  assert.equal(tmdb[0].posterPath, "/variety.jpg");
  assert.equal(tmdb[0].poster_path, undefined);

  const recent = await loadChineseVarietyShows({ source: "tmdb_recent", genre: "talk", page: 2, language: "zh-CN" });
  assert.equal(recent[0].id, 101);

  const douban = await loadChineseVarietyShows({ source: "douban_hot", page: 2 });
  assert.equal(douban[0].type, "douban");
  assert.equal(douban[0].id, "301");
  assert.equal(douban[0].posterPath, "https://example.com/douban-variety.jpg");

  const results = await search({ keyword: "综艺", page: 1, language: "zh-CN" });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 201);

  assert.ok(calls.some((call) => call.api === "discover/tv" && call.params.with_origin_country === "CN" && call.params.with_genres === 10764));
  assert.ok(calls.some((call) => call.api === "discover/tv" && call.params.page === 2 && call.params.with_genres === 10767 && call.params["first_air_date.gte"]));
  assert.ok(calls.some((call) => call.url && call.url.includes("/subject_collection/tv_variety_show/items") && call.params.start === 20));
  assert.ok(calls.some((call) => call.api === "search/tv" && call.params.query === "综艺"));

  console.log("ok", calls);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
