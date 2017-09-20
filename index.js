const argv = require('yargs').argv;
const parse5 = require('parse5');
const fs = require('fs');

const inputFile = argv.file;

const isType = (...types)=>(e)=>types.includes(e.type);

const parseSelector = (selector) => selector.match(/([\w-]+)/g).join('-');

const removeRootCSS = (style) => style.replace(/ *:root([\s\S]*?)}/gm,'');

const callback = (e)=> {
    switch (e.name) {
        case 'dom-module':
            e.attribs = setDomModuleId(e.attribs);
            break;
        case 'content':
            e.name = 'slot';
            e.attribs = setSlot(e.attribs);
            break;
        case 'style':
            e.children.forEach((styleNode)=>{styleNode.data=removeRootCSS(styleNode.data)});
    }
};

const setSlot = (attrs) => {
    let newAttrs = Object.assign(attrs);
    if ('select' in attrs) {
        newAttrs.name = parseSelector(attrs.select);
        delete (newAttrs.select);
    }
    return newAttrs;

};

const setDomModuleId = (attrs)=> {
    let newAttrs = Object.assign(attrs);
    if ('is' in attrs || 'name' in attrs) {
        newAttrs.id = attrs.is || attrs.name;
        delete (newAttrs.is);
        delete (newAttrs.name);
    }
    return newAttrs;
};

const traverseItem = (node)=> {
    callback(node);

    if (!!node.children) {
        node.children
            .forEach(traverseItem);
    }
};

const file = fs.createWriteStream('./build/' + inputFile);

const src = fs.readFile(inputFile, 'utf8', function (err, html) {
    if (err) {
        // handle error
    } else {
        const tree = parse5.parseFragment(html, {treeAdapter: parse5.treeAdapters.htmlparser2});
        traverseItem(tree);
        const serializer = new parse5.SerializerStream(tree, {treeAdapter: parse5.treeAdapters.htmlparser2});

        serializer.pipe(file);
    }
});
