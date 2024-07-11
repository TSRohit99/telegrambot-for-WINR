const axios = require('axios');

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';
const CACHE_TTL = 60000; // 1 minute cache
const cache = new Map();

// Rate limiting configuration
const MAX_REQUESTS_PER_MINUTE = 25;
const MINUTE_IN_MS = 60000;
const TOKEN_REFILL_INTERVAL = MINUTE_IN_MS / MAX_REQUESTS_PER_MINUTE;

let tokenBucket = MAX_REQUESTS_PER_MINUTE;
let lastRefillTimestamp = Date.now();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const refillTokenBucket = () => {
  const now = Date.now();
  const timeElapsed = now - lastRefillTimestamp;
  const tokensToAdd = Math.floor(timeElapsed / TOKEN_REFILL_INTERVAL);
  
  if (tokensToAdd > 0) {
    tokenBucket = Math.min(MAX_REQUESTS_PER_MINUTE, tokenBucket + tokensToAdd);
    lastRefillTimestamp = now;
  }
};

const waitForAvailableToken = async () => {
  while (tokenBucket === 0) {
    const timeToWait = TOKEN_REFILL_INTERVAL - (Date.now() - lastRefillTimestamp);
    await sleep(Math.max(0, timeToWait));
    refillTokenBucket();
  }
  tokenBucket--;
};

const getTokenPriceInUSD = async (tokenId) => {
  // Check cache first
  const cachedData = cache.get(tokenId);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return cachedData.data;
  }

  await waitForAvailableToken();

  try {
    const response = await axios.get(COINGECKO_API_URL, {
      params: {
        ids: tokenId,
        vs_currencies: 'usd',
        include_market_cap: 'true',
        include_24hr_vol: 'true'
      }
    });

    const data = response.data[tokenId];
    const result = {
      price: data.usd,
      marketCap: data.usd_market_cap,
      volume24h: data.usd_24h_vol
    };

    // Update cache
    cache.set(tokenId, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error('Error fetching token price:', error.message);
    return null;
  }
};

module.exports = { getTokenPriceInUSD };