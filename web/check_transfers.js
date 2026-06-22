const { createPublicClient, http, parseAbiItem } = require('viem');

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

async function check() {
  const address = '0x1087E71CD83101adF154d8215522EadA51Bf891E';
  const client = createPublicClient({ chain: ARC_TESTNET, transport: http() });

  console.log(`Checking USDC transfers to ${address} from block 0...`);
  try {
    const logsTo = await client.getLogs({
      address: '0x3600000000000000000000000000000000000000',
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
      args: {
        to: address,
      },
      fromBlock: 0n,
    });
    console.log(`Incoming transfers found: ${logsTo.length}`);
    for (const log of logsTo) {
      const { from, to, value } = log.args;
      console.log(`[INCOMING] Tx: ${log.transactionHash} | From: ${from} | Value: ${Number(value) / 1e6} USDC | Block: ${log.blockNumber}`);
    }
  } catch (e) {
    console.error(`Error querying incoming: ${e.message}`);
  }

  console.log(`Checking USDC transfers from ${address} from block 0...`);
  try {
    const logsFrom = await client.getLogs({
      address: '0x3600000000000000000000000000000000000000',
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
      args: {
        from: address,
      },
      fromBlock: 0n,
    });
    console.log(`Outgoing transfers found: ${logsFrom.length}`);
    for (const log of logsFrom) {
      const { from, to, value } = log.args;
      console.log(`[OUTGOING] Tx: ${log.transactionHash} | To: ${to} | Value: ${Number(value) / 1e6} USDC | Block: ${log.blockNumber}`);
    }
  } catch (e) {
    console.error(`Error querying outgoing: ${e.message}`);
  }
}

check().catch(console.error);
