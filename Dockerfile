  
FROM node:12
RUN mkdir -p /home/node/charticulator/node_modules && chown -R node:node /home/node/charticulator
WORKDIR /home/node/charticulator
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apt-get update \
    && apt-get install -y wget gnupg xvfb \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 4000
VOLUME ["./src/tests/karma/Chrome"]
VOLUME ["./src/tests/karma/ChromeHeadless"]
RUN mkdir -p ./src/tests/unit/charts
COPY --chown=node:node ./src/tests/unit/charts ./src/tests/unit/charts
COPY --chown=node:node ./src/tests/karma/Chrome ./src/tests/karma/Chrome
COPY --chown=node:node ./src/tests/karma/ChromeHeadless ./src/tests/karma/ChromeHeadless
COPY --chown=node:node ./src/tests/karma/* ./src/tests/karma/*
COPY --chown=node:node ./src/app ./src/app
COPY --chown=node:node ./src ./src
COPY --chown=node:node ./dist ./dist
COPY --chown=node:node ./yarn.lock ./yarn.lock
COPY --chown=node:node ./build.js ./build.js
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./karma.conf.ts ./karma.conf.ts
COPY --chown=node:node ./tsconfig.test.json ./tsconfig.test.json
COPY --chown=node:node ./tsconfig.json ./tsconfig.json
COPY --chown=node:node ./webpack.config.test.js ./webpack.config.test.js
RUN yarn install
RUN xvfb-run --auto-servernum yarn unit_test