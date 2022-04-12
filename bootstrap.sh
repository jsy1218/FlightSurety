kill -9 $(lsof -ti :8545) # kill previous ganache RPC
kill -9 $(lsof -ti :8000) # kill previous dapp
kill -9 $(lsof -ti :3000) # kill previous oracle
./1_start_ganache-cli.sh
./2_migrate_contract.sh
./3_start_dapp.sh
./4_start_oracle.sh