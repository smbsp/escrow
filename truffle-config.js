const path = require('path');

module.exports = {
  contracts_build_directory: path.join(__dirname, "client/src/contract"),

  networks: {
  },
  mocha: {
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.7.1",    // Fetch exact version from solc-bin (default: truffle's version)
    }
  }
}
