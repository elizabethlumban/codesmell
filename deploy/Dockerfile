FROM node:11.10.1


LABEL com.service.name=leap
LABEL com.service.component=operators
LABEL com.service.version=1
LABEL com.service.component.version=1

ENV LANG=en_US.UTF-8 HOME=/home/app NODE_ENV=production

COPY package.json package-lock.json $HOME/
RUN cd $HOME && npm ci --production && rm -f $HOME/.npmrc

WORKDIR $HOME
COPY server $HOME/server

CMD [ "npm", "start" ]