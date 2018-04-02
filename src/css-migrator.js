const lodash = require("lodash/fp");
const logger = require("./logger.js");

const fixCss = (style, regexp, str, msg) => {
  var newStyle = style.replace(new RegExp(regexp), str);
  if (newStyle !== style) {
    logger.verbose(`- ${msg}`);
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
  if (rules.length !== filteredRules.length) {
    logger.verbose(
      '- Removed CSS rules with deprecated selectors "::shadow" or "/deep/").'
    );
  }
  return !!filteredRules ? filteredRules.join("\n") : "";
};

const fixCustomStyleRoot = str => str.replace(/\:root/g, "html");
const fixCustomStyleTag = node => {
  node.tagName = "custom-style";
  delete node.attribs.is;
};

const wrapCustomStyle = node => {
  let newCustomStyleNode = lodash.cloneDeep(node);
  newCustomStyleNode.children = newCustomStyleNode.children.map(child => {
    child.data = fixCustomStyleRoot(child.data);
    return child;
  });
  delete newCustomStyleNode.attribs.is;
  node.children = [newCustomStyleNode];
  node.tagName = "custom-style";
  delete node.attribs.is;
  logger.verbose('- Wrapped custom style with "<custom-style>" tag.');
  return node;
};

module.exports = {
  migrate: styleNode => {
    let newStyleNode = lodash.cloneDeep(styleNode);

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

    if (newStyleNode.attribs.is && newStyleNode.attribs.is === "custom-style") {
      newStyleNode = wrapCustomStyle(newStyleNode);
    }

    return newStyleNode;
  }
};
