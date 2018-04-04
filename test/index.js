const expect = require("expect.js");
const esprima = require("esprima").parseScript;
const jsMigrator = require("../src/js-migrator.js");

const wrapInScript = fragment => `Polymer(${(fragment)})`;

suite("Javascript", function() {
  test("Converts to class form", function() {
    const polymerConfig = `{ is: "my-class-name" }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });
  test("Adds properties as static getter", function() {
    const polymerConfig = `{
      is: "my-class-name",
      properties:{
        prop1:String,
        prop2:Boolean
      }
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            static get properties(){return {
                              prop1:String,
                              prop2:Boolean
                            }}
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });
});
