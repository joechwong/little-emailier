const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: slsw.lib.entries,
  node: {
    __dirname: true,
  },
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  resolve: {
    extensions: ['.js'],
  },
  optimization: {
    // We no not want to minimize our code.
    minimize: false,
  },
  performance: {
    // Turn off size warnings for entry points
    hints: false,
  },
  devtool: 'nosources-source-map',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
    ],
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
    sourceMapFilename: '[file].map',
  },
};
