const pluginTOC = require('eleventy-plugin-toc');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function(eleventyConfig) {
  // Add the RSS plugin
  eleventyConfig.addPlugin(pluginRss.default || pluginRss);

  // 1. Copy Assets & App Files
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/manifest.json");
  eleventyConfig.addPassthroughCopy("src/sw.js");

  // 2. Configure Table of Contents Plugin
  eleventyConfig.addPlugin(pluginTOC, {
    tags: ['h2', 'h3'], // Only include ## and ### headings
    wrapper: 'div',
    wrapperClass: 'toc'
  });

  // 3. Configure Markdown to add invisible anchor IDs to headings
  const markdownLibrary = markdownIt({
    html: true,
    breaks: true,
    linkify: true
  }).use(markdownItAnchor, {
    permalink: false // Set to true if you want a clickable "#" next to headers
  });
  eleventyConfig.setLibrary("md", markdownLibrary);

  // 4. Filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  });

  eleventyConfig.addFilter("readingTime", (content) => {
    if (!content) return 0;
    const textOnly = content.replace(/(<([^>]+)>)/gi, "");
    const wordCount = textOnly.split(/\s+/).length;
    const readingRate = 200;
    return Math.ceil(wordCount / readingRate);
  });

  // Author Stats Aggregator
  eleventyConfig.addFilter("authorStats", (posts, authorName) => {
    if (!posts) return { count: 0, words: 0, minutes: 0 };
    
    let wordCount = 0;
    let postCount = 0;

    posts.forEach(post => {
      // .trim() removes invisible spaces from the markdown formatting
      let postAuthor = String(post.data.author || "").trim();
      let currentAuthor = String(authorName || "").trim();

      if (postAuthor === currentAuthor) {
        postCount++;
        // Use templateContent as a safe fallback for word counting
        let contentToCount = post.templateContent || post.content || "";
        const textOnly = contentToCount.replace(/(<([^>]+)>)/gi, "");
        wordCount += textOnly.split(/\s+/).length;
      }
    });

    const readingRate = 200; // Words per minute
    
    return {
      count: postCount,
      words: wordCount.toLocaleString(),
      minutes: Math.ceil(wordCount / readingRate)
    };
  });

  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};