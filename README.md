# Autoshort

Utility to automate stock operations.

------

## Setup

1. Clone repository
```
git clone https://github.com/patopitaluga/autoshort.git
```

2. Install dependencies
```
npm install
```

3. Setup env variables using .env.example as template

------

## Usage

```
import { AutoShort } from './autoshort.js';

const mySession = new AutoShort({
  username: 'myemail',
  password: 'mypassword'
  apiUrl: 'the api url',
  verbose: true, // Useful while developing.
});

const stockInfo = await mySession.getStockInfo('YPFD');

console.log('bids', stockInfo.bids);
console.log('asks', stockInfo.asks);
```
