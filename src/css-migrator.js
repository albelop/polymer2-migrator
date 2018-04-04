const lodash = require("lodash/fp");
const logger = require("./logger.js");
const csstree = require("css-tree");

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

const hasNoOldShadowStyle = rule => {
  var style = csstree.generate(rule.prelude);
  return !style.includes("::shadow") && !style.includes("/deep/");
};

const fixShadow = style => {
  var ast = csstree.parse(style);
  let rules = ast.children;

  let filteredRules = ast.children.filter(hasNoOldShadowStyle);
  
  filteredRules = filteredRules.map(elem => {
    if (elem.type === "Atrule") {
      elem.block.children = elem.block.children.filter(hasNoOldShadowStyle);
    }
    return elem;
  });

  if (rules.getSize() !== filteredRules.getSize()) {
    logger.verbose(
      '- Removed CSS rules with deprecated selectors "::shadow" or "/deep/").'
    );
    ast.children = filteredRules;
  }

  return csstree.generate(ast);
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
