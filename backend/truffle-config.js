const HDWalletProvider = require('@truffle/hdwallet-provider');
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ganache port (default: none)
      network_id: "*",       // Any network (default: none). Use '*' to match any network id.
      provider: () => new HDWalletProvider(process.env.PRIVATE_KEY, "http://127.0.0.1:8545")
    },
  },

  // Set default mocha options here, use special reporters, etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.27",      // Fetch exact version from solc-bin (default: truffle's version)
    },
  },
};