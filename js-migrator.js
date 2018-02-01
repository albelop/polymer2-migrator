const esprima = require('esprima');
const escodegen = require('escodegen');
const beautify = require('js-beautify').js_beautify;

const lisp2camel = str => str.replace(/\-([a-z])/g, v => v.toUpperCase()[1])
const getPropertyByKey = elem => key => elem.properties.find(prop => prop.key.name === key);
const getMethods = elem => elem.properties.filter(e => e.value.type === 'FunctionExpression');

module.exports = {
  migrate: function(html) {
    let parsedJS = esprima.parseScript(html);
    if (parsedJS.body && parsedJS.body.length) {
      if (parsedJS.body[0].type == "ExpressionStatement" && parsedJS.body[0].expression.callee.name === 'Polymer') {
        const polymerData = parsedJS.body[0].expression.arguments[0];
        let polymerComponent = {
          name: getPropertyByKey(polymerData)('is').value.value,
          properties: getPropertyByKey(polymerData)('properties').value.properties,
          behaviors: getPropertyByKey(polymerData)('behaviors'),
          observers: getPropertyByKey(polymerData)('observers'),
          listeners: getPropertyByKey(polymerData)('listeners'),
          methods: getMethods(polymerData)
        }

        let code = `class ${lisp2camel(polymerComponent.name)} extends Polymer.Element{`;
        code += `static get is(){return '${polymerComponent.name}'}`;

        code += 'static get properties(){return {';
        let propertiesCode = polymerComponent.properties.map(e => escodegen.generate(e));
        code += propertiesCode.join(',');
        code += '}}';

        let methodsCode = polymerComponent.methods.map(method => `${method.key.name}(${method.value.params.map(param => escodegen.generate(param)).join(',')})${escodegen.generate(method.value.body)}`);
        code += methodsCode.join(' ');

        code += '}';
        code += `window.customElements.define(${lisp2camel(polymerComponent.name)}.is, ${lisp2camel(polymerComponent.name)});`
        return (beautify(code));
      }
    }
  }
}
