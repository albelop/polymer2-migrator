const parse5 = require("parse5");
const lodash = require("lodash/fp");
const acorn = require("acorn");
const walk = require("acorn/dist/walk");
const pretty = require("pretty");
const jsMigrator = require("./js-migrator.js");
const cssMigrator = require("./css-migrator.js");
const logger = require("./logger.js");

let needsDomIfImport;
let needsDomRepeatImport;
let linkPolymerElement;

/* Function definitions */

const isType = (...types) => e => types.includes(e.type);
const parseSelector = selector => selector.match(/([\w-]+)/g).join("-");

const html2tree = html => {
  let parser;

  if (html.includes("<html")) {
    parser = parse5.parse;
  } else {
    parser = parse5.parseFragment;
  }
  return parser(html, { treeAdapter: parse5.treeAdapters.htmlparser2 });
};
const tree2html = tree =>
  parse5.serialize(tree, { treeAdapter: parse5.treeAdapters.htmlparser2 });

const getParentTemplate = e =>
  !!e.parent &&
  (e.parent.name === "template" ? e.parent : getParentTemplate(e.parent));

const upgradeNode = elem => {
  let newElement = lodash.cloneDeep(elem);
  switch (elem.name) {
    case "dom-module":
      newElement.attribs = setDomModuleId(elem.attribs);
      break;
    case "content":
      newElement.name = "slot";
      newElement.attribs = setSlot(elem.attribs);
      logger.verbose(
        '- Updated element\'s DOM template to use "<slot>" element instead of "<content>".'
      );
      break;
    case "style":
      if (!getParentTemplate(elem)) {
        logger.warn("You need to define the style in the dom-module template");
      }
      newElement = cssMigrator.migrate(elem);
      break;
    case "script":
      if (newElement.firstChild && newElement.firstChild.data) {
        newElement.firstChild.data = jsMigrator.migrate(
          newElement.firstChild.data
        );
      }
      break;
    case "link":
      if (newElement.attribs.href.includes("polymer/polymer.html")) {
        newElement.attribs.href = newElement.attribs.href.replace(
          "polymer/polymer.html",
          "polymer/polymer-element.html"
        );
        const treeAdapter = parse5.treeAdapters.htmlparser2;
        const docFragment = treeAdapter.createDocumentFragment();
        treeAdapter.appendChild(docFragment, newElement);

        linkPolymerElement = parse5.serialize(docFragment, {
          treeAdapter: parse5.treeAdapters.htmlparser2
        });
      }
      break;
    case "template":
      needsDomIfImport = elem.attribs.is === "dom-if" ? true : needsDomIfImport;
      needsDomRepeatImport =
        elem.attribs.is === "dom-repeat" ? true : needsDomRepeatImport;
      break;
  }
  return newElement;
};

const setSlot = attrs => {
  let newAttrs = lodash.cloneDeep(attrs);
  if ("select" in attrs) {
    newAttrs.name = parseSelector(newAttrs.select);
    delete newAttrs.select;
  }
  return newAttrs;
};

const setDomModuleId = attrs => {
  let newAttrs = lodash.cloneDeep(attrs);
  if ("is" in newAttrs || "name" in newAttrs) {
    newAttrs.id = attrs.is || newAttrs.name;
    delete newAttrs.is;
    delete newAttrs.name;
    logger.verbose(
      `- Removed decrecated patterns "is" and "name" in DOM module ()`
    );
  }
  return newAttrs;
};

const addMissingImports = html => {
  if (!!linkPolymerElement) {
    if (needsDomIfImport) {
      html =
        linkPolymerElement.replace(
          "/polymer-element.html",
          "/lib/elements/dom-if.html"
        ) +
        "\n" +
        html;
    }
    if (needsDomRepeatImport) {
      html =
        linkPolymerElement.replace(
          "/polymer-element.html",
          "/lib/elements/dom-repeat.html"
        ) +
        "\n" +
        html;
    }
  }
  return html;
};

const traverseItem = node => {
  let newNode = lodash.cloneDeep(node);
  newNode = upgradeNode(newNode);
  newNode.children = !!newNode.children
    ? newNode.children.map(traverseItem)
    : null;
  return newNode;
};

const initializeMigration = () => {
  needsDomIfImport = false;
  needsDomRepeatImport = false;
  linkPolymerElement = null;
};

module.exports = {
  migrate: html => {
    initializeMigration();
    return lodash.compose(
      pretty,
      addMissingImports,
      tree2html,
      traverseItem,
      html2tree
    )(html);
  },
  migrateHtml: html => {},
  migrateCss: cssMigrator.migrate,
  migrateJs: jsMigrator.migrate
};
