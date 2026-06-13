OPENTASK - HUONG DAN CHAY, RESET VA DUNG PROJECT
================================================
Project nay gom 2 phan chinh:
1. Hardhat Local Blockchain
   - Chay blockchain local tai http://127.0.0.1:8545
   - Chain ID: 31337
   - Moi account Hardhat mac dinh co 10000 ETH gia
2. Frontend React/Vite
   - Chay giao dien tai http://localhost:5173
   - Ket noi MetaMask de tuong tac voi smart contract
I. CAI DEPENDENCY LAN DAU
-------------------------
Mo PowerShell tai thu muc project:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain
Cai dependency cho Hardhat:
  npm ci
Cai dependency cho frontend:
  cd frontend
  npm ci
Quay lai root project:
  cd ..
II. KHOI DONG PROJECT BINH THUONG
---------------------------------
Nen mo 3 cua so PowerShell rieng.
Terminal 1 - chay Hardhat node:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain
  npx hardhat node --hostname 0.0.0.0
Terminal 2 - deploy smart contract:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain
  npx hardhat run .\scripts\deploy.js --network localhost
Terminal 3 - chay frontend:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain\frontend
  npm run dev -- --host 0.0.0.0
Mo trinh duyet:
  http://localhost:5173
III. CAU HINH METAMASK
----------------------
Them network Hardhat Local vao MetaMask:
  Network name: Hardhat Local
  RPC URL: http://127.0.0.1:8545
  Chain ID: 31337
  Currency symbol: ETH
Import account Hardhat bang private key in trong terminal Hardhat node.
Account company thuong dung:
  Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Account worker goi y:
  Address: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
  Private key: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
Arbiter #1:
  Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  Private key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Arbiter #2:
  Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  Private key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
Arbiter #3:
  Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  Private key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
Luu y: cac private key nay chi dung cho Hardhat local. Khong dung tren mainnet.
IV. KIEM TRA CAC TIEN TRINH DANG CHAY
-------------------------------------
Kiem tra Hardhat node dang chay tren port 8545:
  Get-NetTCPConnection -LocalPort 8545
Kiem tra frontend Vite dang chay tren port 5173:
  Get-NetTCPConnection -LocalPort 5173
Neu thay dong co State la Listen, nghia la tien trinh dang chay.
Cot OwningProcess la PID cua tien trinh.
Vi du:
  LocalPort  State   OwningProcess
  8545       Listen  8024
  5173       Listen  20204
PID la ma tien trinh tren Windows.
V. DUNG CAC TIEN TRINH
----------------------
Neu biet PID, dung tien trinh bang:
  Stop-Process -Id <PID> -Force
Vi du dung Hardhat node:
  Stop-Process -Id 8024 -Force
Vi du dung frontend:
  Stop-Process -Id 20204 -Force
Neu muon tim PID theo port:
  Get-NetTCPConnection -LocalPort 8545
  Get-NetTCPConnection -LocalPort 5173
VI. RESET HARDHAT LOCAL BLOCKCHAIN
----------------------------------
Reset Hardhat nghia la xoa trang thai blockchain local hien tai.
Sau khi reset:
  - Tat ca ticket cu mat
  - Contract cu mat
  - Transaction cu tren chain local mat
  - Account Hardhat quay lai 10000 ETH gia
  - MetaMask van giu account da import
  - Activity trong MetaMask co the van hien lich su cu do cache
Cach reset:
1. Tim PID cua Hardhat node:
   Get-NetTCPConnection -LocalPort 8545
2. Dung Hardhat node:
   Stop-Process -Id <PID_HARDHAT> -Force
3. Chay lai Hardhat node:
   cd D:\HK2_Nam3\Blockchain\CK\block_chain
   npx hardhat node --hostname 0.0.0.0
4. Deploy lai contract:
   cd D:\HK2_Nam3\Blockchain\CK\block_chain
   npx hardhat run .\scripts\deploy.js --network localhost
5. Reload frontend:
   http://localhost:5173
VII. KHOI DONG NGAM BANG POWERSHELL
-----------------------------------
Neu khong muon mo terminal rieng cho Hardhat node, co the chay nen:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain
  Start-Process -FilePath 'npx.cmd' -ArgumentList @('hardhat','node','--hostname','0.0.0.0') -WorkingDirectory (Get-Location).Path -RedirectStandardOutput 'hardhat-node.log' -RedirectStandardError 'hardhat-node.err.log' -WindowStyle Hidden
Chay frontend nen:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain\frontend
  Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev','--','--host','0.0.0.0') -WorkingDirectory (Get-Location).Path -RedirectStandardOutput 'vite.log' -RedirectStandardError 'vite.err.log' -WindowStyle Hidden
Xem log Hardhat:
  Get-Content D:\HK2_Nam3\Blockchain\CK\block_chain\hardhat-node.log -Tail 80
Xem log frontend:
  Get-Content D:\HK2_Nam3\Blockchain\CK\block_chain\frontend\vite.log -Tail 80
VIII. LENH BUILD, LINT, TEST
----------------------------
Compile smart contract:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain
  npm run compile
Chay test smart contract:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain
  npm test
Lint frontend:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain\frontend
  npm run lint
Build frontend:
  cd D:\HK2_Nam3\Blockchain\CK\block_chain\frontend
  npm run build
IX. LOI THUONG GAP
------------------
1. Frontend khong load ticket
Kiem tra:
  - Hardhat node da chay chua
  - Da deploy contract chua
  - MetaMask dang o network Hardhat Local chua
  - Chain ID co phai 31337 khong
2. MetaMask bao account/method has not been authorized
Nguyen nhan:
  Website localhost:5173 chua duoc phep dung account dang chon.
Cach sua:
  - Disconnect site trong MetaMask
  - Reload localhost:5173
  - Connect Wallet lai
  - Chon dung account can dung
3. MetaMask van hien activity cu sau khi reset Hardhat
Day la cache cua MetaMask, khong phai blockchain state hien tai.
Muon xoa:
  MetaMask -> Settings -> Advanced -> Clear activity and nonce data
4. Port 8545 hoac 5173 da bi chiem
Tim PID:
  Get-NetTCPConnection -LocalPort 8545
  Get-NetTCPConnection -LocalPort 5173
Dung tien trinh:
  Stop-Process -Id <PID> -Force
5. Contract address sai sau khi reset
Sau khi reset Hardhat node, can deploy lai:
  npx hardhat run .\scripts\deploy.js --network localhost
Neu deploy ra address khac, can kiem tra:
  frontend\src\config.js
X. LUONG DEMO NHANH
-------------------
1. Chon account Company trong MetaMask
2. Mo http://localhost:5173
3. Ket noi vi
4. Tao Ticket va khoa ETH
5. Chuyen MetaMask sang account Worker
6. Reload trang neu can
7. Worker nhan Ticket
8. Worker nop minh chung
9. Chuyen lai Company
10. Company duyet thanh toan
11. Ticket chuyen sang Da thanh toan
XI. GHI CHU QUAN TRONG
----------------------
Hardhat Local chi la blockchain gia lap tren may.
ETH trong Hardhat Local la ETH gia, khong co gia tri that.
Khong gui ETH that vao cac account/private key Hardhat.
