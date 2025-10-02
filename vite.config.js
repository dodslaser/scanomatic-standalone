import path from 'path'
import { defineConfig } from 'vite'
import { replacePlugin } from 'rolldown/experimental';

const libPaths = {
  ccc: path.resolve(__dirname, 'scanomatic/ui_server_data/js/ccc/'),
  som: path.resolve(__dirname, 'scanomatic/ui_server_data/js/som/'),
}
const libName = process.env.LIB_NAME || 'som'

export default defineConfig({
  mode: 'production',
  build: {
    outDir: 'scanomatic/ui_server_data/js/somlib',
    assetsDir: '',
    emptyOutDir: false,
    manifest: false,
    lib: {
      entry: { [libName]: libPaths[libName] },
      formats: ['umd'],
      name: libName,
      fileName: libName,
      cssFileName: libName,
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        chunkFileNames: '[name].js',
        globals: {this: 'globalThis'},
      },
      plugins: [
        replacePlugin({'process.env.NODE_ENV': JSON.stringify('production')}),
      ],
      inject: {
        $: 'jquery',
        jQuery: 'jquery',
      },
    },
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx'],
    alias: {'jquery-ui': 'jquery-ui-dist/jquery-ui.js',},
  },
})