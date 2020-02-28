FROM alpine:3.4
# https://github.com/mengskysama/p2pspider
# Set timezone
ARG TIMEZONE
RUN ln -snf /usr/share/zoneinfo/${TIMEZONE} /etc/localtime && echo ${TIMEZONE} > /etc/timezone \
	&& "date" \
    && sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/' /etc/apk/repositories

COPY p2pspider-linux-amd64-1.0 /spider/
COPY start_spiding /spider/

EXPOSE 6884/udp

CMD ["/spider/start_spiding.sh"]

