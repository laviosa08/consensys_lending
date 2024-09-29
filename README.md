## How to run

### Frontend
#### Install necessary libraries

```sh
cd frontend
npm install
```

#### Run the frontend
   
```sh
cd frontend
npm start
```

### Backend

#### Create .env with following
```ssh
PORT=3001
INFURA_PROJECT_ID=`your_project_id_here`
PRIVATE_KEY=`account_private_key_here`
CONTRACT_ADDRESS=`contract_address here`
```

#### Install necessary libraries
```sh
cd backend
npm install
```


#### Deploy the smart contract
```sh
truffle migrate --network ganache
```

#### Open ganache
```sh
ganache-cli
```

#### Start the backend server

```sh
cd backend
npm run dev
```



