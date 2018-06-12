const esprima = require("esprima");
const walk = require("esprima-walk").walkAddParent;
const lodash = require("lodash/fp");
const logger = require("./logger.js");
const generateCode = ast =>
  require("escodegen").generate(ast, { format: { compact: true } });

const lisp2pascal = str =>
  str.replace(/^([a-z])|\-([a-z0-9])/g, v => v.toUpperCase().replace("-", ""));

const getPropertyByKey = elem => key =>
  elem.properties.find(prop => prop.key.name === key);

const getMethods = elem =>
  elem.properties.filter(e => e.value.type === "FunctionExpression");

const getExtends = behaviors =>
  !!behaviors.value
    ? `Polymer.mixinBehaviors(${generateCode(
        behaviors.value
      )}, Polymer.Element)`
    : "Polymer.Element";

const getParsedBody = elem =>
  elem && elem.value && elem.value.body && elem.value.body.body
    ? elem.value.body.body
    : null;

const method2code = method =>
  `${method.key.name}(${method.value.params
    .map(e => generateCode(e))
    .join(",")})${generateCode(method.value.body)}`;

const isReadyMethod = method =>
  !!method.key && method.key.name && method.key.name === "ready";

const upgradeMethods = elem => {
  if (elem.key.name === "attached") {
    elem.key.name = "connectedCallback";

    elem.value.body.body.unshift(
      esprima.parseModule("replaceWithSuper.connectedCallback();")
    );
    logger.verbose('- Replaced "attached" method with "connectedCallback"');
  }
  if (elem.key.name === "detached") {
    elem.key.name = "disconnectedCallback";
    elem.value.body.body.unshift(
      esprima.parseModule("replaceWithSuper.disconnectedCallback();")
    );
    logger.verbose('- Replaced "detached" method with "disconnectedCallback"');
  }
  return elem;
};

const replaceSuper = str => str.replace(/replaceWithSuper/g, "super");

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

const replaceFire = e =>
  e.replace(/\.fire\((.*?)(?:,(.*?))?\)/g, (match, name, data) => {
    logger.verbose('- Replaced "fire" API with "dispatchEvent".');
    return data
      ? `.dispatchEvent(new CustomEvent(${name},{bubbles:true,composed:true,detail:${data}}))`
      : `.dispatchEvent(new CustomEvent(${name},{bubbles:true,composed:true}))`;
  });

module.exports = {
  migrate: function(html) {
    let parsedJS = esprima.parseScript(html);
    walk(parsedJS, function(node) {
      if (
        node.type == "ExpressionStatement" &&
        node.expression &&
        node.expression.callee &&
        node.expression.callee.name === "Polymer"
      ) {
        let polymerParentNode = node.parent;
        let polymerIndex = polymerParentNode.body.indexOf(node);
        //TODO: run migrator. convert string to ast node. assign migrated node to current node
        const polymerData = node.expression.arguments[0];
        let comp = {
          name: getPropertyByKey(polymerData)("is").value.value,
          className: lisp2pascal(
            getPropertyByKey(polymerData)("is").value.value
          ),
          properties: getPropertyByKey(polymerData)("properties") || {},
          behaviors: getPropertyByKey(polymerData)("behaviors") || [],
          observers: getPropertyByKey(polymerData)("observers") || [],
          listeners: getPropertyByKey(polymerData)("listeners") || {},
          methods: getMethods(polymerData).map(upgradeMethods)
        };

        let result;
        result = `class ${comp.className} extends ${getExtends(comp.behaviors)}{
                    static get is(){return '${comp.name}'}`;

        if (!!comp.properties.value) {
          result += `static get properties(){
                      return ${generateCode(comp.properties.value)}
                    }`;
        }

        if (!!comp.observers.value) {
          result += `static get observers(){
                      return ${generateCode(comp.observers.value)}
                    }`;
        }

        if (!!comp.listeners.value) {
          result += `ready(){
                          ${comp.listeners.value.properties
                            .map(listener2code)
                            .join("")}
                          super.ready();`;

          if (!!comp.methods && !!comp.methods.length) {
            let readyFn = comp.methods.find(isReadyMethod);

            let body = getParsedBody(readyFn);
            if (body) {
              result += generateCode(body[0]);
              logger.verbose(
                '- Appended former "ready" function after new "super.ready()".'
              );
            }
          }
          result += `}`;
        }

        result += `${comp.methods
          .filter(e => !isReadyMethod(e))
          .map(method2code)
          .map(replaceFire)
          .map(replaceSuper)
          .join("\n\n")}`;

        result += `} window.customElements.define(${comp.className}.is, ${
          comp.className
        });`;

        logger.verbose(
          `- Converted component "${comp.name}" to class component "${
            comp.className
          }"`
        );
        parsedResult = esprima.parseScript(result);
        polymerParentNode.body[polymerIndex] = parsedResult;
      }
    });
    return generateCode(parsedJS);
  }
};