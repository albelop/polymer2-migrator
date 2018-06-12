var chai = require("chai");
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
var expect = chai.expect;
chai.use(sinonChai);
const esprima = require("esprima").parseScript;
const jsMigrator = require("../src/js-migrator.js");
const logger = require("../src/logger.js");

const wrapInScript = fragment => `Polymer(${fragment})`;

suite("Javascript", function () {
  let loggerSpy;

  teardown(function () {
    if (!!loggerSpy) loggerSpy.restore();
  });

  test("Converts to class form", function () {
    loggerSpy = sinon.spy(logger, "verbose");
    const polymerConfig = `{ is: "my-class-name" }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
    expect(loggerSpy).called;
    expect(loggerSpy).calledWith('- Converted component "my-class-name" to class component "MyClassName"');
  });
  test("Adds properties as static getter", function () {
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
  test("Adds observers as static getter", function () {
    const polymerConfig = `{
      is: "my-class-name",
      observers:[
        'callback1(prop1)',
        'callback2(prop2,prop3)'
      ]
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            static get observers(){return [
                              'callback1(prop1)',
                              'callback2(prop2,prop3)'
                            ]}
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });
  test("Set behaviors as mixins", function () {
    const polymerConfig = `{ 
      is: "my-class-name",
      behaviors:[Behavior1, Behavior2]
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.mixinBehaviors([Behavior1, Behavior2], Polymer.Element) {
                            static get is() {return 'my-class-name';}
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });

  test("Set listeners in ready function", function () {
    const polymerConfig = `{ 
      is: "my-class-name",
      listeners:{
        'event1':'callback1',
        'target.event2':'callback2'
      }
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            ready(){
                              this.addEventListener('event1',this.callback1.bind(this));
                              this.$.target.addEventListener('event2',this.callback2.bind(this));
                              super.ready();
                            }
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });

  test("Add ready initialization ", function () {
    const polymerConfig = `{ 
      is: "my-class-name",
      listeners:{
        'event1':'callback1'
      },
      ready:function(){doSomething();}
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            ready(){
                              this.addEventListener('event1',this.callback1.bind(this));
                              super.ready();
                              doSomething();
                            }
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });

  test("Convert .fire to dispatchEvent", function () {
    const polymerConfig = `{ 
      is: "my-class-name",
      myFunc:function(){this.fire('my-event');},
      otherFunc:function(){this.$.element.fire('another-event',data); someOtherFunc();}
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            myFunc(){
                              this.dispatchEvent(new CustomEvent('my-event',{bubbles:true, composed:true}));
                            }
                            otherFunc(){
                              this.$.element.dispatchEvent(new CustomEvent('another-event',{bubbles:true, composed:true, detail:data}));
                              someOtherFunc();
                            }
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });

  test("Convert attached to connectedCallback", function () {
    const polymerConfig = `{ 
      is: "my-class-name",
      attached:function(){doSomething();}
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            connectedCallback(){
                              super.connectedCallback();
                              doSomething();
                            }
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });
  test("Convert detached to disconnectedCallback", function () {
    const polymerConfig = `{ 
      is: "my-class-name",
      detached:function(){doSomething();}
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            disconnectedCallback(){
                              super.disconnectedCallback();
                              doSomething();
                            }
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });

  test("Convert functions to methods", function () {
    const polymerConfig = `{ 
      is: "my-class-name",
      myPublicFunction:function(){doSomething();},
      _myPrivateFunction:function(a,b){doSomethingElse();},
    }`;
    const fragment = wrapInScript(polymerConfig);

    const expected = `class MyClassName extends Polymer.Element {
                            static get is() {return 'my-class-name';}
                            myPublicFunction(){
                              doSomething();
                            }
                            _myPrivateFunction(a,b){
                              doSomethingElse();
                            }
                      }
                      window.customElements.define(MyClassName.is, MyClassName);`;

    expect(esprima(jsMigrator.migrate(fragment))).eql(esprima(expected));
  });
});