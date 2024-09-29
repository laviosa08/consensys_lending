import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import * as NFTLendingPlatform from '../../build/contracts/NFTLendingPlatform.json'; 

require("dotenv").config()
const router = express.Router();

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS!, NFTLendingPlatform.abi, wallet);

const eligible_contract_addresses = [
    '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' //boredApe 
];

//Fetch list of NFTs owned by user
router.get('/nfts/:address', async (req: Request, res: Response) => {
    try {
    const address = req.params.address;

        const provider = new ethers.providers.InfuraProvider( process.env.INFURA_API_URL);
    const erc721ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
        "function tokenURI(uint256 tokenId) view returns (string)"
    ];

    let nfts = [];
    for (const nftContractAddress of eligible_contract_addresses ) {
        const contract = new ethers.Contract(nftContractAddress, erc721ABI, provider);
        const balance = await contract.balanceOf(address);
        for (let i = 0; i < balance; i++) {
            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
            const tokenURI = await contract.tokenURI(tokenId);
            nfts.push({ tokenId, tokenURI });
        }
    }
    res.json(nfts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NFTs' });
  }
});

// Collateralize NFT 
router.post('/collateralize', async (req: Request, res: Response) => {
    try {
        const { nftAddress, tokenId, nftValue } = req.body;
        if (!nftAddress || !tokenId || !nftValue) {
            res.status(400).json({ error: 'Missing parameters' });
        }
        // Estimate loan amount (70% of the NFT value)
        const maxLoanAmount = ethers.utils.parseEther(nftValue.toString()).mul(70).div(100);

        // Call the contract's collateralizeNFT function
        const tx = await contract.collateralizeNFT(nftAddress, tokenId, nftValue, { gasLimit: 1000000 });
        await tx.wait();
        res.json({ success: true, transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to collateralize NFT' });
    }
});

// 2. Repay Loan
router.post('/repay', async (req: Request, res: Response) => {
    try {
        const { loanId, repaymentAmount } = req.body;
    
        if (!loanId || !repaymentAmount) {
            res.status(400).json({ error: 'Missing parameters' });
        }
    
        const amount = ethers.utils.parseEther(repaymentAmount.toString());
    
        // Call the smart contract's repayLoan function
        const tx = await contract.repayLoan(loanId, { value: amount, gasLimit: 1000000 });
        await tx.wait();
        
        res.json({ success: true, transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to repay loan' });
    }
  });
  
// 3. Pay Interest
router.post('/pay-interest', async (req: Request, res: Response) => {
    try {
        const { loanId, interestAmount } = req.body;
    
        if (!loanId || !interestAmount) {
            res.status(400).json({ error: 'Missing parameters' });
        }
    
        const amount = ethers.utils.parseEther(interestAmount.toString());
    
        // Call the smart contract's payInterest function
        const tx = await contract.payInterest(loanId, { value: amount, gasLimit: 1000000 });
        await tx.wait();
        
        res.json({ success: true, transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to pay interest' });
    }
  });
  
// 4. Withdraw Interest (Owner only)
router.post('/withdraw', async (req: Request, res: Response) => {
    try {
        // Call the smart contract's withdraw function (onlyOwner)
        const tx = await contract.withdraw({ gasLimit: 1000000 });
        await tx.wait();
        
        res.json({ success: true, transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to withdraw funds' });
    }
  });

// 5. Check Default
router.get('/check-default/:loanId', async (req: Request, res: Response) => {
    try {
        const { loanId } = req.params;
    
        if (!loanId) {
            res.status(400).json({ error: 'Missing loan ID' });
        }
    
        // Call the smart contract's checkDefault function
        const tx = await contract.checkDefault(loanId, { gasLimit: 1000000 });
        await tx.wait();
        
        res.json({ success: true, transactionHash: tx.hash });
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to check loan default' });
    }
  });

router.get('/loans/:address', async (req: Request, res: Response) => {
    try {
      const borrowerAddress = req.params.address;
      const loans = await contract.getLoansByBorrower(borrowerAddress);
  
      const formattedLoans = loans.map((loan: any) => ({
        nftAddress: loan.nftAddress,
        tokenId: loan.tokenId.toString(),
        loanAmount: ethers.utils.formatEther(loan.loanAmount),
        nftValue: ethers.utils.formatEther(loan.nftValue),
        startTime: loan.startTime.toString(),
        lastInterestPaid: loan.lastInterestPaid.toString(),
        missedPayments: loan.missedPayments.toString(),
        isRepaid: loan.isRepaid,
      }));
  
      res.json(formattedLoans);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch loans' });
    }
});

export default router;