FROM docker.io/bitnami/moodle:latest

WORKDIR /opt/bitnami
USER root
RUN apt-get -y update && apt-get install -y git
RUN git clone https://github.com/moodlehq/moodleapp.git --depth=1

WORKDIR /