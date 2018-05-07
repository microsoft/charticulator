Charticulator
====

Charticulator is a new charting tool that allows you to design charts by interactively specifying
constraints.

Project Team
----

- [Donghao Ren](https://donghaoren.org/)
- [Bongshin Lee](http://research.microsoft.com/en-us/um/people/bongshin/)
- [Matthew Brehmer](https://www.microsoft.com/en-us/research/people/mabrehme/)

Build
----

Follow the following steps to prepare a development environment:

- Install nodejs 8.0+: <https://nodejs.org/>
- Install Ruby 2.5+: <https://www.ruby-lang.org/>
- Install Ruby's sass package: `gem install sass`

Install node modules:

```bash
npm install
```

Copy the template configuration file and edit its contents:

```bash
cp config.template.yml config.yml
# (on windows, use copy instead of cp)
```

Run the following command to build Charticulator:

```bash
npm run build
```

Run a local web server to test Charticulator:

```bash
# Serve Charticulator at http://localhost:4000
npm run server

# Serve Charticulator publicly at http://0.0.0.0:4000
# Use this if you want to enable access from another computer
npm run public_server
```

Development
----

For a live development environment, keep the following command running:

```bash
npm run watch
```

This command watches for any change in `src/` and `sass/`, and recompiles Charticulator automatically.
Once this up, open <http://localhost:4000/charticulator.html> or <http://localhost:4000/charticulator-dev.html> (for development)
to launch Charticulator. Now when you change the source code, the app can be updated by simply
refreshing the browser page (you may need to disable browser cache).

The watch mode won't update when you change the following:

- config.yml
- THIRD_PARTY.yml
- webpack.config.js

When you update these, please do `npm run build` again.

Testing
----

Charticulator currently include a rudimentary test code:

```bash
npm run test
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
