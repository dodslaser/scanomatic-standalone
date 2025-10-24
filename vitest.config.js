import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
      projects: [
      {
        test: {
          name: 'api',
          environment: 'jsdom',
          globals: true,
          include: [
            'frontend/js/tests/api.test.js',
            'frontend/js/tests/helpers.test.js',
          ],
          reporters: ['default'],
          watch: true,
          ui: false,
        },
      },
      {
        test: {
          name: 'components',
          environment: 'jsdom',
          globals: true,
          include: [
            'frontend/js/tests/**/CCCEditor.test.jsx',
            'frontend/js/tests/**/CCCInfoBox.test.jsx',
            'frontend/js/tests/**/CCCInitialization.test.jsx',
            'frontend/js/tests/**/ColonyEditor.test.jsx',
            'frontend/js/tests/**/ColonyFeatures.test.jsx',
            'frontend/js/tests/**/ColonyImage.test.jsx',
            'frontend/js/tests/**/FinalizedCCC.test.jsx',
            'frontend/js/tests/**/Gridding.test.jsx',
            'frontend/js/tests/**/ImageUpload.test.jsx',
            'frontend/js/tests/**/Plate.test.jsx',
            'frontend/js/tests/**/PlateEditor.test.jsx',
            'frontend/js/tests/**/PlateProgress.test.jsx',
            'frontend/js/tests/**/PolynomialConstruction.test.jsx',
            'frontend/js/tests/**/PolynomialConstructionError.test.jsx',
            // 'frontend/js/tests/**/PolynomialConstructionPlotScatter.test.jsx',
          ],
          exclude: [
            // 'frontend/js/tests/components/*.jsx',
            'frontend/js/tests/containers/*.jsx',
          ],
          reporters: ['default'],
          watch: true,
          ui: false,
        },
      }
    ],
  },
})