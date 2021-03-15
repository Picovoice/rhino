# rhino-web-template

This is a template package for building the rhino-web-* projects. Each language requires a separate NPM package due to the size of the payload included. The code in each package is largely identical. Using this template you can create all of these projects dynamically from the template folder.

## Create porcupine-web-* projects

Use `yarn` then `yarn build` to gather dependencies and generate a project per language from the project template:

```
yarn
yarn build
```

Now each individual project will exist. E.g.:

```
cd rhino-web-en-worker
yarn
yarn build
```