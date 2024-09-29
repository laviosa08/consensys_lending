import React, { useState, useEffect } from 'react';
import Web3Modal from 'web3modal';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from '@mui/material';
import { styled } from '@mui/system';

const API_URL = 'http://localhost:3000';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const StyledCardMedia = styled(CardMedia)({
  paddingTop: '100%', // 1:1 aspect ratio
});

const StyledCardContent = styled(CardContent)({
  flexGrow: 1,
});

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [nfts, setNfts] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    if (account) {
      fetchNFTs();
      fetchLoans();
    }
  }, [account]);

  async function connectWallet() {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
  }

  async function fetchNFTs() {
    const response = await fetch(`${API_URL}/nfts/${account}`);
    const data = await response.json();
    setNfts(data);
  }

  async function fetchLoans() {
    const response = await fetch(`${API_URL}/loans/${account}`);
    const data = await response.json();
    setLoans(data);
  }

  async function createLoan(nft: any) {
    const response = await fetch(`${API_URL}/create-loan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account, nft }),
    });
    if (response.ok) {
      fetchLoans();
    }
  }

  async function makePayment(loan: any) {
    const response = await fetch(`${API_URL}/make-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account, loan }),
    });
    if (response.ok) {
      fetchLoans();
    }
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NFT Lending Platform
          </Typography>
          {account ? (
            <Typography variant="body2">Connected: {account}</Typography>
          ) : (
            <Button color="inherit" onClick={connectWallet}>Connect Wallet</Button>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {account && (
          <>
            <Typography variant="h4" gutterBottom>Your NFTs</Typography>
            <Grid container spacing={4}>
              {nfts.map((nft) => (
                <Grid item key={nft.tokenId} xs={12} sm={6} md={4}>
                  <StyledCard>
                    <StyledCardMedia
                      image={nft.image}
                      title={`NFT ${nft.tokenId}`}
                    />
                    <StyledCardContent>
                      <Typography gutterBottom variant="h5" component="div">
                        Token ID: {nft.tokenId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Value: {nft.value} ETH
                      </Typography>
                    </StyledCardContent>
                    <CardActions>
                      <Button size="small" variant="contained" onClick={() => createLoan(nft)}>Collateralize & Borrow</Button>
                    </CardActions>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h4" gutterBottom>Your Loans</Typography>
              <List>
                {loans.map((loan) => (
                  <React.Fragment key={`${loan.nftAddress}-${loan.tokenId}`}>
                    <ListItem>
                      <ListItemText
                        primary={`NFT Address: ${loan.nftAddress}`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              Token ID: {loan.tokenId}
                            </Typography>
                            <br />
                            Borrowed Amount: {loan.amount} ETH
                          </>
                        }
                      />
                      <Button variant="outlined" onClick={() => makePayment(loan)}>Make Payment</Button>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </>
        )}
      </Container>
    </>
  );
}

export default App;