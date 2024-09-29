// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract NFTLending {
    address public owner;
    uint256 public interestRate = 5; // 5% monthly interest rate (can be changed by owner)
    uint256 public loanToValueRatio = 70; // Maximum loan amount is 70% of NFT value

    struct Loan {
        address borrower;
        address nftAddress;
        uint256 tokenId;
        uint256 loanAmount;
        uint256 nftValue; // Value of the NFT in ETH
        uint256 startTime; // Timestamp of when the loan was taken
        uint256 lastInterestPaid; // Timestamp of the last interest payment
        uint256 missedPayments; // Number of consecutive missed interest payments
        bool isRepaid;
    }

    mapping(uint256 => Loan) public loans; // Maps loanId to Loan details
    uint256 public loanCounter;

    constructor() {
        owner = msg.sender;
    }

    // Modifier to restrict functions to only the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // Function to collateralize an NFT and borrow funds
    function collateralizeNFT(address nftAddress, uint256 tokenId, uint256 nftValue) public {
        IERC721 nftContract = IERC721(nftAddress);
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner of the NFT");

        // Calculate the maximum loan amount (70% of NFT value)
        uint256 maxLoanAmount = (nftValue * loanToValueRatio) / 100;
        require(maxLoanAmount > 0, "NFT value too low");

        // Transfer NFT to the contract as collateral
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        // Record loan details
        loanCounter++;
        loans[loanCounter] = Loan({
            borrower: msg.sender,
            nftAddress: nftAddress,
            tokenId: tokenId,
            loanAmount: maxLoanAmount,
            nftValue: nftValue,
            startTime: block.timestamp,
            lastInterestPaid: block.timestamp,
            missedPayments: 0,
            isRepaid: false
        });

        // Send the loan amount (in ETH) to the borrower
        payable(msg.sender).transfer(maxLoanAmount);
    }

    // Function to repay the loan and retrieve the NFT
    function repayLoan(uint256 loanId) public payable {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.borrower, "Not the borrower");
        require(!loan.isRepaid, "Loan already repaid");
        require(msg.value >= loan.loanAmount, "Insufficient repayment amount");

        // Mark loan as repaid
        loan.isRepaid = true;

        // Return the NFT to the borrower
        IERC721 nftContract = IERC721(loan.nftAddress);
        nftContract.transferFrom(address(this), msg.sender, loan.tokenId);
    }

    // Function to pay monthly interest
    // Function to pay overdue interest
    function payInterest(uint256 loanId) public payable {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.borrower, "Not the borrower");
        require(!loan.isRepaid, "Loan already repaid");
        
        // Calculate the number of months that have passed since the last interest payment
        uint256 oneMonth = 30 days;
        uint256 monthsPassed = (block.timestamp - loan.lastInterestPaid) / oneMonth;
        require(monthsPassed > 0, "No interest due yet");
        
        // Calculate the total interest due for all missed months
        uint256 totalInterestDue = (loan.loanAmount * interestRate / 100) * monthsPassed;

        // Ensure the borrower pays the total amount of interest due
        require(msg.value == totalInterestDue, "Incorrect interest amount");

        // Update last payment date to the current timestamp
        loan.lastInterestPaid = block.timestamp;

        // If the borrower had missed payments, reset the missed payments counter
        if (monthsPassed > 0) {
            loan.missedPayments -= monthsPassed;
        }
        // Ensure missed payments do not go negative
        if (loan.missedPayments < 0) {
            loan.missedPayments = 0;
        }

    }

    // Function to check and enforce loan defaults
    function checkDefault(uint256 loanId) public {
        Loan storage loan = loans[loanId];
        require(!loan.isRepaid, "Loan already repaid");

        // Check if a month has passed since the last interest payment
        uint256 oneMonth = 30 days;
        if (block.timestamp >= loan.lastInterestPaid + oneMonth) {
            loan.missedPayments++;

            // If the borrower missed 3 consecutive payments, the NFT is permanently lost
            if (loan.missedPayments >= 3) {
                // Transfer the NFT to the contract owner
                IERC721 nftContract = IERC721(loan.nftAddress);
                nftContract.transferFrom(address(this), owner, loan.tokenId);
            }
        }
    }

    // Function to get loans by borrower
    function getLoansByBorrower(address borrower) public view returns (Loan[] memory) {
        uint256 totalLoans = 0;

        // First, count how many loans belong to this borrower
        for (uint256 i = 1; i <= loanCounter; i++) {
            if (loans[i].borrower == borrower) {
                totalLoans++;
            }
        }

        // Now create an array to store all loans for the borrower
        Loan[] memory borrowerLoans = new Loan[](totalLoans);
        uint256 index = 0;

        // Populate the array with the borrower's loans
        for (uint256 i = 1; i <= loanCounter; i++) {
            if (loans[i].borrower == borrower) {
                borrowerLoans[index] = loans[i];
                index++;
            }
        }

        return borrowerLoans;
    }

    // Function for the owner to withdraw accumulated interest
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Fallback function to accept deposits
    receive() external payable {}
}