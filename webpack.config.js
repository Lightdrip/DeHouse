const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new Dotenv({
      systemvars: true, // Allow loading system environment variables
      silent: true, // Hide errors if .env file is missing
    })
  ],
  devServer: {
    historyApiFallback: true,
    port: 3001,
    hot: true,
    proxy: [
      {
        context: ['/solana-fm-api'],
        target: 'https://api.solana.fm',
        pathRewrite: { '^/solana-fm-api': '/v0' },
        changeOrigin: true,
        secure: false
      },
      {
        context: ['/solana-rpc'],
        target: 'https://api.mainnet-beta.solana.com',
        pathRewrite: { '^/solana-rpc': '' },
        changeOrigin: true,
        secure: true
      },
      {
        context: ['/api'],
        target: 'https://dehouse.vercel.app',
        changeOrigin: true,
        secure: true
      }
    ]
  }
};