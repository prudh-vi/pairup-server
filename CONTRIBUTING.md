# Contributing to PairUp

First off, thank you for considering contributing to PairUp! 🎉

## 🌟 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/prudh-vi/pairup-server/issues) to avoid duplicates.

**When filing a bug report, please include:**

- Clear and descriptive title
- Steps to reproduce the behavior
- Expected behavior
- Screenshots (if applicable)
- Environment details (OS, browser, versions)
- Console logs/error messages

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- Clear and descriptive title
- Detailed description of the proposed feature
- Why this enhancement would be useful
- Possible implementation approach

### Pull Requests

1. **Fork** the repository
2. **Create** a new branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
6. **Push** to your fork (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

## 📝 Development Guidelines

### Code Style

- Use **TypeScript** for all new code
- Follow existing code formatting (Prettier config)
- Add comments for complex logic
- Write descriptive variable names

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add screen sharing support
fix: resolve WebRTC connection timeout
docs: update deployment instructions
style: format code with prettier
refactor: simplify matchmaking logic
test: add unit tests for socket handlers
chore: update dependencies
```

### Testing

- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices
- Verify P2P and TURN connections
- Check for memory leaks on long sessions

### Documentation

- Update README.md if adding features
- Add JSDoc comments for functions
- Update API documentation if changing backend

## 🏗 Project Structure

```
pairup-server/
├── src/
│   ├── index.ts          # Server entry point
│   ├── socket/           # Socket.IO handlers
│   ├── matchmaking/      # Matching logic
│   └── types/            # TypeScript types
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utility functions
│   └── public/
├── scripts/              # Deployment scripts
└── docs/                 # Documentation
```

## 🤝 Code of Conduct

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

## ❓ Questions?

Feel free to open an issue with the `question` label or reach out directly!

Thank you for contributing! 🚀
