const parse5 = require('parse5');
const lodash = require('lodash/fp');
const csstree = require('css-tree');
const acorn = require('acorn');
const walk = require('acorn/dist/walk');
const esprima = require('esprima');
const escodegen = require('escodegen');

/* Function definitions */

const isType = (...types) => e => types.includes(e.type);
const parseSelector = selector => selector.match(/([\w-]+)/g).join('-');

const html2tree = html => parse5.parseFragment(html, {treeAdapter: parse5.treeAdapters.htmlparser2});
const tree2html = tree => parse5.serialize(tree, {treeAdapter: parse5.treeAdapters.htmlparser2});

const lisp2camel = str => str.replace(/\-([a-z])/g, v => v.toUpperCase()[1])
const getParentTemplate = e => !!e.parent && ((e.parent.name === 'template')
  ? e.parent
  : getParentTemplate(e.parent));

const fixCssRoot = style => style.replace(/:root/g, ':host > *');
const fixCssDefaultVal = style => style.replace(/var\((.*), *(--.*)\)/g, 'var($1, var($2))');
const fixCssApply = style => style.replace(/@apply\((.*?)\)/g, '@apply $1');
const fixCssSlotted = style => style.replace(/::content *>? *([\s\S]+?) *{/g, '::slotted($1) {');
const isOldShadowStyle = styleNode => (styleNode.type === "PseudoElementSelector" && styleNode.name === "shadow") || (styleNode.type === "Combinator" && styleNode.name === "/deep/");

const fixCssShadow = style => {
  let tree = csstree.parse(style);

  let children = tree.children.toArray().filter(rule => !rule.prelude.children.some(ruleSelector => (ruleSelector.children.some(isOldShadowStyle))));
  tree.children = tree.children.fromArray(children);

  return csstree.translate(tree);
};

const fixCss = (styleNode) => {
  let newStyleNode = lodash.cloneDeep(styleNode);
  newStyleNode.data = lodash.compose(fixCssShadow, fixCssSlotted, fixCssRoot, fixCssDefaultVal, fixCssApply)(newStyleNode.data);
  return newStyleNode;
};

const upgradeNode = (elem) => {
  let newElement = lodash.cloneDeep(elem);
  switch (elem.name) {
    case 'dom-module':
      newElement.attribs = setDomModuleId(elem.attribs);
      break;
    case 'content':
      newElement.name = 'slot';
      newElement.attribs = setSlot(elem.attribs);
      break;
    case 'style':
      if (!getParentTemplate(elem)) {
        console.log('You need to define the style in the dom-module template')
      }
      newElement.children = elem.children.map(fixCss);
      break;
    case 'script':
      let script = newElement.children[0].data;

      let parsedJS = esprima.parseScript(newElement.children[0].data);
      if (parsedJS.body && parsedJS.body.length) {
        if (parsedJS.body[0].type == "ExpressionStatement" && parsedJS.body[0].expression.callee.name === 'Polymer') {
          const polymerData = parsedJS.body[0].expression.arguments[0];

          let componentName = polymerData.properties.find(e => e.key.name === 'is');
          let componentProperties = polymerData.properties.find(e => e.key.name === 'properties');
          let componentBehaviors = polymerData.properties.find(e => e.key.name === 'behaviors');
          let componentObservers = polymerData.properties.find(e => e.key.name === 'observers');
          let componentListeners = polymerData.properties.find(e => e.key.name === 'listeners');
          let componentPublicMethods = polymerData.properties.filter(e => e.value.type === 'FunctionExpression' && !e.key.name.startsWith('_'));
          let componentPrivateMethods = polymerData.properties.filter(e => e.value.type === 'FunctionExpression' && e.key.name.startsWith('_'));

          let code = `class ${lisp2camel(componentName.value.value)} extends Polymer.Element{`;
          code += `static get is(){return '${componentName.value.value}'}`;

          code += 'static get properties(){return {';
          let propertiesCode = componentProperties.value.properties.map(e => escodegen.generate(e));
          code += propertiesCode.join(',');
          code += '}}';

          debugger;

          code += '}';

          console.log(code);
        }
      };
      break;
  }
  return newElement;
};

const setSlot = (attrs) => {
  let newAttrs = lodash.cloneDeep(attrs);
  if ('select' in attrs) {
    newAttrs.name = parseSelector(newAttrs.select);
    delete(newAttrs.select);
  }
  return newAttrs;

};

const setDomModuleId = (attrs) => {
  let newAttrs = lodash.cloneDeep(attrs);
  if ('is' in newAttrs || 'name' in newAttrs) {
    newAttrs.id = attrs.is || newAttrs.name;
    delete(newAttrs.is);
    delete(newAttrs.name);
  }
  return newAttrs;
};

const traverseItem = (node) => {
  let newNode = lodash.cloneDeep(node);
  newNode = upgradeNode(newNode);
  newNode.children = !!newNode.children
    ? newNode.children.map(traverseItem)
    : null;
  return newNode
};

module.exports = {
  migrate: html => lodash.compose(tree2html, traverseItem, html2tree)(html),
  migrateHtml: html => {},
  migrateCss: html => {},
  migrateJs: html => {}
}
