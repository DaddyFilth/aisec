# Contributing to AI Secretary

Thank you for your interest in contributing to AI Secretary! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue using the bug report template. Include:
- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your environment (OS, browser, version)

### Suggesting Features

We welcome feature suggestions! Please create a feature request issue with:
- Clear description of the feature
- Use cases and benefits
- Any implementation ideas you might have

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes**:
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation as needed
3. **Test your changes**:
   - Run `npm run build` to ensure it builds successfully
   - Test the application with `npm run dev`
   - Verify TypeScript types with `npx tsc --noEmit`
4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference issue numbers if applicable
5. **Submit a pull request**:
   - Provide a clear description of changes
   - Link to related issues
   - Include screenshots for UI changes

## Development Setup

1. Clone the repository
2. Navigate to the project directory: `cd aisec`
3. Install dependencies: `npm install`
4. Copy `.env.local.example` to `.env.local` and update your Ollama host/model
5. Start development server: `npm run dev`

**Note:** All npm commands must be run from the project root directory (where `package.json` is located).

## Dependency Management

We use automated tools to keep dependencies up to date:
- **Dependabot** creates automated PRs for dependency updates
- **GitHub Actions** runs weekly dependency checks
- Manual update scripts are available in `package.json`

For detailed information about managing dependencies, see [DEPENDENCY_MANAGEMENT.md](docs/DEPENDENCY_MANAGEMENT.md).

**Quick commands:**
- Check for updates: `npm run deps:check`
- Security audit: `npm run deps:audit`
- Fix vulnerabilities: `npm run deps:audit:fix`
- Update dependencies: `npm run deps:update`

Always test after updating dependencies!

## Code Style

- Use TypeScript for type safety
- Follow React best practices and hooks guidelines
- Use functional components with hooks
- Keep functions focused and modular
- Add JSDoc comments for complex functions

## Testing

- Manually test all changes before submitting
- Ensure microphone permissions work correctly
- Test with different browsers if possible
- Verify responsive design on different screen sizes

## Questions?

Feel free to open an issue for any questions about contributing!
