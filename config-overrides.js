const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    // Completely disable source maps in production to fix "originalPositionFor is not a function" error
    if (process.env.NODE_ENV === 'production') {
      // Disable source map generation
      config.devtool = false;
      
      // Remove source-map-loader completely
      const removeSourceMapLoader = (rules) => {
        if (!rules) return rules;
        
        return rules.filter((rule) => {
          // Handle oneOf rules (nested rules)
          if (rule.oneOf) {
            rule.oneOf = removeSourceMapLoader(rule.oneOf);
          }
          
          // Filter out rules that use source-map-loader
          if (rule.use) {
            rule.use = rule.use.filter((use) => {
              if (typeof use === 'string') {
                return !use.includes('source-map-loader');
              }
              if (use && use.loader) {
                return !use.loader.includes('source-map-loader');
              }
              return true;
            });
            // If use array is empty, filter out the entire rule
            if (rule.use.length === 0) {
              return false;
            }
          }
          
          // Filter out rules that are source-map-loader directly
          if (rule.loader && rule.loader.includes('source-map-loader')) {
            return false;
          }
          
          return true;
        });
      };
      
      if (config.module && config.module.rules) {
        config.module.rules = removeSourceMapLoader(config.module.rules);
      }
    }
    
    return config;
  }
);

