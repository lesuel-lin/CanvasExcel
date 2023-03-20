const path = require('path');
var webpack = require('webpack');
// ** 导入自动生成HTMl文件的插件
var htmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'development',
  entry: path.join(__dirname, 'src/main.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "bundle.js"
  },
  plugins: [ // ** 添加plugins节点配置插件
    new htmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),//模板路径
      filename: 'index.html'//自动生成的HTML文件的名称
    }),
    new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    hot: true,
    open: true,
    port: 4321,
    static: './src'
  }
}