FROM ubuntu:bionic

ENV DEBIAN_FRONTEND=noninteractive
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y install wget curl gnupg2 unzip

#RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt bionic-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN apt-get update


ENV POSTGRES_USER vscode
ENV POSTGRES_DB watertower
ARG POSTGRES_PASSWORD
#####ENV POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ENV POSTGRES_PASSWORD=ssTGBJHNVlYY

#RUN openssl rand -base64 14 >> pw 
##RUN echo -n "export SET POSTGRES_PASSWORD=" > pw-env
#RUN echo -n "POSTGRES_PASSWORD=" > pw-env
#RUN cat pw >> pw-env
#RUN chmod +x pw-env
#RUN ./pw-env
#RUN cat pw-env >> /etc/environment
#RUN echo 'env is....'

#RUN cat /etc/environment
#RUN /bin/bash -c "source /etc/environment"

RUN printenv | grep POST
RUN echo $POSTGRES_PASSWORD
RUN echo "env shown"    

RUN apt-get -y install postgresql-13 postgresql nodejs npm

COPY .watertower.json .
COPY ./scripts/init.sql .
RUN sed -i "s/ssTGBJHNVlYY/$POSTGRES_PASSWORD/" init.sql
RUN sed -i "s/ssTGBJHNVlYY/$POSTGRES_PASSWORD/" .watertower.json
COPY ./scripts/pg-go.sh .
RUN ./pg-go.sh

COPY package.json .
COPY ./src/main.js .
RUN npm i

COPY /src/main.js .
COPY /public public
COPY ./scripts/go-node.sh .
CMD ./go-node.sh