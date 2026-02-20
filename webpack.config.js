const path = require('path');
const HtmlInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const HtmlPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => ({
    mode: argv.mode === 'production' ? 'production' : 'development',
    devtool: argv.mode === 'production' ? false : 'inline-source-map',

    entry: {
        ui: './src/ui/index.tsx',
        code: './src/code/code.ts',
    },

    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                        plugins: [
                            "@babel/plugin-proposal-optional-chaining",
                            "@babel/plugin-proposal-object-rest-spread"
                        ]
                    },
                },
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'node_modules/@gravity-ui/uikit'),
                    path.resolve(__dirname, 'node_modules/@gravity-ui/uikit-themer'),
                ]
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|jpg|gif|webp|svg|zip)$/,
                use: ['url-loader'],
            },
        ],
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.jsx', '.js'],
        fallback: {
            "fs": false,
            "url": false,
            "tls": false,
            "net": false,
            "path": false,
            "zlib": false,
            "http": false,
            "https": false,
            "stream": false,
            "crypto": false,
        }
    },

    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/',
    },

    plugins: [
        new HtmlPlugin({
            template: './src/ui/ui.html',
            filename: 'ui.html',
            inlineSource: '.(js)$',
            chunks: ['ui'],
            inject: 'body',
            cache: false,
        }),
        new HtmlInlineSourcePlugin(HtmlPlugin),
    ],

    watchOptions: {
        ignored: /node_modules/,
        poll: true,
    },
});
