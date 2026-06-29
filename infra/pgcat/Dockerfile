# Wrapper fino sobre a imagem oficial do pgcat (https://github.com/postgresml/pgcat) — não
# recompilamos o binário Rust, só adicionamos nosso template de config e o script de boot que
# resolve as env vars. Trocar ":latest" por uma tag de versão fixa quando confirmar uma
# disponível em https://github.com/postgresml/pgcat/pkgs/container/pgcat.
FROM ghcr.io/postgresml/pgcat:latest

COPY pgcat.toml.template /etc/pgcat/pgcat.toml.template
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 6432 9930
ENTRYPOINT ["/usr/local/bin/start.sh"]
