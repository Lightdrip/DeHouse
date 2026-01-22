import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import databaseService from './DatabaseService';
import treasuryBalanceService from './TreasuryBalanceService'; // Import the service

// --- Constants --- (Keep as before)
const ETH_TREASURY_ADDRESS = '0x8262ab131e3f52315d700308152e166909ecfa47'.toLowerCase();
const SOL_TREASURY_ADDRESS = '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV';
const BTC_LEGACY_ADDRESS = '1Kr3GkJnBZeeQZZoiYjHoxhZjDsSby9d4p';
const BTC_TAPROOT_ADDRESS = 'bc1pl6sq6srs5vuczd7ard896cc57gg4h3mdnvjsg4zp5zs2rawqmtgsp4hh08';
const BTC_SEGWIT_ADDRESS = 'bc1qu7suxfua5x46e59e7a56vd8wuj3a8qj06qr42j';
const TRANSFER_EVENT_TOPIC = ethers.id('Transfer(address,address,uint256)');
const ERC20_CONTRACTS = {
  USDC: { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'.toLowerCase(), decimals: 6, symbol: 'USDC' },
  USDT: { address: '0xdac17f958d2ee523a2206206994597c13d831ec7'.toLowerCase(), decimals: 6, symbol: 'USDT' },
  DAI: { address: '0x6b175474e89094c44da98b954eedeac495271d0f'.toLowerCase(), decimals: 18, symbol: 'DAI' },
};
const SOL_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const IS_DEV = process.env.NODE_ENV === 'development';
const COINGECKO_DELAY_MS = 1500;
const BLOCKSTREAM_API = 'https://blockstream.info/api';
const SOL_POLL_INTERVAL = 20000;
const BTC_POLL_INTERVAL = 90000;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function getHistoricalPrice(coinId, timestamp) { /* ... same helper ... */
    await sleep(COINGECKO_DELAY_MS);
    if (['usd-coin', 'tether', 'dai'].includes(coinId)) return 1.0;
    const date = new Date(timestamp); const day = ('0'+date.getDate()).slice(-2); const month = ('0'+(date.getMonth()+1)).slice(-2); const year = date.getFullYear(); const dateString = `${day}-${month}-${year}`;
    const url = `${COINGECKO_API}/coins/${coinId}/history?date=${dateString}&localization=false`; console.log(`[Price] Fetching ${coinId} on ${dateString}`);
    try { const r=await fetch(url); if(!r.ok){if(r.status===429){console.warn(`[Price] Rate limit ${coinId}, retry...`); await sleep(5000); const rr=await fetch(url); if(rr.ok)return(await rr.json())?.market_data?.current_price?.usd||0;}throw new Error(`API Error ${r.status}`);} const d=await r.json(); const p=d?.market_data?.current_price?.usd; if(p){console.log(`[Price] ${coinId}: $${p}`);return p;}else{console.warn(`[Price] Missing ${coinId} data.`);return 0;}}catch(e){console.error(`[Price] Fetch Error (${coinId}):`,e);return 0;}
}
function calculatePoints(usdValue) { /* ... same helper ... */
  if (typeof usdValue !== 'number' || usdValue <= 0 || isNaN(usdValue)) return 0; return Math.floor(usdValue * 100);
}

class BlockchainListenerService {
    constructor() { /* ... same ... */
        this.providers = {}; this.listeners = { ethProviderEvents: [], solIntervalId: null, btcIntervalId: null };
        this.coinGeckoIds = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', USDC: 'usd-coin', USDT: 'tether', DAI: 'dai' };
        this.processingTx = new Set();
    }
    async initProviders() { /* ... same ... */
        try { if(window.ethereum){this.providers.eth=new ethers.BrowserProvider(window.ethereum);console.log('[Init] Using window.ethereum.');}else{console.warn('[Init] No wallet provider. Using Infura.');this.providers.eth=new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/1b261d0ba34946fd9ef865d80a482f7b');} this.providers.sol=new Connection('https://api.mainnet-beta.solana.com','confirmed'); console.log('[Init] Providers OK.');}catch(e){console.error('[Init] Error:',e);throw e;}
    }
    async startListening() { /* ... same ... */
        if (IS_DEV) {
            return;
        }
        try{await this.initProviders();this.startEthereumListener();this.startSolanaListener();this.startBitcoinListener();console.log('[Listener] All started.');}catch(e){console.error('[Listener] Start failed:',e);}
    }
    async processDonation(donationData) {
        if(!donationData || !donationData.txHash) {
            console.error("[Process] Invalid data:", donationData);
            return;
        }

        if(this.processingTx.has(donationData.txHash)) {
            return;
        }

        this.processingTx.add(donationData.txHash);

        try {
            // Check if transaction already exists
            if(await databaseService.transactionExists(donationData.txHash)) {
                console.log(`[Process] Tx ${donationData.txHash} exists. Skip.`);
                return;
            }

            console.log(`[Process] Adding donation:`, donationData);

            // Step 1: Add the donation to the database
            const added = await databaseService.addDonation(donationData);

            if(added) {
                console.log(`[Process] Added OK ${added.id}`);

                // --- Trigger balance update ---
                treasuryBalanceService.triggerBalanceUpdate();

                // Step 2: Directly update the leaderboard (this is the key fix)
                if (donationData.walletAddress && donationData.points && donationData.usdValue) {
                    const leaderboardUpdated = await databaseService.directUpdateLeaderboard(
                        donationData.walletAddress,
                        donationData.points,
                        donationData.usdValue
                    );

                    if (leaderboardUpdated) {
                        console.log(`[Process] Leaderboard updated for ${donationData.walletAddress}`);
                    } else {
                        console.error(`[Process] Failed to update leaderboard for ${donationData.walletAddress}`);
                    }
                } else {
                    console.error(`[Process] Missing required data for leaderboard update:`, donationData);
                }
            } else {
                console.warn(`[Process] Add failed/duplicate ${donationData.txHash}`);
            }
        } catch(e) {
            console.error(`[Process] Error processing ${donationData.txHash}:`, e);
        } finally {
            this.processingTx.delete(donationData.txHash);
        }
    }
    startEthereumListener() { /* ... same ... */
        if(!this.providers.eth)return console.error('[ETH Listener] No provider.');console.log('[ETH Listener] Starting...'); const handleEthBlock=async(bNum)=>{console.log(`[ETH] Block ${bNum}`);try{const b=await this.providers.eth.getBlock(bNum,true);if(!b||!b.prefetchedTransactions)return;const ts=b.timestamp*1000;for(const tx of b.prefetchedTransactions){if(tx?.to?.toLowerCase()===ETH_TREASURY_ADDRESS&&tx.value>0n){if(this.processingTx.has(tx.hash))continue;const amt=parseFloat(ethers.formatEther(tx.value));const p=await getHistoricalPrice(this.coinGeckoIds.ETH,ts);const uV=amt*p;const pts=calculatePoints(uV);const sAddr=tx.from.toLowerCase();this.processDonation({id:tx.hash,timestamp:ts,walletAddress:sAddr,amount:amt,currency:'ETH',usdValue:uV,points:pts,txHash:tx.hash,chain:'ETH'});}}}catch(e){console.error(`[ETH] Error block ${bNum}:`,e);}}; this.providers.eth.on('block',handleEthBlock); this.listeners.ethProviderEvents.push(['block',handleEthBlock]); const erc20F={address:Object.values(ERC20_CONTRACTS).map(c=>c.address),topics:[TRANSFER_EVENT_TOPIC,null,ethers.zeroPadValue(ETH_TREASURY_ADDRESS,32)]}; const handleErc20=async(log)=>{const uId=`${log.transactionHash}-${log.index}`;if(this.processingTx.has(log.transactionHash)){return;}try{const cI=Object.values(ERC20_CONTRACTS).find(c=>c.address===log.address.toLowerCase());if(!cI)return;const iface=new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);const pLog=iface.parseLog(log);if(!pLog)throw new Error("Parse fail");const amt=parseFloat(ethers.formatUnits(pLog.args.value,cI.decimals));if(amt<=0)return;const tx=await this.providers.eth.getTransaction(log.transactionHash);if(!tx)throw new Error("Tx details fail");const b=await this.providers.eth.getBlock(log.blockNumber);if(!b)throw new Error("Block details fail");const ts=b.timestamp*1000;const sAddr=tx.from.toLowerCase();const p=await getHistoricalPrice(this.coinGeckoIds[cI.symbol],ts);const uV=amt*p;const pts=calculatePoints(uV);this.processDonation({id:uId,timestamp:ts,walletAddress:sAddr,amount:amt,currency:cI.symbol,usdValue:uV,points:pts,txHash:log.transactionHash,chain:'ETH'});}catch(e){console.error(`[ERC20] Error log ${uId}:`,e);}}; this.providers.eth.on(erc20F,handleErc20); this.listeners.ethProviderEvents.push([erc20F,handleErc20]); console.log('[ETH] Listeners OK.');
    }
    async processSolanaTransaction(signatureInfo) { /* ... same as previous version ... */
        const { signature, blockTime } = signatureInfo; const uniqueProcessingId = `${signature}-${Date.now()}`;
        if (this.processingTx.has(signature)) return; try { if (await databaseService.transactionExists(signature)) return; } catch (dbError) { console.error(`[SOL ${uniqueProcessingId}] DB Error check ${signature}:`, dbError); }
        this.processingTx.add(signature); console.log(`[SOL ${uniqueProcessingId}] === Processing Tx: ${signature} ===`);
        try {
            console.log(`[SOL ${uniqueProcessingId}] Fetching tx details`); const txDetails = await this.providers.sol.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0, });
            if (!txDetails) { console.warn(`[SOL ${uniqueProcessingId}] Tx details not found.`); return; }
            console.log(`[SOL ${uniqueProcessingId}] Tx meta keys:`, txDetails.meta ? Object.keys(txDetails.meta) : '<null meta>');
            if (txDetails.meta?.err) { console.log(`[SOL ${uniqueProcessingId}] Tx failed:`, txDetails.meta.err); return; }
            if (!txDetails.meta || !txDetails.transaction?.message?.accountKeys || !txDetails.meta.preBalances || !txDetails.meta.postBalances) { console.error(`[SOL ${uniqueProcessingId}] Missing critical meta/msg data.`); return; }
            const timestamp = (blockTime || Math.floor(Date.now() / 1000)) * 1000; const accountKeys = txDetails.transaction.message.accountKeys.map(k => k.toString()); const feePayer = accountKeys.length > 0 ? accountKeys[0].toLowerCase() : 'unknown_sol_feepayer'; const senderAddressForDb = feePayer.toLowerCase();
            console.log(`[SOL ${uniqueProcessingId}] Sender (DB): ${senderAddressForDb}, Time: ${new Date(timestamp).toISOString()}`);
            console.log(`[SOL ${uniqueProcessingId}] Keys:`, accountKeys); console.log(`[SOL ${uniqueProcessingId}] PreBal:`, txDetails.meta.preBalances); console.log(`[SOL ${uniqueProcessingId}] PostBal:`, txDetails.meta.postBalances); console.log(`[SOL ${uniqueProcessingId}] PreTok:`, txDetails.meta.preTokenBalances||'<N>'); console.log(`[SOL ${uniqueProcessingId}] PostTok:`, txDetails.meta.postTokenBalances||'<N>');
            let donationDetected = false; const solTreasuryIndex = accountKeys.indexOf(SOL_TREASURY_ADDRESS); console.log(`[SOL ${uniqueProcessingId}] Treasury Index: ${solTreasuryIndex}`);
            if (solTreasuryIndex !== -1) { const pre=txDetails.meta.preBalances[solTreasuryIndex]; const post=txDetails.meta.postBalances[solTreasuryIndex]; const lamports=post-pre; console.log(`[SOL ${uniqueProcessingId}] Treasury SOL Bal: Pre=${pre}, Post=${post}, Diff=${lamports}`); if (lamports > 0) { const amountSol=lamports/1e9; console.log(`[SOL] SOL Received: ${amountSol}`); donationDetected=true; const price=await getHistoricalPrice(this.coinGeckoIds.SOL,timestamp); if(price<=0){console.warn(`[SOL] Invalid SOL price.`);return;} const usdValue=amountSol*price; const points=calculatePoints(usdValue); const donationData={id:signature+'-SOL',timestamp,walletAddress:senderAddressForDb,amount:amountSol,currency:'SOL',usdValue,points,txHash:signature,chain:'SOL'}; console.log(`[SOL] Prep SOL donation:`, donationData); await this.processDonation(donationData); return; }} else { console.log(`[SOL] Treasury addr not in keys.`); }
            if (!donationDetected) { console.log(`[SOL] Check USDC SPL...`); const postUsdcB=txDetails.meta.postTokenBalances||[]; const preUsdcB=txDetails.meta.preTokenBalances||[]; const tPost=postUsdcB.find(b=>b.mint===SOL_USDC_MINT&&b.owner===SOL_TREASURY_ADDRESS); const tPre=preUsdcB.find(b=>b.mint===SOL_USDC_MINT&&b.owner===SOL_TREASURY_ADDRESS); const postUiAmt=tPost?.uiTokenAmount?.uiAmount??0; const preUiAmt=tPre?.uiTokenAmount?.uiAmount??0; const amountUsdc=postUiAmt-preUiAmt; console.log(`[SOL] Treasury USDC Bal: Pre=${preUiAmt}, Post=${postUiAmt}, Diff=${amountUsdc}`); if (amountUsdc > 0.000001) { console.log(`[SOL] USDC Received: ${amountUsdc}`); donationDetected=true; let price = await getHistoricalPrice(this.coinGeckoIds.USDC, timestamp); if(price<=0){console.warn(`[SOL] Invalid USDC price, use 1.`); price=1;} const usdValue=amountUsdc*price; const points=calculatePoints(usdValue); const donationData={id:signature+'-USDC',timestamp,walletAddress:senderAddressForDb,amount:amountUsdc,currency:'USDC',usdValue,points,txHash:signature,chain:'SOL'}; console.log(`[SOL] Prep USDC donation:`, donationData); await this.processDonation(donationData); return; } else { console.log(`[SOL] No USDC increase.`); } }
            if (!donationDetected) { console.log(`[SOL ${uniqueProcessingId}] No processable transfer found.`); }
        } catch (error) { console.error(`[SOL ${uniqueProcessingId}] CRITICAL Error processing tx ${signature}:`, error); if(error.stack){console.error(error.stack);} }
        finally { console.log(`[SOL ${uniqueProcessingId}] === Finished Tx: ${signature} ===`); this.processingTx.delete(signature); }
    }
    startSolanaListener() { /* ... same poll function calling processSolanaTransaction ... */
        if (!this.providers.sol) return console.error('[SOL Listener] Provider not initialized.'); if (this.listeners.solIntervalId) clearInterval(this.listeners.solIntervalId); console.log('[SOL Listener] Starting...');
        const pollSolana = async () => { console.log(`[SOL Listener] Polling... (Time: ${new Date().toLocaleTimeString()})`); try { const signatures = await this.providers.sol.getSignaturesForAddress(new PublicKey(SOL_TREASURY_ADDRESS), { limit: 30 }); console.log(`[SOL Listener] Found ${signatures.length} sigs.`); if (signatures.length > 0) { for (let i = signatures.length - 1; i >= 0; i--) { await this.processSolanaTransaction(signatures[i]); /* await sleep(50); Optional delay */ } } console.log('[SOL Listener] Polling finished.'); } catch (error) { console.error('[SOL Listener] Poll Error:', error); } };
        setTimeout(pollSolana, 2000); this.listeners.solIntervalId = setInterval(pollSolana, SOL_POLL_INTERVAL); console.log(`[SOL Listener] Polling started interval ${SOL_POLL_INTERVAL}ms.`);
    }
    startBitcoinListener() { /* ... same ... */
        if (!this.providers.btc) this.providers.btc = { lastSeenTxids: {} }; if (this.listeners.btcIntervalId) clearInterval(this.listeners.btcIntervalId); console.log('[BTC Listener] Starting...'); const btcAddresses = [BTC_LEGACY_ADDRESS, BTC_TAPROOT_ADDRESS, BTC_SEGWIT_ADDRESS]; const pollBitcoin = async () => { console.log('[BTC] Polling...'); for (const address of btcAddresses) { try { const url = `${BLOCKSTREAM_API}/address/${address}/txs`; console.log(`[BTC] Fetch ${address}`); const r = await fetch(url); if (!r.ok) { console.error(`[BTC] API Error ${address}: ${r.status}`); continue; } const txs = await r.json(); if (!Array.isArray(txs) || txs.length === 0) continue; console.log(`[BTC] ${txs.length} txs for ${address}.`); const currLast = this.providers.btc.lastSeenTxids[address]; const newLast = txs[0].txid; let procCnt = 0; for (let i = txs.length - 1; i >= 0; i--) { const tx = txs[i]; if (currLast && tx.txid === currLast) break; if (this.processingTx.has(tx.txid)) continue; if (await databaseService.transactionExists(tx.txid)) continue; let amtRcv = 0; tx.vout.forEach(o => { if (o.scriptpubkey_address === address) amtRcv += o.value; }); if (amtRcv > 0) { this.processingTx.add(tx.txid); procCnt++; const amtBtc = amtRcv / 1e8; const ts = (tx.status?.block_time ? tx.status.block_time * 1000 : Date.now()); const p = await getHistoricalPrice(this.coinGeckoIds.BTC, ts); let s = 'unknown_btc_sender'; const pS = new Set(tx.vin.map(v=>v.prevout?.scriptpubkey_address).filter(a=>a&&!btcAddresses.includes(a))); if (pS.size > 0) s=[...pS][0].toLowerCase(); this.processDonation({id:tx.txid, timestamp:ts, walletAddress:s, amount:amtBtc, currency:'BTC', usdValue:amtBtc*p, points:calculatePoints(amtBtc*p), txHash:tx.txid, chain:'BTC'}).finally(()=>this.processingTx.delete(tx.txid)); } } if(procCnt>0)console.log(`[BTC] Processed ${procCnt} new for ${address}.`); this.providers.btc.lastSeenTxids[address] = newLast; } catch (e) { console.error(`[BTC] Poll Error ${address}:`, e); } } }; pollBitcoin(); this.listeners.btcIntervalId = setInterval(pollBitcoin, BTC_POLL_INTERVAL); console.log('[BTC] Polling started.');
    }
    stopListening() { /* ... same ... */
        if(this.providers.eth&&this.listeners.ethProviderEvents.length>0){console.log('[Listener] Stopping ETH...');this.listeners.ethProviderEvents.forEach(([e,l])=>{try{this.providers.eth.off(e,l);}catch(err){console.warn("Err rm ETH listener:",err);}});this.listeners.ethProviderEvents=[];}
        if(this.listeners.solIntervalId){console.log('[Listener] Stopping SOL...');clearInterval(this.listeners.solIntervalId);this.listeners.solIntervalId=null;}
        if(this.listeners.btcIntervalId){console.log('[Listener] Stopping BTC...');clearInterval(this.listeners.btcIntervalId);this.listeners.btcIntervalId=null;}
        console.log('[Listener] All stopped.');
    }

    // --- Manual Verification (REVISED Structure) ---
    async verifyTransaction(txHash, currency) {
        if (!txHash || !currency) return { verified: false, message: 'Missing txHash or currency' };
        if (await databaseService.transactionExists(txHash)) return { verified: true, message: 'Transaction already verified' };
        if (this.processingTx.has(txHash)) return { verified: false, message: 'Transaction processing, please wait.' };

        console.log(`[Verify Tx] Verifying ${currency} tx: ${txHash}`);
        const upperCurrency = currency.toUpperCase().replace('_SPL', ''); // Normalize currency
        let donationData = null;

        try {
            let timestamp = Date.now(), senderAddress = 'unknown', amount = 0, price = 0, chain = 'UNKNOWN';

            // --- ETH / ERC20 ---
            if (['ETH', 'USDC', 'USDT', 'DAI'].includes(upperCurrency)) {
                if (!this.providers.eth) throw new Error('ETH provider missing'); chain = 'ETH';
                const tx = await this.providers.eth.getTransaction(txHash); if (!tx) throw new Error('Tx not found');
                const receipt = await tx.wait(); if (!receipt || receipt.status !== 1) throw new Error('Tx failed/unconfirmed');
                const block = await this.providers.eth.getBlock(receipt.blockNumber); if (!block) throw new Error('Block not found');
                timestamp = block.timestamp * 1000; senderAddress = tx.from.toLowerCase();
                if (upperCurrency === 'ETH') { if(tx.to?.toLowerCase()!==ETH_TREASURY_ADDRESS||tx.value<=0n) throw new Error('Not ETH donation'); amount=parseFloat(ethers.formatEther(tx.value)); }
                else { /* ERC20 */ const cI=ERC20_CONTRACTS[upperCurrency]; if(!cI)throw new Error(`Unsupported ERC20 ${upperCurrency}`); let fnd=false; const iface=new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]); for(const l of receipt.logs){if(l.address.toLowerCase()===cI.address&&l.topics[0]===TRANSFER_EVENT_TOPIC&&l.topics[2].toLowerCase().includes(ETH_TREASURY_ADDRESS.substring(2))){try{const pL=iface.parseLog(l);if(pL){const amtR=pL.args.value;amount=parseFloat(ethers.formatUnits(amtR,cI.decimals));if(amount>0){fnd=true;break;}}}catch(e){}}}if(!fnd)throw new Error(`${upperCurrency} transfer not found`);}
                price = await getHistoricalPrice(this.coinGeckoIds[upperCurrency], timestamp);
            }
            // --- SOL / SPL ---
            else if (['SOL', 'USDC'].includes(upperCurrency)) { // Assuming USDC means SPL USDC here
                 if (!this.providers.sol) throw new Error('SOL provider missing'); chain = 'SOL';
                 const parsedTx = await this.providers.sol.getParsedTransaction(txHash,{commitment:'confirmed',maxSupportedTransactionVersion:0}); if(!parsedTx||parsedTx.meta?.err)throw new Error('Tx failed/not found');
                 timestamp=(parsedTx.blockTime??Math.floor(Date.now()/1000))*1000; senderAddress=parsedTx.transaction.message.accountKeys[0].pubkey.toString().toLowerCase();
                 if(upperCurrency==='SOL'){const idx=parsedTx.transaction.message.accountKeys.findIndex(k=>k.pubkey.toString()===SOL_TREASURY_ADDRESS);if(idx===-1)throw new Error('Treasury not involved');const l=parsedTx.meta.postBalances[idx]-parsedTx.meta.preBalances[idx];if(l<=0)throw new Error('No SOL received');amount=l/1e9;}
                 else{/*SPL USDC*/ const postU=parsedTx.meta.postTokenBalances?.find(b=>b.mint===SOL_USDC_MINT&&b.owner===SOL_TREASURY_ADDRESS);const preU=parsedTx.meta.preTokenBalances?.find(b=>b.mint===SOL_USDC_MINT&&b.owner===SOL_TREASURY_ADDRESS);amount=(postU?.uiTokenAmount.uiAmount??0)-(preU?.uiTokenAmount.uiAmount??0);if(amount<=0.000001)throw new Error('No USDC received');}
                 price=await getHistoricalPrice(this.coinGeckoIds[upperCurrency], timestamp); if (upperCurrency === 'USDC' && price <= 0) price = 1; // Force stablecoin price
            }
            // --- BTC ---
            else if (upperCurrency === 'BTC') {
                 chain='BTC'; const r=await fetch(`${BLOCKSTREAM_API}/tx/${txHash}`); if(!r.ok)throw new Error('BTC Tx not found'); const tx=await r.json();
                 timestamp=(tx.status?.block_time?tx.status.block_time*1000:Date.now()); let sats=0; const btcAddrs=[BTC_LEGACY_ADDRESS, BTC_TAPROOT_ADDRESS, BTC_SEGWIT_ADDRESS]; tx.vout.forEach(o=>{if(btcAddrs.includes(o.scriptpubkey_address))sats+=o.value;}); if(sats<=0)throw new Error('No BTC received'); amount=sats/1e8;
                 const pS=new Set(tx.vin.map(v=>v.prevout?.scriptpubkey_address).filter(a=>a&&!btcAddrs.includes(a))); senderAddress=pS.size>0?[...pS][0].toLowerCase():'unknown_btc_sender'; price=await getHistoricalPrice(this.coinGeckoIds.BTC, timestamp);
            } else { throw new Error('Unsupported currency'); }

            // --- Create Donation Object ---
            if (amount <= 0 || price <= 0) throw new Error(`Invalid amount (${amount}) or price (${price}) calculated.`);
            const usdValue = amount * price; const points = calculatePoints(usdValue);
            donationData = { id: txHash + '-' + upperCurrency, timestamp, walletAddress: senderAddress, amount, currency: upperCurrency, usdValue, points, txHash, chain };

            // --- Process Donation ---
            await this.processDonation(donationData);

            // Final check if added
            if (await databaseService.transactionExists(txHash)) {
                return { verified: true, message: 'Transaction verified successfully', donation: donationData };
            } else {
                throw new Error('Verification OK but failed to store donation in DB.');
            }

        } catch (error) {
            console.error(`[Verify Tx] Error verifying ${txHash} (${currency}):`, error);
            return { verified: false, message: `Verification failed: ${error.message}` };
        }
    } // End verifyTransaction

} // End BlockchainListenerService class

const blockchainListenerService = new BlockchainListenerService();
export default blockchainListenerService;
