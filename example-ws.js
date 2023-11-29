import 'dotenv/config';
import { AutoShort } from './autoshort.js';

['USERNAME', 'PASSWORD', 'API_URL'].forEach((e) => {
  if (!process.env[e]) {
    console.error(`Missing "${e}" env variable.`);
    process.exit(1);
  }
});
if (process.env.API_URL.slice(-1) === '/') process.env.API_URL = process.env.API_URL.substr(0, process.env.API_URL.length - 1);

const mySession = new AutoShort({
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  apiUrl: process.env.API_URL,
  verbose: true, // Useful while developing.
  ws: process.env.WEBSOCKET,
});

mySession.listenWs();

