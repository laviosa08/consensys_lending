import express, { Request, Response } from 'express';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import * as NFTLendingABI from '../../build/contracts/NFTLending.json'; 

require("dotenv").config()
const router = express.Router();

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const web3 = new Web3(new Web3.providers.HttpProvider(INFURA_PROJECT_ID!));
const lendingContract = new web3.eth.Contract(NFTLendingABI.abi as AbiItem[], CONTRACT_ADDRESS);
const erc721ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "owner", "type": "address" }, { "name": "index", "type": "uint256" }],
        "name": "tokenOfOwnerByIndex",
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "tokenId", "type": "uint256" }],
        "name": "tokenURI",
        "outputs": [{ "name": "", "type": "string" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

type LendingDetails = {
    loanValue: number,
    repaymentValue: number
}

const eligible_contract_addresses = new Map<string, LendingDetails>();

eligible_contract_addresses.set("0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", { loanValue: 3, repaymentValue: 3.5 }) // Bored Ape Yacht Club
eligible_contract_addresses.set("0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB", { loanValue: 2, repaymentValue: 2.4 }) // CryptoPunks

//Fetch list of NFTs owned by user
router.get('/nfts/:address', async (req: Request, res: Response) => {
    try {
    const address = req.params.address;

    let nfts = [];
    for (const nftContractAddress of eligible_contract_addresses.keys() ) {
        const contract = new web3.eth.Contract(erc721ABI, nftContractAddress);
        const balanceString: string = await contract.methods.balanceOf(address).call();
        const balance: number = parseInt(balanceString); // Ensure balance is a number

        const details = eligible_contract_addresses.get(nftContractAddress)

        
        for (let i = 0; i < balance; i++) {
            const tokenId = await contract.methods.tokenOfOwnerByIndex(address, i).call();
            const tokenURI = await contract.methods.tokenURI(tokenId).call();
            nfts.push({ tokenId, tokenURI, nftAddress: nftContractAddress, loanValue: details!.loanValue,  repaymentValue: details!.repaymentValue});
        }
    }
    res.json(nfts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NFTs' });
  }
});

//Collateralize NFT and lend ETH
router.post('/lend', async (req: Request, res: Response) => {
    try {
      const { nftAddress, tokenId, userAddress } = req.body;
  
      const transaction = lendingContract.methods.collateralizeNFT(nftAddress, tokenId);
      const gas = String(await transaction.estimateGas({ from: userAddress }));
      const tx = await transaction.send({ from: userAddress, gas });
  
      res.json({ success: true, tx });
    } catch (error) {
      res.status(500).json({ error: 'Error collateralizing NFT' });
    }
  });

router.post('/repay', async (req: Request, res: Response) => {
	try {
		const { loanId, userAddress, repaymentAmount } = req.body;
		if (!loanId || !repaymentAmount) {
			res.status(400).json({ error: 'Missing parameters' });
		}
		const transaction = lendingContract.methods.repayLoan(loanId);
		const gas = String(await transaction.estimateGas({ from: userAddress, value: web3.utils.toWei(repaymentAmount, 'ether') }));
		const tx = await transaction.send({ from: userAddress, value: web3.utils.toWei(repaymentAmount, 'ether'), gas });

		res.json({ success: true, transaction:tx });
	} catch (error) {
		res.status(500).json({ error: 'Error repaying loan' });
	}
});

// Withdraw Interest (Owner only)
router.post('/withdraw', async (req: Request, res: Response) => {
	try {
		// Get the owner address from the contract
    const ownerAddress = await lendingContract.methods.owner().call();
		const account = req.body.account;

    // Check if the current account (from PRIVATE_KEY) is the owner
    if (account.address !== ownerAddress) {
			res.status(403).json({ error: 'Only the owner can withdraw funds' });
    }
		// Call the smart contract's withdraw function (onlyOwner)
		const tx = await lendingContract.methods.withdraw();
		const gas = String(await tx.estimateGas({ from: account.address }));
		// Send transaction
    const receipt = await tx.send({
      from: account.address,
      gas: gas
    });
		
		res.json({ success: true, transactionHash: tx });
	} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Failed to withdraw funds' });
	}
});
  


// // 5. Check Default
router.get('/check-default/:loanId', async (req: Request, res: Response) => {
    try {
			const { loanId, account } = req.params;
	
			if (!loanId) {
					res.status(400).json({ error: 'Missing loan ID' });
			}
			// Fetch loan details from the contract
			const loanDetails = await lendingContract.methods.loans(loanId).call();
	
			// Check if the loan period has expired
			const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds
			const loanDurationExpired = currentTime > parseInt(loanDetails.startTime) + parseInt(process.env.LOAN_DURATION!);
	
			if (!loanDurationExpired) {
				res.status(400).json({ message: 'Loan period has not yet expired.' });
			}
	
			// Call checkDefault to transfer NFT to the contract owner
			const tx = lendingContract.methods.checkDefault(loanId);
			const gas = String(await tx.estimateGas({ from: account }));
	
			// Send the transaction
			const receipt = await tx.send({
				from: account,
				gas: gas
			});
	
			// Transaction was successful
			res.json({
				success: true,
				message: `Default check performed, NFT transferred to contract owner for loan ID ${loanId}.`,
				txHash: receipt.transactionHash
			});
	
		} catch (error) {
			console.error('Error checking default status:', error);
			res.status(500).json({ error: 'Failed to check default status.' });
		}
  });


export default router;