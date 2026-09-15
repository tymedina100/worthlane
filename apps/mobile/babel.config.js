module.exports = function (api) {
  api.cache(true);
  return {
    // Zustand ESM uses import.meta; Metro serves web bundles as classic scripts.
    presets: [["babel-preset-expo", { web: { unstable_transformImportMeta: true } }]],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: { "@": "./src" },
        },
      ],
    ],
  };
};
