const parse5 = require('parse5');
const lodash = require('lodash/fp');

/* Function definitions */

const isType = (...types) => e => types.includes(e.type);
const parseSelector = selector => selector.match(/([\w-]+)/g).join('-');

const fixCssRoot = style => style.replace(/:root/g, ':host > *');
const fixCssDefaultVal = style => style.replace(/var\((.*), *(--.*)\)/g, 'var($1, var($2))');
const fixCssApply = style => style.replace(/@apply\((.*?)\)/g, '@apply $1');

const fixCss = (styleNode) => {
	let newStyleNode = lodash.cloneDeep(styleNode);
	newStyleNode.data = lodash.compose(fixCssRoot, fixCssDefaultVal, fixCssApply)(newStyleNode.data);
	return newStyleNode;
}

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
	migrate: html => {
		const tree = parse5.parseFragment(html, {
			treeAdapter: parse5.treeAdapters.htmlparser2
		});
		const modifiedTree = traverseItem(tree);
		return parse5.serialize(modifiedTree, {
			treeAdapter: parse5.treeAdapters.htmlparser2
		});
	}
}
