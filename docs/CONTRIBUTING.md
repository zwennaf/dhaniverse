# Contributing to Dhaniverse

At this time, Dhaniverse does not accept external pull requests. Players and external users are welcome to open issues.

This repository is publicly visible for transparency and evaluation purposes, but the codebase is proprietary (see [LICENSE](../LICENSE)).

Important:
- Players/external users: issues are welcome for bug reports and feedback. Please do not submit pull requests—PRs are limited to the core team and will be closed.
- For partnerships/licensing conversations, contact the maintainer.

If you’re interested in collaboration, partnerships, or discussing licensing, please reach out to the maintainer directly.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Component-Specific Guidelines](#component-specific-guidelines)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please treat all community members with respect and professionalism.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing private information without permission
- Any conduct that would be inappropriate in a professional setting

## Getting Started (Core Team Only)

### Prerequisites

Before contributing, ensure you have the required development environment set up:

- Node.js 18 or higher
- Deno 1.40 or higher
- Git for version control
- Code editor with TypeScript support

### Initial Setup

1. Clone the repository locally (core team access):
   ```bash
   git clone https://github.com/Gursimrxn/dhaniverse.git
   cd dhaniverse
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables:
   ```bash
   cp server/game/.env.example server/game/.env
   cp server/ws/.env.example server/ws/.env
   ```
5. Start the development environment:
   ```bash
   npm run dev
   ```

## Development Workflow (Core Team Only)

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: New features (`feature/user-authentication`)
- **bugfix/**: Bug fixes (`bugfix/websocket-connection`)
- **hotfix/**: Critical production fixes (`hotfix/security-patch`)

### Workflow Steps

1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards

3. Write or update tests for your changes

4. Update documentation if necessary

5. Commit your changes with descriptive messages:
   ```bash
   git commit -m "feat: add user authentication system"
   ```

6. Push your branch and create a pull request to the private internal review process

### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): implement JWT authentication
fix(websocket): resolve connection timeout issues
docs(api): update ICP canister documentation
```

## Coding Standards (Core Team Only)

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define explicit types for all function parameters and return values
- Use interfaces for object shapes
- Prefer `const` assertions for immutable data
- Use meaningful variable and function names

### React Guidelines

- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices for performance
- Use TypeScript for all component props
- Implement accessibility features (ARIA labels, keyboard navigation)

### Rust Guidelines (ICP Canisters)

- Follow Rust naming conventions
- Use proper error handling with `Result` types
- Document all public functions
- Implement comprehensive unit tests
- Use `candid` for interface definitions

### General Guidelines

- Maximum line length: 100 characters
- Use 2 spaces for indentation
- Remove trailing whitespace
- End files with a newline
- Use meaningful comments for complex logic

## Testing Requirements (Core Team Only)

### Frontend Testing

- Unit tests for utility functions
- Component tests for React components
- Integration tests for service interactions
- End-to-end tests for critical user flows

### Backend Testing

- Unit tests for all service functions
- Integration tests for API endpoints
- WebSocket connection testing
- Database operation testing

### Blockchain Testing

- Unit tests for canister methods
- Integration tests for cross-canister calls
- Security testing for authentication flows

### Running Tests

```bash
# Frontend tests
npm run test

# Backend tests
cd server/game && deno test

# ICP canister tests
cd packages/icp-canister && cargo test
```

## Documentation Standards

### Code Documentation

- Document all public APIs
- Include usage examples for complex functions
- Explain the purpose and behavior of components
- Document configuration options and environment variables

### README Updates

- Update relevant README files when adding features
- Include setup instructions for new dependencies
- Document new environment variables or configuration

### API Documentation

- Document all endpoints with parameters and responses
- Include authentication requirements
- Provide example requests and responses
- Document error codes and handling

## Pull Request Process (Core Team Only)

### Before Submitting

1. Ensure all tests pass
2. Update documentation as needed
3. Verify code follows style guidelines
4. Test your changes locally
5. Rebase your branch on the latest `develop`

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one code review required
3. Documentation review for significant changes
4. Security review for authentication/authorization changes

## Issue Reporting

Players/external users: issues are welcome. Please provide clear reproduction steps, your browser/OS, and screenshots or screen recordings when possible. For security concerns, contact via GitHub (see LICENSE contact) and avoid public issue threads.

Core team: follow the internal triage workflow and labels.

### Bug Reports (Core Team)

Include the following information:

- **Environment**: OS, browser, Node.js version
- **Steps to Reproduce**: Detailed steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Additional Context**: Any relevant information

### Feature Requests (Core Team)

Include the following information:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives Considered**: Other approaches considered
- **Additional Context**: Use cases, examples

## Component-Specific Guidelines (Core Team Only)

### Game Engine (Phaser.js)

- Follow Phaser.js best practices
- Optimize for performance (60 FPS target)
- Implement proper asset loading and cleanup
- Use object pooling for frequently created objects

### Blockchain Integration (ICP)

- Follow ICP development best practices
- Implement proper error handling for network issues
- Use efficient data structures for on-chain storage
- Test thoroughly on local replica before deployment

### Map Optimizer Package

- Maintain backward compatibility
- Optimize for memory usage and loading speed
- Document performance characteristics
- Include benchmarks for significant changes

### UI Components

- Follow accessibility guidelines (WCAG 2.1)
- Implement responsive design
- Use consistent styling patterns
- Test across different browsers and devices

## Getting Help (Core Team & Internal)

If you need help with contributing:

1. Check the [documentation](./README.md)
2. Use internal channels for questions and reviews
3. Contact maintainers directly for complex questions

## Recognition (Internal)

Core team contributions are recognized internally (release notes, docs acknowledgements, and internal announcements).

Thank you for contributing to Dhaniverse and helping make financial education more accessible and engaging!