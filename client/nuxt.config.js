import pkg from './package.json'
import CopyPlugin from 'copy-webpack-plugin'
import WorkerPlugin from 'worker-plugin'

export default {
  mode: 'spa',
  /*
   ** Headers of the page
   */
  head: {
    //titleTemplate: '%s - ' + process.env.npm_package_name,
    title: 'ancient: ancestry inference with neural nets',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content: process.env.npm_package_description || ''
      }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      {
        rel: 'stylesheet',
        href:
          'https://fonts.googleapis.com/css?family=Rosarivo|Unica+One|Comfortaa&display=swap'
      }
    ]
  },
  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#fff' },
  /*
   ** Global CSS
   */
  css: [],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [],
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: ['@nuxtjs/vuetify'],
  /*
   ** Nuxt.js modules
   */
  modules: [
    //'@nuxtjs/pwa'
  ],
  env: {
    baseUrl: process.env.BASE_URL || '/'
  },
  router: {
    base: process.env.BASE_URL || '/'
  },
  /*
   ** vuetify module configuration
   ** https://github.com/nuxt-community/vuetify-module
   */
  vuetify: {
    defaultAssets: {
      font: true,
      icons: 'fa'
    }
  },
  /*
   ** Build configuration
   */
  build: {
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {
      config.module.rules.push({
        test: /\.(tsv|txt)(\.gz)?$/,
        loader: 'file-loader',
        options: {
          name: '[hash].[name].[ext]'
        }
      })
      config.plugins.push(
        new CopyPlugin([
          {
            from: 'tfjs_artifacts/*',
            to: `tfjs_artifacts.${pkg.version}/`,
            flatten: true
          }
        ])
      )
      config.plugins.push(new WorkerPlugin({ globalObject: false }))
    }
  }
}
