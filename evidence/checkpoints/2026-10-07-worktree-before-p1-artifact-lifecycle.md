# Worktree checkpoint

Date: 2026-10-07 (Asia/Shanghai)
HEAD: `c0f6745fa4a8615bfc4913431e73ce3b8b01fab8`

The local archive stores all Git-tracked working-tree files plus all non-ignored untracked files as of this checkpoint (8242 paths; 128 tracked modifications and 470 untracked paths were reported by `git status --short`). Its 126.82 MB size exceeds GitHub's 100 MB single-file limit, so the archive is intentionally kept local and excluded from Git; the adjacent path manifest and archive SHA-256 record remain versioned. The archive does not include `.git`, ignored files such as local credentials, `node_modules`, or the archive itself.

Restore locally by extracting the archive at the repository root of a clean checkout of the listed HEAD. It overlays exact file contents while leaving `.git` intact. Verify the restored paths against the adjacent SHA-256 manifest. The tar archive is not available from the Git remote; retain the local copy or transfer it through an approved large-file storage channel. Do not use `git reset --hard` or clean commands on the original worktree; it contains pre-existing user work.

This is a content checkpoint, not a commit or a claim that the V1 plan is complete.
