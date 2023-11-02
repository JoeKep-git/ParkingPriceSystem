FROM node:latest
WORKDIR /app
RUN apt-get update
COPY ../package.json .
RUN npm install -g nodemon
RUN npm install
COPY . .
RUN npm uninstall bcrypt
RUN npm install bcryptjs --save
EXPOSE 8000
CMD ["npm", "run", "dev"]