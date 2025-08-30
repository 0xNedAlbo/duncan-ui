# coinflakes-v2-ui

This repository contains the user interface for the Coinflakes Vault v2. This project provides a front-end application built with Next.js, designed to interact with the Coinflakes Vault v2 smart contracts.

## Table of Contents

- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Development Server](#running-the-development-server)
- [Building for Production](#building-for-production)
- [Running the Production Server](#running-the-production-server)
- [Generating Code with wagmi.config.ts](#generating-code-with-wagmiconfigts)
- [License](#license)

## Installation

To get started, clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/coinflakes-v2-ui.git
cd coinflakes-v2-ui
npm install
```

## Environment Setup

The project uses environment variables stored in `.env.production` and `.env.development` files. These files need to be configured based on the provided `.env.example` file.

1. Copy `.env.example` to create `.env.development` and `.env.production`:

   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   ```

2. Open the `.env.development` and `.env.production` files and modify the variables according to your environment needs.

## Generating Code with wagmi.config.ts

The project includes a `wagmi.config.ts` file that automatically generates code necessary for interacting with the blockchain. To generate the code, run:

```bash
# Generates code at src/generated
npx wagmi generate
```

Ensure that you run this command whenever you make changes to the configuration or need to update the generated code. The
generated code is not part of the git repo.

## Running the Development Server

To start the development server, run:

```bash
npm run dev
```

This command starts a local development server on `http://localhost:3000`. The server will automatically reload if you make changes to the code.

## Setup the test environment

There are some useful tools to setup a development environment. 

Use Chrome as a browser and create a user profile "Web3DebugProfile". 

Install Metamask or Rabby and add an account with the privte key
`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`. This is the first test account with the local blockchain of Hardhat or Anvil. 

There is a launch configuration for Visual Studio Code at `.vscode/launch.json` which starts a debug session in Chrome.

Install foundry from https://getfoundry.sh.

In the `tools` directory are some scripts to get started:

The following command starts a mainnet fork with a block time of 5 seconds which simulates a EVM blockchain.

```bash
./source/startLocalhost.sh
```

This command adds some DAI to the test account to help testing the UI:

```bash
./source/fundAccount.sh
```
(The script uses a whale account to transfer DAI to the test account. Hopefully he/she does not run out of DAI any time soon...)

## Building for Production

To build the project for production, run:

```bash
npm run build
```

This command compiles your application for production use.

## Running the Production Server

After building the project, you can start the production server using:

```bash
npm run start
```

This will serve the production build on `http://localhost:3000`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
