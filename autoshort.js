import * as fs from 'fs';
import * as ws from 'websocket';
const WebSocketClient = ws.default.client;

/**
 * Utility to automate stock operations.
 * @class
 */
export class AutoShort {
  constructor({ username, password, apiUrl, verbose = false, ws }) {
    if (!username) throw new Error('Missing param "username" in AutoShort class instanciation.');
    if (!password) throw new Error('Missing param "password" in AutoShort class instanciation.');
    if (!apiUrl) throw new Error('Missing param "apiUrl" in AutoShort class instanciation.');

    this.username = username;
    this.password = password;
    this.apiUrl = apiUrl;
    this.verbose = verbose;
    this.access_token = '';
    this.id_account = '';
    this.ws = ws;

    //
    this.latestSessions = [];
    try {
      fs.accessSync('session.json', fs.constants.R_OK | fs.constants.W_OK);
      this.latestSessions = JSON.parse(fs.readFileSync('session.json', 'utf8'));
    } catch (err) {
      this.latestSessions = [];
    }
    const thisUserSess = this.latestSessions.find((eachSess) => eachSess.username === username);
    if (thisUserSess) {
      const diffInMs = Math.abs(new Date().getTime() - thisUserSess.timestamp);
      const diffInHours = diffInMs / 1000 / 60 / 60;
      if (diffInHours < 2) {
        console.log('Using stored session');
        this.access_token = thisUserSess.access_token;
        this.id_account = thisUserSess.id_account;
      }
    }

    if (!this.access_token) this.privateLogin();
  }

  /**
   * Private async function used in new AutoShort class instance.
   *
   * @returns {Promise<null>}
   */
  async privateLogin() {
    if (this.verbose) console.log(`Starting login process with credentials: ${this.username}:${'*'.repeat(this.username.length)}`);

    const loginResult = await fetch(`${this.apiUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.username,
        password: this.password,
      }),
    })
      .then(async (rawResult) => {
        if (String(rawResult.status).startsWith('4'))
          throw new Error(`Status: ${rawResult.status} (${rawResult.statusText}): ${JSON.stringify(await rawResult.json())}`);
        if (this.verbose) console.log('Login success: ' + rawResult.status);
        return await rawResult.json();
      });
    this.access_token = loginResult.access_token;

    if (this.verbose) console.log('Getting account information');
    const accountInfoResult = await fetch(`${this.apiUrl}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.access_token}`,
      }
    })
      .then(async (rawResult) => await rawResult.json());
    this.id_account = accountInfoResult.id_accounts[0]
    if (this.verbose) console.log(`Account id: ${this.id_account}`);

    const now = new Date();
    this.latestSessions.push({
      username: this.username,
      access_token: this.access_token,
      id_account: this.id_account,
      date: this.formatDate(now),
      timestamp: now.getTime(),
    });
    fs.writeFileSync('session.json', JSON.stringify(this.latestSessions, null, 2));
  }

  formatDate(date) {
    return (
      [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-') +
      ' ' +
      [
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0'),
        String(date.getSeconds()).padStart(2, '0'),
      ].join(':')
    );
  };

  /**
   *
   * @param {string} stockName -
   * @returns {Promise<object>}
   */
  async getStockInfo(stockName, type = '') {
    while (!this.access_token || !this.id_account) {
      await new Promise((resolve) => setTimeout(() => resolve()), 1000);
    }

    if (this.verbose) console.log(`Getting information for: ${stockName}`);
    let endpoint = '';
    switch (type) {
      case 'cedears':
        endpoint = `/api/v1/markets/ticker/${stockName}-0003-C-CT-ARS`;
        break;
      default:
        endpoint = `/api/v1/markets/tickers/${stockName}?segment=C`;
    }
    const stockFetchResult = await fetch(`${this.apiUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.access_token}`,
        'X-Account-Id': this.id_account,
      }
    })
      .then(async (rawResult) => await rawResult.json());
    /**
     * Response example:
     * {
     *   short_ticker: 'BNA6D',
     *   long_ticker: 'BNA6D-0001-C-CT-USD',
     *   instrument_code: 'BNA26',
     *   instrument_name: 'LETRAS NEUQUEN USD 2026',
     *   instrument_short_name: 'LETRAS NEUQUEN USD 2026',
     *   instrument_type: 'BONOS_PUBLICOS',
     *   instrument_subtype: 'PROVINCIALES',
     *   logo_file_name: 'neuquen.jpg',
     *   id_venue: 'BYMA',
     *   id_session: 'CT',
     *   id_segment: 'C',
     *   settlement_days: 0,
     *   currency: 'USD',
     *   price_factor: 100,
     *   contract_size: 1,
     *   min_lot_size: 1,
     *   id_security: 98299301,
     *   tick_size: 0.01,
     *   date: '2023-11-24',
     *   open: 102,
     *   high: 102,
     *   low: 102,
     *   close: 102,
     *   prev_close: 102,
     *   last: 102,
     *   bid: null,
     *   ask: null,
     *   bids: [
     *     { size: 0, price: 0 }
     *   ],
     *   asks: [
     *     { size: 0, price: 0 }
     *   ],
     *   turnover: 11.22,
     *   volume: 11,
     *   variation: 0,
     *   term: 'CI',
     *   id_tick_size_rule: 'BYMA_FIXED_INCOME',
     *   is_favorite: false
     * }
     */

    let theStockData = (Array.isArray(stockFetchResult)) ? stockFetchResult[0] : stockFetchResult;

    // Just in case they change the order
    theStockData.bids.sort((a, b) => (a.price > b.price) ? 1 : -1);
    theStockData.asks.sort((a, b) => (a.price > b.price) ? 1 : -1);
    return theStockData;
  }

  /**
   *
   *
   * Request headers:
   * Accept-Encoding: gzip, deflate, br
   * Accept-Language: es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7,es-419;q=0.6,de;q=0.5
   * Cache-Control: no-cache
   * Connection: Upgrade
   * Host: ***
   * Origin: ***
   * Pragma: no-cache
   * Sec-Websocket-Extensions: permessage-deflate; client_max_window_bits
   * Sec-Websocket-Key: 5HPDX2TsRTxebYYNps44ow==
   * Sec-Websocket-Version: 13
   * Upgrade: websocket
   * User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36
   * --------------------
   * Response headers:
   * Connection: upgrade
   * Date: Wed, 29 Nov 2023 18:14:36 GMT
   * Sec-Websocket-Accept: PdYfM9km2C9QozXxWbKK/2/sY5A=
   * Sec-Websocket-Extensions: permessage-deflate
   * Strict-Transport-Security: max-age=15724800; includeSubDomains
   * Upgrade: websocket
   */
  listenWs() {
    const myWsClient = new WebSocketClient();

    myWsClient.on('connectFailed', function(error) {
      console.log('Connect Error: ' + error.toString());
    });

    myWsClient.on('connect', function(connection) {
      console.log('WebSocket Client Connected');
      connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
      });
      connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
      });
      connection.on('message', function(message) {
        if (message.type === 'utf8') {
          console.log("Received: '" + message.utf8Data + "'");
        }
      });
    });

    myWsClient.connect(this.ws);
  }
}
