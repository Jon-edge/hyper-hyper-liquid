<h2 align="center">⚠️ 👷🏻 THIS IS A WORK IN PROGRESS! 🚧 ⚠️</h2>

## Hyper-Hyperliquid: Enhanced Trading Interface

A modern, feature-rich trading interface for the Hyperliquid protocol, designed for improved usability and real-time data visualization.

## Demo

[Live Demo](https://hyper-hyper-liquid.vercel.app/)

![Trading Interface Screenshot](https://github.com/user-attachments/assets/d16b2978-6cad-446d-bc73-a371731dec64)

## Features

### Account Management
- **MetaMask Integration**: Seamless wallet connection and authentication
- **Privacy Controls**: Toggle visibility of sensitive account information with eye icon
- **Real-time Account Metrics**:
  - Account Value
  - Withdrawable Balance
  - Total Unrealized PNL
  - Cross Account Leverage
  - Cross Margin Ratio
  - Total Notional Position

### Interface
- **Live Position Tracking**: Real-time updates of all open positions
- **Connection Status**: Display connection status, reconnection attempts, and received data ticks
- **Dynamic Mid Price Updates**: Live market data without interrupting user interactions
- **Customizable Position Table**:
  - Drag-and-drop column reordering
  - Persistent column ordering across sessions
  - Comprehensive position metrics (size, value, PNL, etc.)

### Technical Features
- **WebSocket Integration**: Real-time data streaming with robust connection handling
- **Responsive Design**: Optimized for both desktop and (soon) mobile viewing
- **Structured Logging**: Comprehensive event tracking with timestamps for debugging

### Roadmap

- Order interface
- Order History
- Order alerts (email, telegram)
- Chart based on Hyperliquid candle data
- Positions and orders on chart
- Execute on Tradingview Signals
- Add mobile support

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/Jon-edge/hyper-hyper-liquid.git
cd hyper-hyperliquid

# Install dependencies
npm install
# or
yarn install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technology Stack

- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS with custom theme system
- **State Management**: React Context API
- **Data Fetching**: WebSocket API for real-time updates
- **Wallet Integration**: MetaMask via ethers.js

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
