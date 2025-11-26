const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    // Suppress source-map-loader errors for missing source maps in node_modules
    // Find and modify source-map-loader rules
    if (config.module && config.module.rules) {
      config.module.rules.forEach((rule) => {
        if (rule.use) {
          rule.use.forEach((use) => {
            if (use.loader && use.loader.includes('source-map-loader')) {
              // Exclude node_modules from source map checking
              if (!use.options) {
                use.options = {};
              }
              use.options = {
                ...use.options,
                filterSourceMappingUrl: () => 'skip',
              };
            }
          });
        }
        if (rule.loader && rule.loader.includes('source-map-loader')) {
          // Exclude node_modules
          if (!rule.exclude) {
            rule.exclude = [];
          }
          if (Array.isArray(rule.exclude)) {
            rule.exclude.push(/node_modules/);
          } else {
            rule.exclude = [rule.exclude, /node_modules/];
          }
        }
      });
    }
    
    return config;
  }
);

