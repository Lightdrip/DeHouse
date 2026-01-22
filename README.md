# DeHouse - Web3 Crypto Donation Platform

DeHouse is a modern, decentralized web application designed to revolutionize charitable giving through blockchain technology. By leveraging the transparency and efficiency of Web3, DeHouse enables seamless cryptocurrency donations, ensuring that funds reach those in need with minimal friction.

The project provides a secure, accessible, and user-friendly interface for donors to contribute using major cryptocurrencies like Bitcoin (BTC), Ethereum (ETH), Solana (SOL), and USDC.

## 🚀 Key Objectives
- **Transparency**: Utilize blockchain technology to provide verifiable donation trails.
- **Accessibility**: Ensure the platform is usable by everyone, adhering to WCAG 2.1 AA standards.
- **Efficiency**: Reduce transaction costs and processing times compared to traditional banking systems.
- **Multi-Chain Support**: Facilitate donations across multiple blockchain networks.

---

## 🛠 Installation Instructions

Follow these steps to set up the project locally on your machine.

### Prerequisites
- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **Git**: Latest version

### Step-by-Step Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Lightdrip/DeHouse.git
   cd DeHouse
   ```

2. **Install Dependencies**
   Install the necessary project dependencies using npm:
   ```bash
   npm install
   ```

3. **Environment Configuration**
   If applicable, create a `.env` file in the root directory and add your specific environment variables (e.g., RPC endpoints, API keys).
   ```bash
   # Example .env
   # REACT_APP_RPC_URL=your_rpc_url_here
   ```

---

## 📖 Usage Guide

Once installed, you can run the project locally.

### Development Server
To start the application in development mode with hot-reloading:
```bash
npm start
# OR
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) (or the port specified in your terminal) to view it in the browser.

### Production Build
To build the app for production deployment:
```bash
npm run build
```
This builds the app for production to the `dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

### Running Tests
To launch the test runner:
```bash
npm test
```

---

## ✨ Features

- **Multi-Currency Support**: Accept donations in Bitcoin (BTC), Ethereum (ETH), Solana (SOL), and USDC.
- **Smart Navigation**: Smooth scrolling functionality that links donation buttons directly to their respective crypto wallets/sections.
- **Responsive Design**: Fully optimized UI that adapts seamlessly to desktop, tablet, and mobile devices.
- **Accessibility First**: Designed with WCAG 2.1 AA compliance in mind, featuring high-contrast text and keyboard-navigable elements.
- **Web3 Integration**: Built with `ethers.js`, `web3.js`, and `@solana/web3.js` for robust blockchain interactions.
- **Modern UI/UX**: Styled with `styled-components` for a consistent and polished visual experience.

---

## 🤝 Contribution Guidelines

We welcome contributions from the community! To contribute:

1. **Fork the Project**: Create your own copy of the repository.
2. **Create a Branch**:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit Your Changes**:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the Branch**:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**: Submit your changes for review.

### Code Style
- Ensure code follows the existing React and Styled Components patterns.
- Write clear, descriptive commit messages.
- Add comments for complex logic.

---

## 📄 License Information

This project is licensed under the **MIT License**.

Copyright (c) 2026 Lightdrip

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

---

## 📞 Contact & Support

If you have any questions, run into issues, or want to suggest enhancements, please feel free to reach out.

- **Project Maintainer**: Lightdrip
- **GitHub**: [Lightdrip/DeHouse](https://github.com/Lightdrip/DeHouse)
- **Issues**: [Report a Bug](https://github.com/Lightdrip/DeHouse/issues)

For immediate support, please open an issue in the repository.
