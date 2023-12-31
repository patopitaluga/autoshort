import 'dotenv/config';
import { AutoShort } from './autoshort.js';
import { CronJob } from 'cron';

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
});

const repeatAction = async () => {
  const stockInfo = await mySession.getStockInfo('YPFD', 'cedears');

  console.log('bids', stockInfo.bids);
  console.log('asks', stockInfo.asks);
};
if (false) {
new CronJob(
  '*/30 * * * * *', // every 30 seconds
  // '*/2 * * * *', // every 2 minutes
  repeatAction,
  null,
  true,
);
}
repeatAction();
