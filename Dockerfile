# Estágio 1: Build da aplicação
FROM node:20-alpine as build
WORKDIR /app

# Copia os arquivos de dependência primeiro (melhora o cache do Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o resto do código
COPY . .

# Faz o build de produção
RUN npm run build

# Estágio 2: Servidor Web Nginx
FROM nginx:alpine
# Copia o build do estágio anterior para a pasta do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx para suportar as rotas do React (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
