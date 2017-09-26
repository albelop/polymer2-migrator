# polymer2-migrator
**:warning: Important: this project is still a WIP and highly experimental.**

Migrates a Polymer 1.x component to hybrid and/or Polymer 2.x component.

### DOM template
- :white_check_mark: Remove deprecated patterns in the DOM module: `<dom-module>` using `is` or `name`.
- :white_circle: Remove deprecated patterns in the DOM module:  styles outside of the template.
- :white_check_mark: Update your element's DOM template to use the new `<slot>` element instead of `<content>`.
- :white_circle: Update any URLs inside the template.

[Source](https://www.polymer-project.org/2.0/docs/upgrade#dom-template)

### Shadow DOM styles

- :white_circle: Replace `::content` selectors with `::slotted()` selectors.
- :white_check_mark: Remove `/deep/` and `::shadow` selectors, if you're still using them.
- :white_check_mark: Remove `:root` selectors.
- :white_check_mark: Update custom property syntax.
- :white_circle: Wrap `custom-style` elements.

[Source](https://www.polymer-project.org/2.0/docs/upgrade#shadow-dom-styles)

### DOM APIs

Work in progress
