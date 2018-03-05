const esprima = require('esprima');
const escodegen = require('escodegen');
const beautify = require('js-beautify').js_beautify;

const lisp2camel = str => str.replace(/\-([a-z])/g, v => v.toUpperCase()[1])
const getPropertyByKey = elem => key => elem.properties.find(prop => prop.key.name === key);
const getMethods = elem => elem.properties.filter(e => e.value.type === 'FunctionExpression');

const method2code = method => `${method.key.name}(${method.value.params.map(param => escodegen.generate(param)).join(',')})${escodegen.generate(method.value.body)}`;
// const listener2code = listener => `this.addEventListener('${listener.key.value}',this.${listener.value.value}.bind(this));`;
const listener2code = listener => {
  let isCompound = listener.key.value.split('.').length > 1;
  let target = isCompound ? `this.$.${listener.key.value.split('.')[0]}` : 'this';
  let event = isCompound ? listener.key.value.split('.')[1] : listener.key.value;
  return `${target}.addEventListener('${event}',this.${listener.value.value}.bind(this));`
};

module.exports = {
  migrate: function (html) {
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

        let extend = !!polymerComponent.behaviors ? `Polymer.mixinBehaviors(${escodegen.generate(polymerComponent.behaviors.value)}, Polymer.Element)` : 'Polymer.Element';
        let code = `class ${lisp2camel(polymerComponent.name)} extends ${extend}{`;
        code += `static get is(){return '${polymerComponent.name}'}`;

        code += 'static get properties(){return {';
        let propertiesCode = polymerComponent.properties.map(e => escodegen.generate(e));
        code += propertiesCode.join(',');
        code += '}}';

        code += `static get observers(){return ${escodegen.generate(polymerComponent.observers.value)} }`;

        //Ready function. Add listeners

        code += 'ready(){';
        code += polymerComponent.listeners.value.properties.map(listener2code).join('');
        code += 'super.ready();}';


        let methodsCode = polymerComponent.methods.map(method2code);
        code += methodsCode.join(' ');

        code += '}'; //Close class 

        code += `window.customElements.define(${lisp2camel(polymerComponent.name)}.is, ${lisp2camel(polymerComponent.name)});`
        return (beautify(code));
      }
    }
  }
}
