# Fix Plan: GitHub Actions CI Failure - Lockfile Sync Issue

## Overview
The GitHub Actions CI is failing at the dependency installation step with the error "lockfile had changes, but lockfile is frozen". This is caused by uncommitted changes to bun.lock after adding wav-related packages for audio functionality.

## Root Cause Analysis

### 1. **Primary Issue**
- **Error**: `bun install --frozen-lockfile` fails in CI
- **Cause**: The `package.json` contains dependencies (`wav` and `@types/wav`) that are not reflected in the committed `bun.lock` file
- **Impact**: CI cannot install dependencies, blocking all builds and deployments

### 2. **Timeline of Events**
```
1. Audio feature development added wav packages to package.json
2. Local bun.lock was updated but not committed
3. Code was pushed without the updated lockfile
4. CI fails on every subsequent run
```

### 3. **Verification**
- Confirmed `wav` package is actively used in `/src/tools/mouth/utils/audio-storage.ts`
- The packages are legitimate dependencies, not accidental additions
- This is NOT related to recent test mock fixes - it's a separate issue

## Implementation Approaches

### Approach 1: Update and Commit Lockfile (Recommended)
**Pros:**
- Quick fix that resolves the immediate CI issue
- Preserves the audio functionality that depends on wav packages
- Standard practice for dependency management

**Cons:**
- Adds new dependencies to the project
- Increases bundle size slightly

**Implementation:**
1. Run `bun install` to update lockfile
2. Verify lockfile changes are minimal
3. Test with `bun install --frozen-lockfile`
4. Commit and push the updated lockfile

### Approach 2: Remove Unused Dependencies
**Pros:**
- Keeps dependencies minimal
- Reduces bundle size

**Cons:**
- Would break audio functionality
- Not applicable since packages are actually used

## Recommended Solution: Approach 1

## Implementation Steps

### Phase 1: Fix Lockfile Sync
```bash
# 1. Ensure clean working directory
git stash push -m "Temporary stash for lockfile fix"

# 2. Update lockfile
bun install

# 3. Verify the changes
git diff bun.lock

# 4. Test frozen lockfile works
rm -rf node_modules
bun install --frozen-lockfile

# 5. Run tests to ensure everything works
bun test
```

### Phase 2: Commit and Push Fix
```bash
# 1. Stage only the lockfile
git add bun.lock

# 2. Create commit
git commit -m "fix(deps): sync bun.lock with package.json for wav dependencies"

# 3. Push to trigger CI
git push origin main
```

### Phase 3: Verify CI Success
1. Monitor GitHub Actions run
2. Confirm all jobs pass
3. Verify deployment succeeds if configured

## Testing Strategy

### Local Validation
- [ ] Run `bun install` successfully
- [ ] Run `bun install --frozen-lockfile` successfully
- [ ] Execute `bun test` with all tests passing
- [ ] Build project with `bun run build`

### CI Validation
- [ ] GitHub Actions workflow completes successfully
- [ ] All test jobs pass
- [ ] Release job runs if applicable

## Risk Mitigation

### Potential Risks
1. **Risk**: Large lockfile changes might indicate other issues
   - **Mitigation**: Review diff carefully, ensure only wav-related changes

2. **Risk**: Tests might fail after dependency update
   - **Mitigation**: Run full test suite locally before pushing

3. **Risk**: Version conflicts with existing dependencies
   - **Mitigation**: Check for peer dependency warnings during install

### Rollback Plan
If issues arise after the fix:
```bash
git revert HEAD
git push origin main
```

## Prevention Strategies

### For Future Development
1. **Pre-commit Hook**: Add a git hook to verify lockfile sync
   ```bash
   # .git/hooks/pre-commit
   if git diff --cached --name-only | grep -q "package.json"; then
     echo "package.json modified, ensuring lockfile is updated..."
     bun install
     git add bun.lock
   fi
   ```

2. **CI Enhancement**: Add a separate job to check lockfile sync
   ```yaml
   - name: Check lockfile sync
     run: |
       bun install
       git diff --exit-code bun.lock
   ```

3. **Developer Guidelines**: Update CONTRIBUTING.md
   - Always run `bun install` after modifying package.json
   - Include bun.lock in commits when adding/removing dependencies
   - Run `bun install --frozen-lockfile` before pushing

## Monitoring

### Success Metrics
- CI build time returns to normal (~2-3 minutes)
- All GitHub Actions checks pass
- No dependency-related errors in production

### Post-Fix Verification
1. Check next 3 CI runs for stability
2. Monitor error logs for dependency issues
3. Verify audio features work correctly

## Timeline
- **Immediate**: Fix lockfile sync (5 minutes)
- **Short-term**: Add prevention measures (30 minutes)
- **Long-term**: Update developer documentation (1 hour)

## TODO Checklist
- [ ] Update bun.lock file locally
- [ ] Test with frozen lockfile
- [ ] Run full test suite
- [ ] Commit lockfile changes
- [ ] Push to main branch
- [ ] Verify CI passes
- [ ] Update developer guidelines
- [ ] Consider adding pre-commit hooks
- [ ] Document in team notes

## Notes
- This is a common issue when dependencies are added without committing the lockfile
- The wav packages are legitimate - used for audio generation features
- This issue is completely separate from the test mock contamination fixes
- Future PR workflow should include lockfile verification