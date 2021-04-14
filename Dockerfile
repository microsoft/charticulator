FROM node:12
RUN mkdir -p /home/node/charticulator/node_modules && chown -R node:node /home/node/charticulator
WORKDIR /home/node/charticulator
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apt-get update \
    && apt-get install -y wget gnupg xvfb \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 4000
VOLUME ["./src/tests/unit/images"]
RUN mkdir -p ./src/tests/unit/charts
COPY --chown=node:node ./src/tests/unit/charts ./src/tests/unit/charts
COPY --chown=node:node ./src/tests/unit/images ./src/tests/unit/images
COPY --chown=node:node ./dist ./dist
COPY --chown=node:node ./yarn.lock ./yarn.lock
COPY --chown=node:node ./build.js ./build.js
COPY --chown=node:node ./package.json ./package.json
RUN yarn install
RUN xvfb-run --auto-servernum yarn test_docker