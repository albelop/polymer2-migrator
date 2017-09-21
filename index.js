const argv = require('yargs').argv;
const parse5 = require('parse5');
const fs = require('fs');
const lodash = require('lodash/fp');

/* Function definitions */

const inputFile = argv.file;
const isType = (...types) => (e) => types.includes(e.type);
const parseSelector = (selector) => selector.match(/([\w-]+)/g).join('-');

const removeRootCSS = (style) => style.replace(/:root/g, ':host > *');
const fixCssDefaultVal = (style) => style.replace(/var\((.*), *(--.*)\)/g, 'var($1, var($2))');
const fixCssApply = (style) => style.replace(/@apply\((.*?)\)/g, '@apply $1');

const fixCss = (styleNode) => {
	styleNode.data = fixCssApply(fixCssDefaultVal(removeRootCSS(styleNode.data)));
	return styleNode;
}

const callback = (elem) => {
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
		newAttrs.name = parseSelector(attrs.select);
		delete(newAttrs.select);
	}
	return newAttrs;

};

const setDomModuleId = (attrs) => {
	let newAttrs = lodash.cloneDeep(attrs);
	if ('is' in attrs || 'name' in attrs) {
		newAttrs.id = attrs.is || attrs.name;
		delete(newAttrs.is);
		delete(newAttrs.name);
	}
	return newAttrs;
};

const traverseItem = (node) => {
	let newNode = Object.assign({}, callback(node));
	newNode.children = !!newNode.children ? newNode.children.map(traverseItem) : null;

	return newNode
};

/* App */

const file = fs.createWriteStream('./output/' + inputFile);

const src = fs.readFile(inputFile, 'utf8', function(err, html) {
	if (err) {
		// handle error
	} else {
		const tree = parse5.parseFragment(html, {
			treeAdapter: parse5.treeAdapters.htmlparser2
		});

		const modifiedTree = traverseItem(tree);
		const serializer = new parse5.SerializerStream(modifiedTree, {
			treeAdapter: parse5.treeAdapters.htmlparser2
		});

		serializer.pipe(file);
	}
});
