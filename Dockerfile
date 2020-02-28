FROM node:12

COPY . /source
WORKDIR /source

RUN cd /source \
    && npm install -g pm2 \
    && npm install \
    && echo '#!/usr/bin/env sh' >> startup.sh \
    && echo 'pm2 start ecosystem.json' >> startup.sh \
    && echo 'pm2 monit' >> startup.sh \
    && chmod +x startup.sh

ENTRYPOINT [ "/source/startup.sh" ]


