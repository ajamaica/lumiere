# Ops Dashboard reference

- **Disk usage**: The script reports total free space in the workspace parent filesystem. If it drops below 10%, consider cleaning `dist/`, `outputs/`, or large skill bundles.
- **Git status**: Stale changes or diverging heads show up quickly; use `git status -sb` and `git log -n 3` to inspect recent commits.
- **Load averages**: Values above the number of cores indicate CPU saturation. Use this metric before launching heavy tests or data processing.
- **Top directories**: The dashboard prints the three largest directories under the workspace so you know where to prune.
