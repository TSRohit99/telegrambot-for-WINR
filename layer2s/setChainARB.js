const { Web3 } = require("web3");

const RPC_URL = "https://arb1.arbitrum.io/rpc";

const web3 = new Web3(RPC_URL);

// const routerContract = new web3.eth.Contract(routerAbi, routerAddress);
// // routerContract.methods.factory().call().then((data)=>{console.log(data)})

module.exports = { web3 };


