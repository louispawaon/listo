const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    background: "./src/background/index.ts",
    content: "./src/content/index.ts",
    popup: "./src/popup/index.tsx",
    editor: "./src/editor/index.tsx",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    /** Stops webpack 5's `publicPath: "auto"` heuristics (breaks in MV3 content scripts). */
    publicPath: "",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            allowTsInNodeModules: true,
            compilerOptions: {
              noEmit: false,
            },
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              // Let root-relative `url(/fonts/...)` references through
              // unchanged — they resolve against the extension's origin at
              // runtime (chrome-extension://<id>/fonts/…), not against the
              // CSS file's location at build time.
              url: {
                filter: (url) => !url.startsWith("/"),
              },
            },
          },
          "postcss-loader",
        ],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@types": path.resolve(__dirname, "src/types"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@pdf": path.resolve(__dirname, "src/pdf"),
      "@content": path.resolve(__dirname, "src/content"),
      "@editor": path.resolve(__dirname, "src/editor"),
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new CopyPlugin({
      patterns: [
        { from: "public", to: "." },
        { from: "icons", to: "icons" },
      ],
    }),
  ],
};
