# polymer2-migrator
**:warning: Important: this project is still a WIP and highly experimental.**

Migrates a Polymer 1.x component to Polymer 2.x component (class based).

## Installation

    npm install -g polymer2-migrator

## Usage

To migrate the component in a folder, run the following command in the root folder of the component:

    migrate-component

You can also target a specific folder to migrate.

    migrate-component <component_root_folder>

If the `--analyze` flag is used, the migrator will only analyze the component to check which migrations are possible, and generate a `migrator-analysis` file. It will not make any changes in the component's files.

    migrate-component --analyze

Flag `--logLevel` is available to define the log level of the console output:

    migrate-component --logLevel=verbose

## How does it work?

The polymer2-migrator applies the following changes to upgrade your Polymer 1.x component to Polymer 2.x class-based component:

### DOM template
- :white_check_mark: Remove deprecated patterns in the DOM module: `<dom-module>` using `is` or `name`.
- :white_circle: Remove deprecated patterns in the DOM module:  styles outside of the template.
- :white_check_mark: Update your element's DOM template to use the new `<slot>` element instead of `<content>`.
- :white_circle: Update any URLs inside the template.

[Source](https://www.polymer-project.org/2.0/docs/upgrade#dom-template)

### Shadow DOM styles

- :white_check_mark: Replace `::content` selectors with `::slotted()` selectors.
- :white_check_mark: Remove `/deep/` and `::shadow` selectors, if you're still using them.
- :white_check_mark: Remove `:root` selectors.
- :white_check_mark: Update custom property syntax.
- :white_check_mark: Wrap `custom-style` elements.

[Source](https://www.polymer-project.org/2.0/docs/upgrade#shadow-dom-styles)

### DOM APIs

- :white_check_mark: Convert to class syntax.
- :white_check_mark: Add listeners to ready function.
- :white_check_mark: Behaviors as mixins

[Source](https://www.polymer-project.org/2.0/docs/upgrade#polymer-dom-apis)

### Common utility APIs
- :white_circle: async
- :white_circle: debounce
- :white_circle: fire
- :white_circle: importHref
- :white_circle: $$

[Source](https://www.polymer-project.org/2.0/docs/upgrade#common-utility-apis)

### Additional Features
- Analysis file: Generates a verbose log file showing all the applied changes to each file.
- ...

