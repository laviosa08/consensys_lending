const NFTLending = artifacts.require("NFTLending");

module.exports = function (deployer) {
  deployer.deploy(NFTLending);
};
