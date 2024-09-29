import express, { Application, Request, Response }  from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import dotenv from 'dotenv';
import loanRoutes from './routes/lending';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

app.use(express.json());

app.use('api/loan',loanRoutes);

app.get('/',(req: Request, res: Response) => {
  res.send('NFT Lending Backend is running.');
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});