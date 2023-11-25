/**
 * Utility to automate stock operations.
 * @class
 */
export class AutoShort {
  constructor({ username, password, apiUrl, verbose = false }) {
    if (!username) throw new Error('Missing param "username" in AutoShort class instanciation.');
    if (!password) throw new Error('Missing param "password" in AutoShort class instanciation.');
    if (!apiUrl) throw new Error('Missing param "apiUrl" in AutoShort class instanciation.');

    this.username = username;
    this.password = password;
    this.apiUrl = apiUrl;
    this.verbose = verbose;
    this.access_token = '';
    this.id_account = '';
    this.privateLogin();
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
  }

  /**
   *
   * @param {string} stockName -
   * @returns {Promise<object>}
   */
  async getStockInfo(stockName) {
    while (!this.access_token || !this.id_account) {
      await new Promise((resolve) => setTimeout(() => resolve()), 1000);
    }

    if (this.verbose) console.log(`Getting information for: ${stockName}`);
    const stockInfoResult = await fetch(`${this.apiUrl}/api/v1/markets/tickers/${stockName}?segment=C`, {
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
    return stockInfoResult[0];
  }
}
