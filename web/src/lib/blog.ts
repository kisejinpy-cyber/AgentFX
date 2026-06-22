export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  content: string;
  author: string;
  publishedDate: string;
  updatedDate: string;
  category: string;
  readTime: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'stablecoin-gas-abstraction',
    title: 'Understanding Stablecoin Gas Abstraction on Arc Network',
    description: 'Learn how gas-abstracted USDC settlements streamline international trade, lower B2B payment costs, and improve transaction speed on the Arc Network.',
    keywords: ['gas abstraction', 'stablecoin settlement', 'USDC gas', 'Arc Network', 'B2B payment infrastructure'],
    author: 'Elena Rostova',
    publishedDate: '2026-05-12',
    updatedDate: '2026-06-20',
    category: 'Protocol Tech',
    readTime: '5 min read',
    content: `
      <h2>The Problem with Traditional On-Chain Gas Fees</h2>
      <p>Historically, conducting B2B transactions on public blockchains required holding the network's native utility token (like ETH or MATIC) just to pay for gas fees. For businesses and autonomous AI agents, this creates friction: it forces them to hold volatile assets and complicates accounting reports.</p>
      
      <h2>Enter Gas-Abstracted USDC</h2>
      <p>By leveraging the Arc Network where USDC acts as the native gas token, Meridian abstracts gas fees entirely. Under EIP-5792, transactions are batched, allowing agents to execute complex escrow deployments and multi-route transfers with zero ETH requirements. Fees are deducted directly from the transacted stablecoin balance, creating a predictable, predictable transaction cost model.</p>
      
      <h2>Key Business Advantages</h2>
      <ul>
        <li><strong>Simplified Treasury Management:</strong> No need to maintain token gas reserves across dozens of EVM wallets.</li>
        <li><strong>Reduced Volatility Risk:</strong> Operational costs are calculated purely in fiat-pegged stablecoins.</li>
        <li><strong>Sub-second Speed:</strong> Arc provides instant next-block finality, resolving transactions in under 0.8 seconds.</li>
      </ul>
    `
  },
  {
    slug: 'autonomous-ai-escrow',
    title: 'How Autonomous AI Swarms Govern Smart Escrows',
    description: 'Explore the consensus mechanisms of Coordinate, Logistics, Compliance, and Treasury AI agents in verifying carrier cargo deliveries and releasing escrow payments.',
    keywords: ['AI agents escrow', 'autonomous settlement', 'DeepSeek AI swarm', 'carrier API oracle', 'sanctions check'],
    author: 'Dr. Marcus Vance',
    publishedDate: '2026-05-28',
    updatedDate: '2026-06-22',
    category: 'Artificial Intelligence',
    readTime: '7 min read',
    content: `
      <h2>The Concept of Agentic Settlement Layers</h2>
      <p>Escrows have traditionally depended on centralized third-parties or manual dispute resolution. Meridian introduces an AI agent swarm that acts as a decentralized jury, auditing and releasing funds based on cryptographically verifiable off-chain data.</p>
      
      <h2>The Swarm Workflow</h2>
      <p>Four specialized agents cooperate to handle each settlement cycle:</p>
      <ol>
        <li><strong>Compliance Auditor:</strong> Screens the buyer and seller wallet addresses against global sanctions watchlists (OFAC, Circle AML) in real-time.</li>
        <li><strong>Logistics Oracle:</strong> Calls carrier API endpoints (DHL, FedEx, etc.) to verify physical package coordinates and receipt signatures.</li>
        <li><strong>Coordinator Agent:</strong> Aggregates reports and coordinates consensus validation.</li>
        <li><strong>Treasury Settler:</strong> Calls Circle Developer-Controlled Wallets to execute the stablecoin payout trigger once delivery is confirmed.</li>
      </ol>
      
      <h2>Mitigating False Releases</h2>
      <p>By requiring multi-agent cryptographic consensus and oracle checks, Meridian eliminates unilateral failures and ensures escrows are only released when compliance and logistics are 100% verified.</p>
    `
  },
  {
    slug: 'circle-programmable-wallets',
    title: 'Integrating Circle SDK for High-Frequency B2B Settlements',
    description: 'A developer guide on utilizing Circle App Kit and Developer-Controlled Wallets to automate token swaps, native bridging, and cross-chain stablecoin routing.',
    keywords: ['circle programmable wallets', 'circle app kit', 'CCTP bridge', 'multi-chain routing', 'developer-controlled wallets'],
    author: 'Takahiro Sato',
    publishedDate: '2026-06-15',
    updatedDate: '2026-06-15',
    category: 'Developer Guide',
    readTime: '6 min read',
    content: `
      <h2>Circle Developer Suite Overview</h2>
      <p>Automating transactions requires secure wallet custody. Circle's Developer-Controlled Wallets allow applications to manage API-driven transactions without manual seed phrase entry, maintaining strict tenant separation via entity secret encryption.</p>
      
      <h2>Implementing the Cross-Chain Routing</h2>
      <p>Using the Circle App Kit SDK, developers can route USDC across EVM chains and Solana. If a shipper wants payment on Base but the buyer's treasury is locked on Arbitrum, App Kit seamlessly bridges the assets via Cross-Chain Transfer Protocol (CCTP) and completes the deposit in one atomic pipeline.</p>
      
      <h2>Code Example: Spawning a Programmatic Wallet</h2>
      <pre><code>const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

const walletSet = await client.createWalletSet({
  name: "Meridian Escrows Set",
});</code></pre>
      <p>This simple setup abstracts complex cryptographic node administration into standard REST endpoints, allowing devs to scale their B2B payment pipelines instantly.</p>
    `
  }
];
