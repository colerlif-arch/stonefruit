FROM node:20.20.0-alpine

WORKDIR /opt/app
RUN chown -R node:node /opt/app
COPY --chown=node:node package*.json /opt/app/

USER node
RUN npm install

COPY --chown=node:node index.js ./
COPY --chown=node:node sqlite_persist.js ./

EXPOSE 8000
ENTRYPOINT ["node"]
CMD ["index.js"]
