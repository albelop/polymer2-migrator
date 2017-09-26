const parse5 = require('parse5');
const lodash = require('lodash/fp');
const csstree = require('css-tree');

/* Function definitions */

const isType = (...types) => e => types.includes(e.type);
const parseSelector = selector => selector.match(/([\w-]+)/g).join('-');

const html2tree = html => parse5.parseFragment(html, {
    treeAdapter: parse5.treeAdapters.htmlparser2
});
const tree2html = tree => parse5.serialize(tree, {
    treeAdapter: parse5.treeAdapters.htmlparser2
});

const fixCssRoot = style => style.replace(/:root/g, ':host > *');
const fixCssDefaultVal = style => style.replace(/var\((.*), *(--.*)\)/g, 'var($1, var($2))');
const fixCssApply = style => style.replace(/@apply\((.*?)\)/g, '@apply $1');
const fixCssSlotted = style => style.replace(/::content *>? *([\s\S]+?) *{/g, '::slotted($1) {');
const isOldShadowStyle = styleNode => (styleNode.type === "PseudoElementSelector" && styleNode.name === "shadow") || (styleNode.type === "Combinator" && styleNode.name === "/deep/");


const fixCssShadow = style => {
    let tree = csstree.parse(style);

    let children = tree.children.toArray().filter(
        rule => !rule.prelude.children.some(
            ruleSelector => (
                ruleSelector.children.some(
                    isOldShadowStyle
                )
            )
        )
    );
    tree.children = tree.children.fromArray(children);

    return csstree.translate(tree);
};

const fixCss = (styleNode) => {
    let newStyleNode = lodash.cloneDeep(styleNode);
    newStyleNode.data = lodash.compose(fixCssShadow, fixCssSlotted ,fixCssRoot, fixCssDefaultVal, fixCssApply)(newStyleNode.data);
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
            newElement.children = elem.children.map(fixCss);
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
    newNode.children = !!newNode.children ? newNode.children.map(traverseItem) : null;
    return newNode
};

module.exports = {
    migrate: html => lodash.compose(tree2html, traverseItem, html2tree)(html),
    migrateHtml: html => {},
    migrateCss: html => {},
    migrateJs: html => {}
}
