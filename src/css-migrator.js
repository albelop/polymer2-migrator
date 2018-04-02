const lodash = require("lodash/fp");
const logger = require("./logger.js");

const fixCss = (style, regexp, str, msg) => {
  var newStyle = style.replace(new RegExp(regexp), str);
  if (newStyle !== style) {
    logger.verbose(msg);
  }
  return newStyle;
};

const fixRoot = style =>
  fixCss(style, /:root/g, ":host > *", 'Replaced ":root" with ":host > *".');
const fixDefaultVal = style =>
  fixCss(
    style,
    /var\((.*), *(--.*)\)/g,
    "var($1, var($2))",
    "Fixed wrong default values in CSS variables."
  );

const fixApply = style =>
  fixCss(style, /@apply\((.*?)\)/g, "@apply $1", 'Updated "@apply" rules.');
const fixSlotted = style =>
  fixCss(
    style,
    /::content *>? *([\s\S]+?) *{/g,
    "::slotted($1) {",
    'Replaced "::content" selector with "::slotted".'
  );

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
      'Removed CSS rules with deprecated selectors "::shadow" or "/deep/").'
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
      logger.verbose('Defined "custom-style" as wrapper.');
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
