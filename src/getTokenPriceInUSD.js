const axios = require('axios');

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';

const getTokenPriceInUSD = async (tokenId) => {
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
    return {
      price: data.usd,
      marketCap: data.usd_market_cap,
      volume24h: data.usd_24h_vol
    };
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
};

module.exports = {getTokenPriceInUSD};