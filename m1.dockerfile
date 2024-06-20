# modified based on https://github.com/metabase/metabase/blob/master/Dockerfile
# to support arm64
FROM --platform=linux/amd64 9000hal/metabase:dev as builder

FROM --platform=linux/arm64 eclipse-temurin:11-jre as runner

ENV FC_LANG=en-US LC_CTYPE=en_US.UTF-8

# dependencies
RUN apt-get update -yq && apt-get install -yq bash fontconfig curl fonts-noto fonts-noto-cjk ca-certificates-java && \
    apt-get clean && \
    rm -rf /var/lib/{apt,dpkg,cache,log}/ && \
    mkdir -p /app/certs && \
    curl https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/certs/rds-combined-ca-bundle.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias aws-rds -file /app/certs/rds-combined-ca-bundle.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    curl https://cacerts.digicert.com/DigiCertGlobalRootG2.crt.pem -o /app/certs/DigiCertGlobalRootG2.crt.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias azure-cert -file /app/certs/DigiCertGlobalRootG2.crt.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    mkdir -p /plugins && chmod a+rwx /plugins


# copy from official metabase image
COPY --from=builder /app /app

# expose our default runtime port
EXPOSE 3000

# run it
ENTRYPOINT ["/app/run_metabase.sh"]