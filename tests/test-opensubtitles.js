const fs = require("fs");
const assert = require("assert/strict");

const calls = [];

global.Widget = {
  http: {
    get: async (url, options = {}) => {
      calls.push({ method: "GET", url, headers: options.headers || {}, params: options.params || {} });
      if (url.endsWith("/subtitles")) {
        return {
          data: {
            data: [
              {
                attributes: {
                  language: "zh-cn",
                  release: "Movie.2026.1080p",
                  download_count: 123,
                  format: "srt",
                  files: [{ file_id: 9001 }],
                },
              },
            ],
          },
        };
      }
      throw new Error("unmocked GET: " + url);
    },
    post: async (url, body, options = {}) => {
      calls.push({ method: "POST", url, body, headers: options.headers || {} });
      if (url.endsWith("/download") && body.file_id === 9001) {
        return { data: { link: "https://dl.opensubtitles.com/subtitle.srt" } };
      }
      throw new Error("unmocked POST: " + url);
    },
  },
};
global.WidgetMetadata = {};

eval(fs.readFileSync(process.argv[2] || "./widgets/opensubtitles.js", "utf8"));

(async () => {
  assert.equal(WidgetMetadata.id, "forward.opensubtitles");
  assert.equal(WidgetMetadata.modules[0].id, "loadSubtitle");
  assert.equal(WidgetMetadata.modules[0].type, "subtitle");
  assert.equal(WidgetMetadata.modules[0].functionName, "loadSubtitle");

  const subtitles = await loadSubtitle({
    imdbId: "tt1234567",
    type: "movie",
    title: "Movie",
    languages: "zh-cn,en",
    apiKey: "test-key",
  });

  assert.equal(subtitles.length, 1);
  assert.equal(subtitles[0].id, "9001");
  assert.equal(subtitles[0].lang, "zh-cn");
  assert.equal(subtitles[0].count, 123);
  assert.equal(subtitles[0].url, "https://dl.opensubtitles.com/subtitle.srt");

  const searchCall = calls.find((call) => call.method === "GET");
  assert.equal(searchCall.params.imdb_id, "1234567");
  assert.equal(searchCall.params.languages, "zh-cn,en");
  assert.equal(searchCall.params.type, "movie");
  assert.equal(searchCall.headers["Api-Key"], "test-key");

  const downloadCall = calls.find((call) => call.method === "POST");
  assert.equal(downloadCall.body.file_id, 9001);
  assert.equal(downloadCall.headers["Content-Type"], "application/json");

  console.log("ok", calls);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
