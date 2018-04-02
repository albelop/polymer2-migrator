const lodash = require("lodash/fp");
const logger = require("./logger.js");

const fixRoot = style => style.replace(/:root/g, ":host > *");

const fixDefaultVal = style =>
  style.replace(/var\((.*), *(--.*)\)/g, "var($1, var($2))");

const fixApply = style => {
  var regexp = new RegExp(/@apply\((.*?)\)/g);
  var newStyle = style.replace(regexp, "@apply $1");
  if (style !== newStyle) {
    logger.verbose(
      `Updated ${
        style.match(regexp).length
      } "@apply" rules.`
    );
  }
  return newStyle;
};

const fixSlotted = style => {
  var regexp = new RegExp(/::content *>? *([\s\S]+?) *{/g);
  var newStyle = style.replace(regexp, "::slotted($1) {");
  if (style !== newStyle) {
    logger.verbose(
      `Replaced ${
        style.match(regexp).length
      } "::content" selector with "::slotted"`
    );
  }
  return newStyle;
};
const isOldShadowStyle = style =>
  style.includes("::shadow") || style.includes("/deep/");
const splitRules = style => style.match(/.+?\{.+?\}/gim);
const trimSpaces = str => str.replace(/\s+\s+/gm, "");
const trimNewLines = str => str.replace(/(\r\n|\n|\r)/gm, "");

const fixShadow = style => {
  let rules = lodash.compose(splitRules, trimSpaces, trimNewLines)(style);
  var filteredRules = rules.filter(e => !isOldShadowStyle(e));
  var removedLinesCount = rules.length - filteredRules.length;
  if (removedLinesCount > 0) {
    logger.verbose(
      `Removed ${removedLinesCount} CSS rules with deprecated selectors (::shadow and /deep/).`
    );
  }
  return !!rules ? filteredRules.join("\n") : "";
};

const fixCustomStyleRoot = str => str.replace(/\:root/g, "html");
const fixCustomStyleTag = node => {
  node.tagName = "custom-style";
  delete node.attribs.is;
};

module.exports = {
  migrate: styleNode => {
    let newStyleNode = lodash.cloneDeep(styleNode);

    if (newStyleNode.attribs.is && newStyleNode.attribs.is === "custom-style") {
      newStyleNode.children = newStyleNode.children.map(child => {
        child.data = fixCustomStyleRoot(child.data);
        return child;
      });
      fixCustomStyleTag(newStyleNode);
    }
    newStyleNode.children = newStyleNode.children.map(child => {
      child.data = lodash.compose(
        fixShadow,
        fixSlotted,
        fixRoot,
        fixDefaultVal,
        fixApply
      )(child.data);
      return child;
    });

    return newStyleNode;
  }
};
