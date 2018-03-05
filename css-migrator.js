const lodash = require('lodash/fp');

const fixRoot = style => style.replace(/:root/g, ':host > *');
const fixDefaultVal = style => style.replace(/var\((.*), *(--.*)\)/g, 'var($1, var($2))');
const fixApply = style => style.replace(/@apply\((.*?)\)/g, '@apply $1');
const fixSlotted = style => style.replace(/::content *>? *([\s\S]+?) *{/g, '::slotted($1) {');
const isOldShadowStyle = style => (style.includes('::shadow') || style.includes('/deep/'));
const splitRules = style => style.match(/.+?\{.+?\}/gmi);
const trimSpaces = str => str.replace(/\s+\s+/gm, '');
const trimNewLines = str => str.replace(/(\r\n|\n|\r)/gm, "");

const fixShadow = style => {
    let rules = lodash.compose(splitRules, trimSpaces, trimNewLines)(style);
    return !!rules ? rules.filter((e) => !isOldShadowStyle(e)).join('\n') : '';
};

module.exports = {
    migrate: (styleNode) => {
        let newStyleNode = lodash.cloneDeep(styleNode);
        newStyleNode.data = lodash.compose(
            fixShadow,
            fixSlotted,
            fixRoot,
            fixDefaultVal,
            fixApply
        )(newStyleNode.data);
        return newStyleNode;
    }
}
