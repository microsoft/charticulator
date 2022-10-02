
[![Build Status](https://travis-ci.org/Microsoft/charticulator.svg?branch=master)](https://travis-ci.org/Microsoft/charticulator)

Charticulator
====

Charticulator is a new charting tool that allows you to design charts by interactively specifying
constraints.

Project Team
----

- [Donghao Ren](https://donghaoren.org/)
- [Bongshin Lee](http://research.microsoft.com/en-us/um/people/bongshin/)
- [Matthew Brehmer](https://www.microsoft.com/en-us/research/people/mabrehme/)
- [Nathan Evans](https://github.com/natoverse)
- [Kate Lytvynets](https://github.com/katua)
- [David Tittsworth](https://github.com/stopyoukid)
- [Chris Trevino](https://github.com/darthtrevino)

Build
----

Follow the following steps to prepare a development environment:

- Install nodejs 8.0+: <https://nodejs.org/>
- Install yarnjs 1.7+: <https://yarnpkg.com/>

Install node modules:

```bash
yarn
```

Copy the template configuration file and edit its contents:

```bash
cp config.template.yml config.yml
# (on windows, use copy instead of cp)
```

Run the following command to build Charticulator, which will create a self contained bundle in the `dist` folder:

```bash
yarn build
```

Run a local web server to test Charticulator:

```bash
# Serve Charticulator at http://localhost:4000
yarn server

# Serve Charticulator publicly at http://0.0.0.0:4000
# Use this if you want to enable access from another computer
yarn public_server
```

Development
----

For a live development environment, keep the following command running:

```bash
yarn start
```

This command watches for any change in `src/` and `sass/`, and recompiles Charticulator automatically.
Once this up, open <http://localhost:4000/>
to launch Charticulator. Now when you change the source code, the app can be updated by simply
refreshing the browser page (you may need to disable browser cache).

In development mode, there is a test application for UI components, which can be accessed at <http://localhost:4000/test.html>.

The watch mode won't update when you change the following:

- config.yml
- THIRD_PARTY.yml
- webpack.config.js

When you update these, please do `yarn build` again.

### Sample Datasets
You can add custom sample datasets that can be used with Charticulator.  To do so, create a `datasets` folder at the root of the repository(if it doesn't exist), add your `.csv` (or `.tsv`) to that folder, and finally create a `files.json` file in the folder with the following contents:

```
[
    {
        "name": "<Your dataset display name>",
        "description": "<Your dataset description>",
        "tables": [
            {
                "name": "<Your dataset file name without extension>",
                "type": "<csv || tsv>",
                "url": "<Your dataset file name with extension>"
            }
        ]
    }
]
```

Testing
----

Charticulator currently include a rudimentary test code:

```bash
yarn test
```

More test cases are needed.


# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# Documentation

Run `yarn typedoc` to generate documentation pages.
The page will be available in [`./docs/charticulator`](./docs/charticulator/index.html)

Start point of documentation is index page {@link "index"}