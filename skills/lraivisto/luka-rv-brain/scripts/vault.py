import sys
import os
import argparse
import json
from rich.console import Console
from rich.table import Table
from rich import box
from rich.rule import Rule
from rich.panel import Panel

# Ensure we can import from the parent directory (scripts package)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import scripts.db as db
import scripts.core as core
import scripts.scuttle as scuttle_engine

console = Console()

def main():
    db.init_db()
    parser = argparse.ArgumentParser(description="Vault Orchestrator")
    subparsers = parser.add_subparsers(dest="command")

    # Init
    init_parser = subparsers.add_parser("init")
    init_parser.add_argument("--id", required=True)
    init_parser.add_argument("--name")
    init_parser.add_argument("--objective", required=True)
    init_parser.add_argument("--priority", type=int, default=0)

    # Export
    export_parser = subparsers.add_parser("export")
    export_parser.add_argument("--id", required=True)
    export_parser.add_argument("--format", choices=['json', 'markdown'], default='json')
    export_parser.add_argument("--output", help="Output file path")
    export_parser.add_argument("--branch", default=None, help="Branch name (default: main)")

    # List
    list_parser = subparsers.add_parser("list")

    # Status Update
    update_parser = subparsers.add_parser("update")
    update_parser.add_argument("--id", required=True)
    update_parser.add_argument("--status", choices=['active', 'paused', 'completed', 'failed'])
    update_parser.add_argument("--priority", type=int, help="Update project priority")

    # Scuttle (Ingestion)
    scuttle_parser = subparsers.add_parser("scuttle")
    scuttle_parser.add_argument("url", help="URL to scuttle")
    scuttle_parser.add_argument("--id", required=True, help="Project ID")
    scuttle_parser.add_argument("--tags", help="Additional comma-separated tags")
    scuttle_parser.add_argument("--branch", default=None, help="Branch name (default: main)")

    # Search (Hybrid: Cache + Brave API)
    search_parser = subparsers.add_parser("search")
    search_parser.add_argument("--query", required=True)
    search_parser.add_argument("--set-result")

    # Log
    log_parser = subparsers.add_parser("log")
    log_parser.add_argument("--id", required=True)
    log_parser.add_argument("--type", required=True)
    log_parser.add_argument("--step", type=int, default=0)
    log_parser.add_argument("--payload", default="{}")
    log_parser.add_argument("--conf", type=float, default=1.0, help="Confidence score (0.0-1.0)")
    log_parser.add_argument("--source", default="unknown", help="Source of the event (e.g. agent name)")
    log_parser.add_argument("--tags", default="", help="Comma-separated tags for the event")
    log_parser.add_argument("--branch", default=None, help="Branch name (default: main)")

    # Status
    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("--id", required=True)
    status_parser.add_argument("--filter-tag", help="Filter events by tag")
    status_parser.add_argument("--branch", default=None, help="Branch name (default: main)")

    # Insight
    insight_parser = subparsers.add_parser("insight")
    insight_parser.add_argument("--id", required=True)
    insight_parser.add_argument("--add", action="store_true")
    insight_parser.add_argument("--title")
    insight_parser.add_argument("--content")
    insight_parser.add_argument("--url", default="")
    insight_parser.add_argument("--tags", default="")
    insight_parser.add_argument("--conf", type=float, default=1.0, help="Confidence score (0.0-1.0)")
    insight_parser.add_argument("--filter-tag", help="Filter insights by tag")
    insight_parser.add_argument("--branch", default=None, help="Branch name (default: main)")

    # Interactive Insight Mode
    insight_parser.add_argument("--interactive", "-i", action="store_true", help="Interactive session to add multiple insights")

    # Summary
    summary_parser = subparsers.add_parser("summary")
    summary_parser.add_argument("--id", required=True)
    summary_parser.add_argument("--branch", default=None, help="Branch name (default: main)")

    # Branches
    branch_parser = subparsers.add_parser("branch", help="Manage divergent reasoning branches")
    branch_sub = branch_parser.add_subparsers(dest="branch_command")

    branch_create = branch_sub.add_parser("create", help="Create a new branch")
    branch_create.add_argument("--id", required=True)
    branch_create.add_argument("--name", required=True)
    branch_create.add_argument("--from", dest="parent", default=None, help="Parent branch name")
    branch_create.add_argument("--hypothesis", default="", help="Optional hypothesis for this branch")

    branch_list = branch_sub.add_parser("list", help="List branches")
    branch_list.add_argument("--id", required=True)

    # Hypotheses
    hyp_parser = subparsers.add_parser("hypothesis", help="Manage hypotheses within branches")
    hyp_sub = hyp_parser.add_subparsers(dest="hyp_command")

    hyp_add = hyp_sub.add_parser("add", help="Add a hypothesis to a branch")
    hyp_add.add_argument("--id", required=True)
    hyp_add.add_argument("--branch", default="main")
    hyp_add.add_argument("--statement", required=True)
    hyp_add.add_argument("--rationale", default="")
    hyp_add.add_argument("--conf", type=float, default=0.5)
    hyp_add.add_argument("--status", default="open", choices=["open", "accepted", "rejected", "archived"])

    hyp_list = hyp_sub.add_parser("list", help="List hypotheses")
    hyp_list.add_argument("--id", required=True)
    hyp_list.add_argument("--branch", default=None, help="Branch name (omit for all)")

    # Artifacts
    artifact_parser = subparsers.add_parser("artifact", help="Register local artifacts for synthesis/linking")
    artifact_sub = artifact_parser.add_subparsers(dest="artifact_command")

    artifact_add = artifact_sub.add_parser("add", help="Add an artifact (path on disk)")
    artifact_add.add_argument("--id", required=True)
    artifact_add.add_argument("--path", required=True)
    artifact_add.add_argument("--type", default="FILE")
    artifact_add.add_argument("--metadata", default="{}", help="JSON metadata blob")
    artifact_add.add_argument("--branch", default=None, help="Branch name (default: main)")

    artifact_list = artifact_sub.add_parser("list", help="List artifacts")
    artifact_list.add_argument("--id", required=True)
    artifact_list.add_argument("--branch", default=None, help="Branch name (default: main)")

    # Synthesis
    synth_parser = subparsers.add_parser("synthesize", help="Discover links via local embeddings")
    synth_parser.add_argument("--id", required=True)
    synth_parser.add_argument("--branch", default=None, help="Branch name (default: main)")
    synth_parser.add_argument("--threshold", type=float, default=0.78)
    synth_parser.add_argument("--top-k", type=int, default=5, help="Max links per entity")
    synth_parser.add_argument("--max-links", type=int, default=50)
    synth_parser.add_argument("--dry-run", action="store_true", help="Compute links but do not persist")

    # Verification protocol
    verify_parser = subparsers.add_parser("verify", help="Active verification protocol (missions)")
    verify_sub = verify_parser.add_subparsers(dest="verify_command")

    verify_plan = verify_sub.add_parser("plan", help="Generate search missions for low-confidence findings")
    verify_plan.add_argument("--id", required=True)
    verify_plan.add_argument("--branch", default=None, help="Branch name (default: main)")
    verify_plan.add_argument("--threshold", type=float, default=0.7)
    verify_plan.add_argument("--max", dest="max_missions", type=int, default=20)

    verify_list = verify_sub.add_parser("list", help="List verification missions")
    verify_list.add_argument("--id", required=True)
    verify_list.add_argument("--branch", default=None, help="Branch name (default: main)")
    verify_list.add_argument("--status", default=None, choices=["open", "in_progress", "done", "blocked", "cancelled"])
    verify_list.add_argument("--limit", type=int, default=50)

    verify_run = verify_sub.add_parser("run", help="Execute missions via cache/Brave (if configured)")
    verify_run.add_argument("--id", required=True)
    verify_run.add_argument("--branch", default=None, help="Branch name (default: main)")
    verify_run.add_argument("--status", default="open", choices=["open", "blocked"])
    verify_run.add_argument("--limit", type=int, default=5)

    verify_complete = verify_sub.add_parser("complete", help="Manually update a mission status")
    verify_complete.add_argument("--mission", required=True)
    verify_complete.add_argument("--status", default="done", choices=["done", "cancelled", "open"])
    verify_complete.add_argument("--note", default="")

    # MCP server
    mcp_parser = subparsers.add_parser("mcp", help="Run ResearchVault as an MCP server")
    mcp_parser.add_argument(
        "--transport",
        default="stdio",
        choices=["stdio", "sse", "streamable-http"],
        help="MCP transport (default: stdio)",
    )
    mcp_parser.add_argument(
        "--mount-path",
        default=None,
        help="Mount path for SSE transport (optional)",
    )

    # Watch targets + watchdog runner
    watch_parser = subparsers.add_parser("watch", help="Manage watchdog targets")
    watch_sub = watch_parser.add_subparsers(dest="watch_command")

    watch_add = watch_sub.add_parser("add", help="Add a watch target (url/query)")
    watch_add.add_argument("--id", required=True)
    watch_add.add_argument("--type", required=True, choices=["url", "query"])
    watch_add.add_argument("--target", required=True)
    watch_add.add_argument("--interval", type=int, default=3600, help="Minimum seconds between runs")
    watch_add.add_argument("--tags", default="", help="Comma-separated tags")
    watch_add.add_argument("--branch", default=None, help="Branch name (default: main)")

    watch_list = watch_sub.add_parser("list", help="List watch targets")
    watch_list.add_argument("--id", required=True)
    watch_list.add_argument("--branch", default=None, help="Branch name (default: main)")
    watch_list.add_argument("--status", default="active", choices=["active", "disabled", "all"])

    watch_disable = watch_sub.add_parser("disable", help="Disable a watch target")
    watch_disable.add_argument("--target-id", required=True)

    watchdog_parser = subparsers.add_parser("watchdog", help="Run watchdog (scuttle/search in background)")
    watchdog_parser.add_argument("--once", action="store_true", help="Run one iteration and exit")
    watchdog_parser.add_argument("--interval", type=int, default=300, help="Loop interval in seconds")
    watchdog_parser.add_argument("--limit", type=int, default=10, help="Max targets per iteration")
    watchdog_parser.add_argument("--id", default=None, help="Optional project id filter")
    watchdog_parser.add_argument("--branch", default=None, help="Optional branch filter (requires --id)")
    watchdog_parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if args.command == "init":
        core.start_project(args.id, args.name or args.id, args.objective, args.priority)
    elif args.command == "export":
        data = core.get_status(args.id, branch=args.branch)
        if not data:
            console.print(f"[red]Project '{args.id}' not found.[/red]")
        else:
            insights = core.get_insights(args.id, branch=args.branch)
            export_data = {
                "project": {
                    "id": data['project'][0],
                    "name": data['project'][1],
                    "objective": data['project'][2],
                    "status": data['project'][3],
                    "priority": data['project'][5]
                },
                "findings": []
            }
            for i in insights:
                evidence = {}
                try:
                    evidence = json.loads(i[2])
                except:
                    pass
                export_data["findings"].append({
                    "title": i[0], 
                    "content": i[1], 
                    "source_url": evidence.get("source_url", ""), 
                    "tags": i[3], 
                    "timestamp": i[4],
                    "confidence": i[5]
                })

            output = ""
            if args.format == 'json':
                output = json.dumps(export_data, indent=2)
            else:
                p = export_data['project']
                output = f"# Research Vault: {p['name']}\n\n"
                output += f"**Objective:** {p['objective']}\n"
                output += f"**Status:** {p['status']}\n\n"
                output += "## Findings\n\n"
                for f in export_data['findings']:
                    output += f"### {f['title']} (Conf: {f['confidence']})\n"
                    output += f"- **Source:** {f['source_url']}\n"
                    output += f"- **Tags:** {f['tags']}\n"
                    output += f"- **Date:** {f['timestamp']}\n\n"
                    output += f"{f['content']}\n\n---\n\n"
            
            if args.output:
                with open(args.output, 'w') as f:
                    f.write(output)
                console.print(f"[green]✔ Exported to {args.output}[/green]")
            else:
                print(output)
    elif args.command == "list":
        projects = core.list_projects()
        if not projects:
            console.print("[yellow]No projects found.[/yellow]")
        else:
            table = Table(title="Research Vault Projects", box=box.ROUNDED)
            table.add_column("ID", style="cyan", no_wrap=True)
            table.add_column("Prior", style="magenta", justify="center")
            table.add_column("Status", style="bold")
            table.add_column("Name", style="green")
            table.add_column("Objective")
            
            for p in projects:
                # p: id, name, objective, status, created_at, priority
                status_style = "green" if p[3] == "active" else "red" if p[3] == "failed" else "blue"
                table.add_row(
                    p[0], 
                    str(p[5]), 
                    f"[{status_style}]{p[3].upper()}[/{status_style}]", 
                    p[1], 
                    p[2]
                )
            console.print(table)
    elif args.command == "update":
        core.update_status(args.id, args.status, args.priority)
    elif args.command == "summary":
        status = core.get_status(args.id, branch=args.branch)
        if not status:
            console.print(f"[red]Project '{args.id}' not found.[/red]")
        else:
            p = status['project']
            insights = core.get_insights(args.id, branch=args.branch)
            events = status['recent_events']
            
            console.print(Panel(
                f"[bold cyan]Project:[/] {p[1]} ({p[0]})\n"
                f"[bold cyan]Objective:[/] {p[2]}\n"
                f"[bold cyan]Insights:[/] {len(insights)}\n"
                f"[bold cyan]Events logged:[/] {len(events)}",
                title="Vault Quick Summary",
                border_style="magenta"
            ))
    elif args.command == "scuttle":
        try:
            service = core.get_ingest_service()
            console.print(f"[cyan]Ingesting {args.url}...[/cyan]")
            
            # Additional tags if provided
            extra_tags = args.tags.split(",") if args.tags else []
            
            result = service.ingest(args.id, args.url, extra_tags=extra_tags, branch=args.branch)
            
            if result.success:
                source_info = f"({result.metadata.get('source', 'unknown')})"
                if "moltbook" in args.url or result.metadata.get('source') == "moltbook":
                    console.print(Panel(
                        f"[bold yellow]SUSPICION PROTOCOL ACTIVE[/bold yellow]\n\n"
                        f"✔ Ingested: {result.metadata['title']} {source_info}\n"
                        f"Note: Moltbook data is marked low-confidence (0.55) by default.",
                        border_style="yellow"
                    ))
                else:
                    console.print(f"[green]✔ Ingested:[/green] {result.metadata['title']} {source_info}")
            else:
                console.print(f"[red]Ingest failed:[/red] {result.error}")
        except Exception as e:
            console.print(f"[red]Error:[/red] {e}")
    elif args.command == "search":
        if args.set_result:
            # Agent Mode: Manual Injection
            try:
                result_data = json.loads(args.set_result)
                core.log_search(args.query, result_data)
                console.print(f"[green]✔ Cached provided result for:[/green] {args.query}")
            except json.JSONDecodeError:
                console.print("[red]Error: --set-result must be valid JSON.[/red]")
        else:
            # Standalone Mode: Check Cache -> API
            cached = core.check_search(args.query)
            if cached:
                console.print(f"[dim]Note: Serving cached result for '{args.query}'[/dim]")
                console.print_json(data=cached)
            else:
                try:
                    console.print(f"[cyan]Searching Brave for:[/cyan] {args.query}...")
                    result = core.perform_brave_search(args.query)
                    core.log_search(args.query, result)
                    console.print_json(data=result)
                except core.MissingAPIKeyError:
                    console.print(Panel(
                        "[bold red]Active Search Unavailable[/bold red]\n\n"
                        "To use the Vault in standalone mode, you need a Brave Search API Key.\n"
                        "1. Get a free key: [link]https://brave.com/search/api[/link]\n"
                        "2. Set env var: [bold yellow]export BRAVE_API_KEY=YOUR_KEY[/bold yellow]\n\n"
                        "[dim]Or provide a result manually via --set-result if you are an Agent.[/dim]",
                        title="Setup Required",
                        border_style="red"
                    ))
                except Exception as e:
                    console.print(f"[red]Search failed:[/red] {e}")
    elif args.command == "log":
        core.log_event(
            args.id,
            args.type,
            args.step,
            json.loads(args.payload),
            args.conf,
            args.source,
            args.tags,
            branch=args.branch,
        )
        console.print(f"[green]✔ Logged[/green] [bold cyan]{args.type}[/] for [bold white]{args.id}[/] (conf: {args.conf}, src: {args.source})")
    elif args.command == "status":
        from rich.console import Group
        
        status = core.get_status(args.id, tag_filter=args.filter_tag, branch=args.branch)
        if not status:
            console.print(f"[red]Project '{args.id}' not found.[/red]")
        else:
            p = status['project']
            # p: id, name, objective, status, created_at, priority
            
            # Header Info
            info_text = f"[bold white]{p[1]}[/bold white] [dim]({p[0]})[/dim]\n"
            info_text += f"Status: [bold { 'green' if p[3]=='active' else 'red'}]{p[3].upper()}[/]\n"
            info_text += f"Objective: {p[2]}\n"
            info_text += f"Created: {p[4]}"
            
            # Event Table
            event_table = Table(box=box.SIMPLE, show_header=True, header_style="bold magenta")
            event_table.add_column("Time", style="dim")
            event_table.add_column("Source", style="cyan")
            event_table.add_column("Type", style="yellow")
            event_table.add_column("Conf", justify="right")
            event_table.add_column("Data")
            
            for e in status['recent_events']:
                # e: event_type, step, payload, confidence, source, timestamp, tags
                conf_color = "green" if e[3] > 0.8 else "yellow" if e[3] > 0.5 else "red"
                short_time = e[5].split("T")[1][:8]
                event_table.add_row(
                    short_time,
                    e[4],
                    e[0],
                    f"[{conf_color}]{e[3]}[/]",
                    e[2][:50] + "..." if len(e[2]) > 50 else e[2]
                )
            
            # Insights Panel (if any)
            insights = core.get_insights(args.id, branch=args.branch)
            if insights:
                insight_table = Table(box=box.SIMPLE, show_header=False)
                for i in insights:
                    insight_table.add_row(f"💡 [bold]{i[0]}[/]: {i[1]}")
                content = Group(info_text, Rule(style="white"), event_table, Rule(style="white"), insight_table)
            else:
                content = Group(info_text, Rule(style="white"), event_table)
                
            console.print(Panel(content, title=f"Research Vault Status: {p[1]}", border_style="blue"))
    elif args.command == "insight":
        if args.interactive:
            console.print(Panel(f"Interactive Insight Mode for [bold cyan]{args.id}[/bold cyan]\nType [bold red]exit[/] to finish.", border_style="green"))
            while True:
                title = console.input("[bold yellow]Title[/]: ").strip()
                if title.lower() in ['exit', 'quit']: break
                content = console.input("[bold yellow]Content[/]: ").strip()
                tags = console.input("[bold yellow]Tags (comma-separated)[/]: ").strip()
                conf_str = console.input("[bold yellow]Confidence (0.0-1.0)[/]: ").strip()
                try:
                    conf = float(conf_str) if conf_str else 1.0
                except ValueError:
                    conf = 1.0
                
                core.add_insight(args.id, title, content, "", tags, confidence=conf, branch=args.branch)
                console.print("[green]✔ Added.[/green]\n")
        elif args.add:
            if not args.title or not args.content:
                print("Error: --title and --content required for adding insight.")
            else:
                core.add_insight(args.id, args.title, args.content, args.url, args.tags, confidence=args.conf, branch=args.branch)
                print(f"Added insight to project '{args.id}'.")
        else:
            insights = core.get_insights(args.id, tag_filter=args.filter_tag, branch=args.branch)
            if not insights:
                print("No insights found" + (f" with tag '{args.filter_tag}'" if args.filter_tag else ""))
            for i in insights:
                evidence = {}
                try:
                    evidence = json.loads(i[2])
                except:
                    pass
                source = evidence.get("source_url", "unknown")
                print(f"[{i[4]}] {i[0]} (Conf: {i[5]})\nContent: {i[1]}\nSource: {source}\nTags: {i[3]}\n")
    elif args.command == "branch":
        if args.branch_command == "create":
            branch_id = core.create_branch(args.id, args.name, parent=args.parent, hypothesis=args.hypothesis)
            console.print(f"[green]✔ Created branch[/green] [bold]{args.name}[/] ({branch_id}) for project [bold]{args.id}[/]")
        elif args.branch_command == "list":
            rows = core.list_branches(args.id)
            if not rows:
                console.print("[yellow]No branches found.[/yellow]")
            else:
                table = Table(title=f"Branches: {args.id}", box=box.ROUNDED)
                table.add_column("Name", style="cyan")
                table.add_column("ID", style="dim")
                table.add_column("Parent", style="magenta")
                table.add_column("Status", style="bold")
                table.add_column("Hypothesis")
                for (bid, name, parent_id, hypothesis, status, created_at) in rows:
                    table.add_row(name, bid, parent_id or "", status, (hypothesis or "")[:80])
                console.print(table)
        else:
            console.print("[red]Error:[/red] branch requires a subcommand (create|list).")
    elif args.command == "hypothesis":
        if args.hyp_command == "add":
            hid = core.add_hypothesis(
                args.id,
                args.branch,
                args.statement,
                rationale=args.rationale,
                confidence=args.conf,
                status=args.status,
            )
            console.print(f"[green]✔ Added hypothesis[/green] {hid} to branch [bold]{args.branch}[/]")
        elif args.hyp_command == "list":
            rows = core.list_hypotheses(args.id, branch=args.branch)
            if not rows:
                console.print("[yellow]No hypotheses found.[/yellow]")
            else:
                table = Table(title=f"Hypotheses: {args.id}", box=box.ROUNDED)
                table.add_column("ID", style="dim")
                table.add_column("Branch", style="cyan")
                table.add_column("Status", style="bold")
                table.add_column("Conf", justify="right")
                table.add_column("Statement")
                for (hid, bname, stmt, rationale, conf, status, created_at, updated_at) in rows:
                    table.add_row(hid, bname, status, f"{conf:.2f}", (stmt or "")[:90])
                console.print(table)
        else:
            console.print("[red]Error:[/red] hypothesis requires a subcommand (add|list).")
    elif args.command == "artifact":
        if args.artifact_command == "add":
            try:
                metadata = json.loads(args.metadata or "{}")
            except json.JSONDecodeError:
                console.print("[red]Error:[/red] --metadata must be valid JSON.")
                return
            artifact_id = core.add_artifact(
                args.id,
                args.path,
                type=args.type,
                metadata=metadata,
                branch=args.branch,
            )
            console.print(f"[green]✔ Added artifact[/green] {artifact_id}")
        elif args.artifact_command == "list":
            rows = core.list_artifacts(args.id, branch=args.branch)
            if not rows:
                console.print("[yellow]No artifacts found.[/yellow]")
            else:
                table = Table(title=f"Artifacts: {args.id}", box=box.ROUNDED)
                table.add_column("ID", style="dim")
                table.add_column("Type", style="cyan")
                table.add_column("Path", style="green")
                for (aid, atype, path, metadata, created_at) in rows:
                    table.add_row(aid, atype, path)
                console.print(table)
        else:
            console.print("[red]Error:[/red] artifact requires a subcommand (add|list).")
    elif args.command == "synthesize":
        from scripts.synthesis import synthesize

        links = synthesize(
            args.id,
            branch=args.branch,
            threshold=args.threshold,
            top_k=args.top_k,
            max_links=args.max_links,
            persist=not args.dry_run,
        )
        if not links:
            console.print("[yellow]No links found above threshold.[/yellow]")
        else:
            table = Table(title="Synthesis Links", box=box.ROUNDED)
            table.add_column("Score", justify="right", style="magenta")
            table.add_column("Source", style="cyan")
            table.add_column("Target", style="green")
            for link in links:
                table.add_row(
                    f"{link['score']:.3f}",
                    f"{link['source_label']} ({link['source_id']})",
                    f"{link['target_label']} ({link['target_id']})",
                )
            console.print(table)
    elif args.command == "verify":
        if args.verify_command == "plan":
            missions = core.plan_verification_missions(
                args.id,
                branch=args.branch,
                threshold=args.threshold,
                max_missions=args.max_missions,
            )
            if not missions:
                console.print("[yellow]No missions created (nothing under threshold or already planned).[/yellow]")
            else:
                table = Table(title="Verification Missions (Created)", box=box.ROUNDED)
                table.add_column("Mission", style="dim")
                table.add_column("Finding", style="cyan")
                table.add_column("Query", style="green")
                for mid, fid, q in missions:
                    table.add_row(mid, fid, q[:120])
                console.print(table)
        elif args.verify_command == "list":
            rows = core.list_verification_missions(
                args.id,
                branch=args.branch,
                status=args.status,
                limit=args.limit,
            )
            if not rows:
                console.print("[yellow]No missions found.[/yellow]")
            else:
                table = Table(title="Verification Missions", box=box.ROUNDED)
                table.add_column("ID", style="dim")
                table.add_column("Status", style="bold")
                table.add_column("Pri", justify="right", style="magenta")
                table.add_column("Finding", style="cyan")
                table.add_column("Conf", justify="right")
                table.add_column("Query", style="green")
                for mid, status, pri, query, title, conf, created_at, completed_at, last_error in rows:
                    table.add_row(
                        mid,
                        status,
                        str(pri),
                        (title or "")[:40],
                        f"{float(conf or 0.0):.2f}",
                        (query or "")[:80],
                    )
                console.print(table)
        elif args.verify_command == "run":
            results = core.run_verification_missions(
                args.id,
                branch=args.branch,
                status=args.status,
                limit=args.limit,
            )
            if not results:
                console.print("[yellow]No missions executed.[/yellow]")
            else:
                table = Table(title="Verification Run", box=box.ROUNDED)
                table.add_column("ID", style="dim")
                table.add_column("Status", style="bold")
                table.add_column("Query", style="green")
                table.add_column("Info")
                for r in results:
                    info = ""
                    if r.get("meta"):
                        info = json.dumps(r["meta"], ensure_ascii=True)[:120]
                    if r.get("error"):
                        info = r["error"][:120]
                    table.add_row(r["id"], r["status"], (r["query"] or "")[:80], info)
                console.print(table)
        elif args.verify_command == "complete":
            core.set_verification_mission_status(args.mission, args.status, note=args.note)
            console.print(f"[green]✔ Updated mission[/green] {args.mission} -> {args.status}")
        else:
            console.print("[red]Error:[/red] verify requires a subcommand (plan|list|run|complete).")
    elif args.command == "mcp":
        # IMPORTANT: keep stdout clean for stdio transport.
        from scripts.mcp_server import mcp as server

        server.run(transport=args.transport, mount_path=args.mount_path)
    elif args.command == "watch":
        if args.watch_command == "add":
            tid = core.add_watch_target(
                args.id,
                args.type,
                args.target,
                interval_s=args.interval,
                tags=args.tags,
                branch=args.branch,
            )
            console.print(f"[green]✔ Added watch target[/green] {tid}")
        elif args.watch_command == "list":
            status = None if args.status == "all" else args.status
            rows = core.list_watch_targets(args.id, branch=args.branch, status=status)
            if not rows:
                console.print("[yellow]No watch targets found.[/yellow]")
            else:
                table = Table(title=f"Watch Targets: {args.id}", box=box.ROUNDED)
                table.add_column("ID", style="dim")
                table.add_column("Type", style="cyan")
                table.add_column("Interval", justify="right", style="magenta")
                table.add_column("Target", style="green")
                table.add_column("Last Run", style="dim")
                table.add_column("Status", style="bold")
                for tid, ttype, target, tags, interval_s, status, last_run_at, last_error, created_at in rows:
                    table.add_row(
                        tid,
                        ttype,
                        str(interval_s),
                        (target or "")[:60],
                        (last_run_at or "")[:19],
                        status,
                    )
                console.print(table)
        elif args.watch_command == "disable":
            core.disable_watch_target(args.target_id)
            console.print(f"[green]✔ Disabled watch target[/green] {args.target_id}")
        else:
            console.print("[red]Error:[/red] watch requires a subcommand (add|list|disable).")
    elif args.command == "watchdog":
        from scripts.watchdog import loop as watchdog_loop, run_once

        if args.once:
            actions = run_once(project_id=args.id, branch=args.branch, limit=args.limit, dry_run=args.dry_run)
            if not actions:
                console.print("[yellow]No due targets.[/yellow]")
            else:
                table = Table(title="Watchdog Actions", box=box.ROUNDED)
                table.add_column("Target", style="dim")
                table.add_column("Project", style="cyan")
                table.add_column("Type", style="magenta")
                table.add_column("Status", style="bold")
                for a in actions:
                    table.add_row(a.get("id", ""), a.get("project_id", ""), a.get("type", ""), a.get("status", ""))
                console.print(table)
        else:
            watchdog_loop(interval_s=args.interval, limit=args.limit)

if __name__ == "__main__":
    main()
