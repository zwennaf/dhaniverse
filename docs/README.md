# Dhaniverse Documentation

## Project Overview

Dhaniverse is a comprehensive web3 gaming platform that combines financial education with immersive 2D RPG gameplay. Built with modern web technologies and blockchain integration, it provides a gamified approach to learning personal finance, investing, and money management skills.

### Key Features

- **2D Open-World RPG**: Built with Phaser.js for engaging gameplay experiences
- **Financial Education**: Interactive simulations for banking, stock trading, and investment learning
- **Blockchain Integration**: ICP (Internet Computer Protocol) integration for tamper-proof financial records
- **Real-time Multiplayer**: WebSocket-based multiplayer functionality with chat systems
- **Progressive Web App**: Modern React-based frontend with TypeScript
- **Scalable Backend**: Deno-powered server infrastructure with MongoDB integration

### Architecture Components

- **Frontend**: React.js with TypeScript, Phaser.js game engine, Tailwind CSS
- **Backend**: Deno runtime with Oak framework, MongoDB database
- **Blockchain**: ICP canisters written in Rust for decentralized features
- **Real-time**: WebSocket servers for multiplayer and chat functionality
- **Optimization**: Custom map optimization package for performance

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture Components](#architecture-components)
- [Documentation Structure](#documentation-structure)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Support](#support)
- [Version Information](#version-information)

## Documentation Structure

This documentation is organized into the following sections:

### [Architecture](./architecture/)
System design, component relationships, and technical architecture documentation.

- [System Architecture](./architecture/system-architecture.md) - High-level system design and component overview
- [Data Flow](./architecture/data-flow.md) - Data flow between components and services
- [Security Architecture](./architecture/security-architecture.md) - Security measures and authentication
- [Technology Stack](./architecture/technology-stack.md) - Technology choices and rationale

### [API Documentation](./api/)
Complete API reference for all services and endpoints.

- [ICP Canister API](./api/icp-canister.md) - Rust canister methods and blockchain integration
- [Game Server API](./api/game-server.md) - Deno server REST endpoints and authentication
- [WebSocket API](./api/websocket.md) - Real-time communication protocols and message formats
- [Frontend APIs](./api/frontend-apis.md) - React service APIs and component interfaces

### [Setup & Configuration](./setup/)
Environment setup, installation, and configuration guides.

- [Prerequisites](./setup/prerequisites.md) - System requirements and dependencies
- [Local Setup](./setup/local-setup.md) - Development environment setup guide
- [Configuration](./setup/configuration.md) - Environment variables and configuration files
- [Troubleshooting](./setup/troubleshooting.md) - Common setup issues and solutions

### [Development](./development/)
Development workflows, testing, and coding standards.

- [Development Workflow](./development/development-workflow.md) - Git workflow and development processes
- [Testing](./development/testing.md) - Testing strategies and procedures
- [Coding Standards](./development/coding-standards.md) - Code style and best practices
- [Debugging](./development/debugging.md) - Debugging guides and tools

### [Deployment](./deployment/)
Deployment procedures and operations documentation.

- [Local Deployment](./deployment/local-deployment.md) - Local deployment procedures
- [Production Deployment](./deployment/production-deployment.md) - Production deployment guide
- [Monitoring](./deployment/monitoring.md) - Monitoring and maintenance procedures
- [Scaling](./deployment/scaling.md) - Performance and scaling considerations

### [Components](./components/)
Detailed documentation for individual system components.

- [Game Engine](./components/game-engine.md) - Phaser.js integration and game systems
- [Blockchain Integration](./components/blockchain-integration.md) - ICP and Web3 functionality
- [UI Components](./components/ui-components.md) - React component library documentation
- [Map Optimizer](./components/map-optimizer.md) - Map optimization package architecture

## Quick Start

1. **New to the project?** Start with [Prerequisites](./setup/prerequisites.md) and [Local Setup](./setup/local-setup.md)
2. **Looking for APIs?** Check the [API Documentation](./api/) section
3. **Want to contribute?** Read the [Development Workflow](./development/development-workflow.md) and [Coding Standards](./development/coding-standards.md)
4. **Deploying the application?** Follow the [Deployment](./deployment/) guides
5. **Understanding the architecture?** Review the [Architecture](./architecture/) documentation

## Project Structure

```
dhaniverse/
├── packages/                    # Modular packages
│   ├── map-optimizer/          # High-performance map optimization
│   └── icp-canister/           # ICP blockchain integration
├── src/                        # Game client source
│   ├── game/                   # Game engine and systems
│   ├── ui/                     # React UI components
│   └── services/               # Frontend services
├── server/                     # Backend services
│   ├── game/                   # Game server (Deno)
│   └── ws/                     # WebSocket server
├── public/                     # Static assets
└── docs/                       # This documentation
```

## Contributing

We welcome contributions to both the codebase and documentation. Please read our [Development Workflow](./development/development-workflow.md) and [Coding Standards](./development/coding-standards.md) before contributing.

## Support

For technical support or questions about the documentation:

1. Check the [Troubleshooting](./setup/troubleshooting.md) guide
2. Review the relevant component documentation
3. Search existing issues in the project repository
4. Create a new issue with detailed information about your problem

## Version Information

- **Current Version**: 0.0.0
- **Node.js**: 18+ required
- **Deno**: 1.40+ required
- **TypeScript**: 5.8+
- **React**: 19.1+

## Additional Resources

### Development Resources
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute to the project
- [Changelog](./CHANGELOG.md) - Version history and changes
- [GitHub Repository](https://github.com/Gursimrxn/dhaniverse) - Source code and issues

### External Documentation
- [Internet Computer Documentation](https://internetcomputer.org/docs/current/developer-docs/)
- [Phaser.js Documentation](https://phaser.io/phaser3/documentation)
- [React Documentation](https://react.dev/)
- [Deno Documentation](https://deno.land/manual)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Community and Support
- [Discord Community](https://discord.gg/dhaniverse) - Join our community
- [GitHub Discussions](https://github.com/Gursimrxn/dhaniverse/discussions) - Community discussions
- [Issue Tracker](https://github.com/Gursimrxn/dhaniverse/issues) - Bug reports and feature requests

---

*This documentation is maintained alongside the codebase and is updated with each release. For the most current information, always refer to the latest version in the main branch.*