const parse5 = require('parse5');
const lodash = require('lodash/fp');
const csstree = require('css-tree');

/* Function definitions */

const isType = (...types) => e => types.includes(e.type);
const parseSelector = selector => selector.match(/([\w-]+)/g).join('-');

const fixCssRoot = style => style.replace(/:root/g, ':host > *');
const fixCssDefaultVal = style => style.replace(/var\((.*), *(--.*)\)/g, 'var($1, var($2))');
const fixCssApply = style => style.replace(/@apply\((.*?)\)/g, '@apply $1');
const fixCssShadow = style => {
	let tree = csstree.parse(style)
	let removableRules = [];
	csstree.walk(tree, function(node, item, list) {
		if ((node.type == "PseudoElementSelector" && node.name == "shadow") | (node.type == "Combinator" && node.name == "/deep/")) {
			removableRules.push(this.rule);
		}
	});
	let tree2 = csstree.toPlainObject(csstree.clone(tree));

	// console.log(removableRules)
	tree2.children = tree2.children.map((e)=>e==removableRules[0])
	console.log(tree2.children)
	// let parsed = csstree.parse(style);
// console.log(JSON.stringify(tree,null,2));
	// console.log(csstree.translate(tree));
	// parsed.cssRules = parsed.cssRules.filter((e)=>!(e.selectorText.includes('/deep/')|e.selectorText.includes('::shadow')));
	return csstree.translate(tree);


};

const fixCss = (styleNode) => {
	let newStyleNode = lodash.cloneDeep(styleNode);
	newStyleNode.data = lodash.compose(fixCssRoot, fixCssDefaultVal, fixCssApply, fixCssShadow)(newStyleNode.data);
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
