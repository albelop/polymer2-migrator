const esprima = require("esprima");
const generateCode = require("escodegen").generate;

const lisp2pascal = str =>
  str.replace(/^([a-z])|\-([a-z0-9])/g, v => v.toUpperCase().replace("-", ""));
const getPropertyByKey = elem => key =>
  elem.properties.find(prop => prop.key.name === key);
const getMethods = elem =>
  elem.properties.filter(e => e.value.type === "FunctionExpression");
const getExtends = behaviors =>
  !!behaviors
    ? `Polymer.mixinBehaviors(${generateCode(
        behaviors.value
      )}, Polymer.Element)`
    : "Polymer.Element";
const method2code = method =>
  `${method.key.name}(${method.value.params
    .map(e => generateCode(e))
    .join(",")})${generateCode(method.value.body)}`;

const listener2code = listener => {
  let isCompound = listener.key.value.split(".").length > 1;
  let target = isCompound
    ? `this.$.${listener.key.value.split(".")[0]}`
    : "this";
  let event = isCompound
    ? listener.key.value.split(".")[1]
    : listener.key.value;
  return `${target}.addEventListener('${event}',this.${
    listener.value.value
  }.bind(this));`;
};

module.exports = {
  migrate: function(html) {
    let parsedJS = esprima.parseScript(html);
    if (parsedJS.body && parsedJS.body.length) {
      if (
        parsedJS.body[0].type == "ExpressionStatement" &&
        parsedJS.body[0].expression.callee.name === "Polymer"
      ) {
        const polymerData = parsedJS.body[0].expression.arguments[0];
        let comp = {
          name: getPropertyByKey(polymerData)("is").value.value,
          className: lisp2pascal(
            getPropertyByKey(polymerData)("is").value.value
          ),
          properties: getPropertyByKey(polymerData)("properties") || {},
          behaviors: getPropertyByKey(polymerData)("behaviors") || [],
          observers: getPropertyByKey(polymerData)("observers") || [],
          listeners: getPropertyByKey(polymerData)("listeners") || {},
          methods: getMethods(polymerData) || []
        };

        return `class ${comp.className} extends ${getExtends(comp.behaviors)}{
          static get is(){return '${comp.name}'}

          static get properties(){
            return ${generateCode(comp.properties.value)}
          }

          static get observers(){
            return ${generateCode(comp.observers.value)}
          }

          ready(){
            ${comp.listeners.value.properties.map(listener2code).join("")}
            super.ready();
          }

          ${comp.methods.map(method2code).join("\n\n")}

        }

        window.customElements.define(${comp.className}.is, ${comp.className});`;
      }
    }
  }
};
//TODO:
// - Check existing lifecycle methods
// - Replace this.fire API
// -
// -
// -
