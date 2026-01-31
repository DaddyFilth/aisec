# Dependency Quick Reference

Quick reference card for dependency management commands.

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run deps:check` | Check for outdated packages |
| `npm run deps:audit` | Run security audit |
| `npm run deps:audit:fix` | Auto-fix security vulnerabilities |
| `npm run deps:update` | Update patch versions safely |
| `npm run deps:update:interactive` | Choose packages to update interactively |
| `npm run deps:update:minor` | Update to latest minor versions |
| `npm run deps:update:latest` | Update to latest versions (including major) ⚠️ |
| `npm run deps:clean` | Clean install (removes node_modules) |

## Automated Updates

### Dependabot
- Runs **weekly on Mondays at 9:00 AM UTC**
- Creates automated PRs for updates
- Groups minor/patch updates together
- Covers: npm, Gradle, GitHub Actions

### GitHub Actions Workflow
- **Automated**: Runs weekly, checks dependencies
- **Manual**: Can be triggered from Actions tab
  - Go to: Actions → Dependency Management → Run workflow
  - Choose: check, update-patch, update-minor, or audit-fix

## Best Practices

✅ **DO:**
- Review dependency updates before merging
- Test after updating
- Address security issues promptly
- Update regularly

❌ **DON'T:**
- Skip testing after updates
- Ignore breaking changes in major updates
- Manually edit package-lock.json
- Let dependencies get too outdated

## Common Workflows

### Check for Updates
```bash
npm run deps:check
```

### Fix Security Issues
```bash
npm run deps:audit:fix
```

### Safe Updates (Patch Only)
```bash
npm run deps:update
```

### Interactive Update
```bash
npm run deps:update:interactive
```

### Clean Install
```bash
npm run deps:clean
```

## Getting Help

See [DEPENDENCY_MANAGEMENT.md](DEPENDENCY_MANAGEMENT.md) for detailed documentation.

---

**Remember:** Always test after updating dependencies!
