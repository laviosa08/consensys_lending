// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract NFTLending {
    address public owner;
    uint256 public constant DURATION = 365 days; // Loan duration is 1 year

    struct Loan {
        address borrower;
        address nftAddress;
        uint256 tokenId;
        uint256 loanAmount;
        uint256 repaymentAmount;
        uint256 startTime;
        bool isRepaid;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => mapping(uint256 => bool)) public isCollateralized;
    uint256 public loanCounter;

    // Famous NFT collections and their loan details
    struct NFTLoanDetails {
        uint256 loanValue;
        uint256 repaymentValue;
    }

    mapping(address => NFTLoanDetails) public nftLoanDetails;

    constructor() {
        owner = msg.sender;
        // Supported NFT collections for loan
        nftLoanDetails[0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D] = NFTLoanDetails({ loanValue: 3 ether, repaymentValue: 3.5 ether }); // Bored Ape Yacht Club
        nftLoanDetails[0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB] = NFTLoanDetails({ loanValue: 2 ether, repaymentValue: 2.4 ether }); // CryptoPunks
    }

    // Modifier to restrict functions to only the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // Function to collateralize an NFT and borrow funds
    function collateralizeNFT(address nftAddress, uint256 tokenId) public {
        require(nftLoanDetails[nftAddress].loanValue > 0, "NFT not supported for loans");
        IERC721 nftContract = IERC721(nftAddress);
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner of the NFT");

        uint256 loanAmount = nftLoanDetails[nftAddress].loanValue;
        uint256 repaymentAmount = nftLoanDetails[nftAddress].repaymentValue;

        // Transfer NFT to contract as collateral
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        // Record loan details
        loanCounter++;
        loans[loanCounter] = Loan({
            borrower: msg.sender,
            nftAddress: nftAddress,
            tokenId: tokenId,
            loanAmount: loanAmount,
            repaymentAmount: repaymentAmount,
            startTime: block.timestamp,
            isRepaid: false
        });

        isCollateralized[nftAddress][tokenId] = true;

        // Send loan amount to borrower
        payable(msg.sender).transfer(loanAmount);
    }

    // Function to repay the loan and retrieve the NFT
    function repayLoan(uint256 loanId) public payable {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.borrower, "Not the borrower");
        require(!loan.isRepaid, "Loan already repaid");
        require(msg.value >= loan.repaymentAmount, "Insufficient repayment amount");
        require(block.timestamp <= loan.startTime + DURATION, "Loan period expired");

        // Mark loan as repaid
        loan.isRepaid = true;

        // Transfer NFT back to borrower
        IERC721 nftContract = IERC721(loan.nftAddress);
        nftContract.transferFrom(address(this), msg.sender, loan.tokenId);

        isCollateralized[loan.nftAddress][loan.tokenId] = false;
    }

    // Function to handle defaulted loans (transfer NFT to contract owner)
    function checkDefault(uint256 loanId) public onlyOwner {
        Loan storage loan = loans[loanId];
        require(!loan.isRepaid, "Loan already repaid");
        require(block.timestamp > loan.startTime + DURATION, "Loan period not yet expired");

        // Transfer NFT to contract owner
        IERC721 nftContract = IERC721(loan.nftAddress);
        nftContract.transferFrom(address(this), owner, loan.tokenId);

        isCollateralized[loan.nftAddress][loan.tokenId] = false;
    }

    // Function for the owner to withdraw accumulated interest
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Fallback function to accept deposits
    receive() external payable {}
}