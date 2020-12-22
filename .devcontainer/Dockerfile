# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.148.1/containers/ubuntu/.devcontainer/base.Dockerfile

# [Choice] Ubuntu version: bionic, focal
ARG VARIANT="focal"
FROM mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}

RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
RUN apt-get update

ENV POSTGRES_USER vscode
ENV POSTGRES_PASSWORD ssTGBJHNVlYY
ENV POSTGRES_DB watertower

RUN apt-get -y install postgresql curl

RUN curl -fsSL https://deno.land/x/install/install.sh | sh && mv /root/.deno/bin/deno /bin/deno
#RUN ./go.sh
#USER postgres
#RUN psql < init.sql
