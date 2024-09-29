const Web3 = require('web3');
require('dotenv').config();

const HDWalletProvider = require('@truffle/hdwallet-provider');

const infuraKey = process.env.INFURA_PROJECT_ID;
const privateKey = process.env.PRIVATE_KEY; // Use a mnemonic phrase or a single private key

module.exports = {
  networks: {
    ganache: {
      host: "127.0.0.1",
      port: 7545, // Ganache default port
      network_id: "*", // Any network (default: *),
    },
    linea: {
      provider: () => new HDWalletProvider(
        privateKey,
        `https://linea.infura.io/v3/${infuraKey}`
      ),
      network_id: 59140, // Use Linea's network ID
      gas: 8000000, // Adjust gas limit if needed
      gasPrice: 20000000000, // Adjust gas price if needed
    },
  },
  compilers: {
    solc: {
      version: "0.8.17" // Specify the version of Solidity
    }
  }
};
