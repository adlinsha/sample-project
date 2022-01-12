const currentTask = process.env.npm_lifecycle_event;
const path = require('path');
const postCssPlugin = [require('autoprefixer')];
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fse = require('fs-extra');

class RunAfterCompile{
    apply(compiler){
        compiler.hooks.done.tap('Copy images', function (){
            fse.copySync('./app/assets/images', './docs/assets/images')
        })
    }
}

let cssConfig = {
    test: /\.s[ac]ss$/i, 
    use: [
        { loader: 'css-loader', options: {url: false} }, 
        { loader: 'sass-loader'},
        { loader: 'postcss-loader', options: {postcssOptions: {plugins: postCssPlugin}}}
    ]
};

let pages = fse.readdirSync('./app').filter(function(file){
    return file.endsWith('.html');
}).map(function(page){
    return new HtmlWebpackPlugin({
        filename: page,
        template: `./app/${page}`,
        inject: true
    })
});

let config = {
    entry: './app/assets/js/Main.js',
    plugins: pages,
    module: {
        rules: [
            cssConfig,{
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    }
};

if(currentTask == 'watch' || currentTask == 'start'){
    cssConfig.use.unshift('style-loader');
    config.output = {
        filename: 'bundled.js',
        path: path.resolve(__dirname, 'app')
    };
    config.devServer = {
        onBeforeSetupMiddleware: function (devServer) {
            devServer.app.get("./app/**/*.html", function (req, res) {
              res.json({ custom: "response" })
            })
        },
        static: path.join(__dirname, 'app'),
        hot: true,
        port: 3000, 
        host: '0.0.0.0'
    };
    config.mode = 'development';
}

if(currentTask == 'build'){
    cssConfig.use.unshift(MiniCssExtractPlugin.loader);
    config.plugins.push(new MiniCssExtractPlugin({filename: 'style.css'}), new RunAfterCompile());
    config.output = {
        filename: 'scripts.js',
        chunkFilename: 'scripts.js',
        path: path.resolve(__dirname, 'docs')
    };
    config.mode='production';
    config.optimization = {
        splitChunks: {chunks: 'all'},
        minimize: true,
        minimizer: [`...`, new CssMinimizerPlugin()]
    };
}

module.exports = config;