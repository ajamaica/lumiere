#!/usr/bin/env python3
"""
CreateOS Python SDK / Deployment Script

Usage:
    from createos import CreateOS
    
    client = CreateOS(api_key="your-api-key")
    project = client.create_project("my-app", "My Application", project_type="upload")
    deployment = client.upload_files(project["id"], {"index.html": "<h1>Hello</h1>"})
"""

import os
import json
import requests
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from pathlib import Path
import zipfile
import tempfile
import base64


@dataclass
class CreateOSConfig:
    """Configuration for CreateOS API"""
    api_key: str
    base_url: str = "https://api-createos.nodeops.network"
    timeout: int = 30


class CreateOSError(Exception):
    """Base exception for CreateOS errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class CreateOS:
    """CreateOS API Client"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.environ.get("CREATEOS_API_KEY")
        if not self.api_key:
            raise CreateOSError("API key required. Set CREATEOS_API_KEY or pass api_key parameter.")
        
        self.base_url = base_url or os.environ.get("CREATEOS_API_URL", "https://api-createos.nodeops.network")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make API request"""
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        
        try:
            data = response.json()
        except json.JSONDecodeError:
            data = {"raw": response.text}
        
        if not response.ok:
            raise CreateOSError(
                f"API error: {response.status_code}",
                status_code=response.status_code,
                response=data
            )
        
        return data
    
    # ==================== Projects ====================
    
    def create_project(
        self,
        unique_name: str,
        display_name: str,
        project_type: str = "upload",
        runtime: str = "node:20",
        port: int = 3000,
        framework: Optional[str] = None,
        run_envs: Optional[Dict[str, str]] = None,
        build_vars: Optional[Dict[str, str]] = None,
        app_id: Optional[str] = None,
        **settings
    ) -> Dict[str, Any]:
        """Create a new project"""
        payload = {
            "uniqueName": unique_name,
            "displayName": display_name,
            "type": project_type,
            "source": {},
            "settings": {
                "runtime": runtime,
                "port": port,
                **({"framework": framework} if framework else {}),
                **({"runEnvs": run_envs} if run_envs else {}),
                **({"buildVars": build_vars} if build_vars else {}),
                **settings
            }
        }
        if app_id:
            payload["appId"] = app_id
        
        return self._request("POST", "/v1/projects", json=payload)
    
    def create_vcs_project(
        self,
        unique_name: str,
        display_name: str,
        installation_id: str,
        repo_id: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Create a VCS (GitHub) project"""
        payload = {
            "uniqueName": unique_name,
            "displayName": display_name,
            "type": "vcs",
            "source": {
                "vcsName": "github",
                "vcsInstallationId": installation_id,
                "vcsRepoId": repo_id
            },
            "settings": kwargs
        }
        return self._request("POST", "/v1/projects", json=payload)
    
    def create_image_project(
        self,
        unique_name: str,
        display_name: str,
        port: int = 8080,
        run_envs: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create an image (Docker) project"""
        return self.create_project(
            unique_name=unique_name,
            display_name=display_name,
            project_type="image",
            port=port,
            run_envs=run_envs
        )
    
    def list_projects(
        self,
        limit: int = 10,
        offset: int = 0,
        name: Optional[str] = None,
        project_type: Optional[str] = None,
        status: Optional[str] = None,
        app: Optional[str] = None
    ) -> Dict[str, Any]:
        """List projects"""
        params = {"limit": limit, "offset": offset}
        if name: params["name"] = name
        if project_type: params["type"] = project_type
        if status: params["status"] = status
        if app: params["app"] = app
        
        return self._request("GET", "/v1/projects", params=params)
    
    def get_project(self, project_id: str) -> Dict[str, Any]:
        """Get project details"""
        return self._request("GET", f"/v1/projects/{project_id}")
    
    def update_project(
        self,
        project_id: str,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
        enable_security_scan: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Update project metadata"""
        payload = {}
        if display_name: payload["displayName"] = display_name
        if description: payload["description"] = description
        if enable_security_scan is not None: payload["enabledSecurityScan"] = enable_security_scan
        
        return self._request("PATCH", f"/v1/projects/{project_id}", json=payload)
    
    def update_project_settings(self, project_id: str, **settings) -> Dict[str, Any]:
        """Update project build/runtime settings"""
        return self._request("PATCH", f"/v1/projects/{project_id}/settings", json=settings)
    
    def delete_project(self, project_id: str) -> Dict[str, Any]:
        """Delete a project"""
        return self._request("DELETE", f"/v1/projects/{project_id}")
    
    # ==================== Deployments ====================
    
    def create_deployment(self, project_id: str, image: str) -> Dict[str, Any]:
        """Create deployment for image project"""
        return self._request("POST", f"/v1/projects/{project_id}/deployments", json={"image": image})
    
    def trigger_deployment(self, project_id: str, branch: Optional[str] = None) -> Dict[str, Any]:
        """Trigger deployment for VCS project"""
        payload = {"branch": branch} if branch else {}
        return self._request("POST", f"/v1/projects/{project_id}/deployments/trigger", json=payload)
    
    def upload_files(self, project_id: str, files: Dict[str, str]) -> Dict[str, Any]:
        """Upload files to deploy (for upload projects)"""
        payload = {
            "files": [{"path": path, "content": content} for path, content in files.items()]
        }
        return self._request("POST", f"/v1/projects/{project_id}/deployments/files", json=payload)
    
    def upload_directory(self, project_id: str, directory: str) -> Dict[str, Any]:
        """Upload a directory as zip"""
        directory = Path(directory)
        if not directory.is_dir():
            raise CreateOSError(f"Not a directory: {directory}")
        
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
                for file in directory.rglob("*"):
                    if file.is_file():
                        zf.write(file, file.relative_to(directory))
            
            return self.upload_zip(project_id, tmp.name)
    
    def upload_zip(self, project_id: str, zip_path: str) -> Dict[str, Any]:
        """Upload a zip file"""
        # Remove Content-Type for multipart
        headers = {"Authorization": f"Bearer {self.api_key}"}
        with open(zip_path, "rb") as f:
            files = {"file": f}
            response = requests.post(
                f"{self.base_url}/v1/projects/{project_id}/deployments/zip",
                headers=headers,
                files=files
            )
        return response.json()
    
    def list_deployments(self, project_id: str, limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """List deployments"""
        return self._request("GET", f"/v1/projects/{project_id}/deployments", params={"limit": limit, "offset": offset})
    
    def get_deployment(self, project_id: str, deployment_id: str) -> Dict[str, Any]:
        """Get deployment details"""
        return self._request("GET", f"/v1/projects/{project_id}/deployments/{deployment_id}")
    
    def cancel_deployment(self, project_id: str, deployment_id: str) -> Dict[str, Any]:
        """Cancel a queued/building deployment"""
        return self._request("POST", f"/v1/projects/{project_id}/deployments/{deployment_id}/cancel")
    
    def retry_deployment(self, project_id: str, deployment_id: str, settings: str = "deployment") -> Dict[str, Any]:
        """Retry a deployment"""
        return self._request("POST", f"/v1/projects/{project_id}/deployments/{deployment_id}/retry", params={"settings": settings})
    
    def wake_deployment(self, project_id: str, deployment_id: str) -> Dict[str, Any]:
        """Wake a sleeping deployment"""
        return self._request("POST", f"/v1/projects/{project_id}/deployments/{deployment_id}/wake")
    
    def get_build_logs(self, project_id: str, deployment_id: str, skip: int = 0) -> Dict[str, Any]:
        """Get build logs"""
        return self._request("GET", f"/v1/projects/{project_id}/deployments/{deployment_id}/logs/build", params={"skip": skip})
    
    def get_runtime_logs(self, project_id: str, deployment_id: str, since_seconds: int = 60) -> Dict[str, Any]:
        """Get runtime logs"""
        return self._request("GET", f"/v1/projects/{project_id}/deployments/{deployment_id}/logs/runtime", params={"since-seconds": since_seconds})
    
    # ==================== Environments ====================
    
    def create_environment(
        self,
        project_id: str,
        unique_name: str,
        display_name: str,
        description: str = "",
        branch: Optional[str] = None,
        auto_promote: bool = False,
        cpu: int = 500,
        memory: int = 1024,
        replicas: int = 1,
        run_envs: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create a project environment"""
        payload = {
            "uniqueName": unique_name,
            "displayName": display_name,
            "description": description,
            "isAutoPromoteEnabled": auto_promote,
            "resources": {
                "cpu": cpu,
                "memory": memory,
                "replicas": replicas
            },
            "settings": {
                "runEnvs": run_envs or {}
            }
        }
        if branch:
            payload["branch"] = branch
        
        return self._request("POST", f"/v1/projects/{project_id}/environments", json=payload)
    
    def list_environments(self, project_id: str) -> Dict[str, Any]:
        """List project environments"""
        return self._request("GET", f"/v1/projects/{project_id}/environments")
    
    def update_environment(
        self,
        project_id: str,
        environment_id: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Update environment"""
        return self._request("PATCH", f"/v1/projects/{project_id}/environments/{environment_id}", json=kwargs)
    
    def update_env_vars(
        self,
        project_id: str,
        environment_id: str,
        run_envs: Dict[str, str],
        port: Optional[int] = None
    ) -> Dict[str, Any]:
        """Update environment variables"""
        payload = {"runEnvs": run_envs}
        if port:
            payload["port"] = port
        
        return self._request("PATCH", f"/v1/projects/{project_id}/environments/{environment_id}/variables", json=payload)
    
    def update_resources(
        self,
        project_id: str,
        environment_id: str,
        cpu: int,
        memory: int,
        replicas: int
    ) -> Dict[str, Any]:
        """Update environment resources"""
        payload = {"cpu": cpu, "memory": memory, "replicas": replicas}
        return self._request("PATCH", f"/v1/projects/{project_id}/environments/{environment_id}/resources", json=payload)
    
    def assign_deployment(self, project_id: str, environment_id: str, deployment_id: str) -> Dict[str, Any]:
        """Assign deployment to environment"""
        return self._request("POST", f"/v1/projects/{project_id}/environments/{environment_id}/assign", json={"deploymentId": deployment_id})
    
    def delete_environment(self, project_id: str, environment_id: str) -> Dict[str, Any]:
        """Delete environment"""
        return self._request("DELETE", f"/v1/projects/{project_id}/environments/{environment_id}")
    
    # ==================== Domains ====================
    
    def create_domain(self, project_id: str, name: str, environment_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a custom domain"""
        payload = {"name": name}
        if environment_id:
            payload["environmentId"] = environment_id
        
        return self._request("POST", f"/v1/projects/{project_id}/domains", json=payload)
    
    def list_domains(self, project_id: str) -> Dict[str, Any]:
        """List project domains"""
        return self._request("GET", f"/v1/projects/{project_id}/domains")
    
    def refresh_domain(self, project_id: str, domain_id: str) -> Dict[str, Any]:
        """Refresh domain verification"""
        return self._request("POST", f"/v1/projects/{project_id}/domains/{domain_id}/refresh")
    
    def assign_domain(self, project_id: str, domain_id: str, environment_id: Optional[str]) -> Dict[str, Any]:
        """Assign domain to environment"""
        return self._request("PATCH", f"/v1/projects/{project_id}/domains/{domain_id}/environment", json={"environmentId": environment_id})
    
    def delete_domain(self, project_id: str, domain_id: str) -> Dict[str, Any]:
        """Delete domain"""
        return self._request("DELETE", f"/v1/projects/{project_id}/domains/{domain_id}")
    
    # ==================== Apps ====================
    
    def create_app(self, name: str, description: str = "", color: str = "#3B82F6") -> Dict[str, Any]:
        """Create an app"""
        return self._request("POST", "/v1/apps", json={"name": name, "description": description, "color": color})
    
    def list_apps(self) -> Dict[str, Any]:
        """List apps"""
        return self._request("GET", "/v1/apps")
    
    def add_projects_to_app(self, app_id: str, project_ids: List[str]) -> Dict[str, Any]:
        """Add projects to app"""
        return self._request("POST", f"/v1/apps/{app_id}/projects", json={"projectIds": project_ids})
    
    def remove_projects_from_app(self, app_id: str, project_ids: List[str]) -> Dict[str, Any]:
        """Remove projects from app"""
        return self._request("DELETE", f"/v1/apps/{app_id}/projects", json={"projectIds": project_ids})
    
    # ==================== Analytics ====================
    
    def get_analytics(
        self,
        project_id: str,
        environment_id: str,
        start: Optional[int] = None,
        end: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get environment analytics"""
        params = {}
        if start: params["start"] = start
        if end: params["end"] = end
        
        return self._request("GET", f"/v1/projects/{project_id}/environments/{environment_id}/analytics", params=params)
    
    # ==================== User ====================
    
    def get_current_user(self) -> Dict[str, Any]:
        """Get current user info"""
        return self._request("GET", "/v1/user")
    
    def get_quotas(self) -> Dict[str, Any]:
        """Get usage quotas"""
        return self._request("GET", "/v1/user/quotas")
    
    def get_supported_types(self) -> Dict[str, Any]:
        """Get supported runtimes and frameworks"""
        return self._request("GET", "/v1/supported-types")


# ==================== CLI ====================

def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="CreateOS CLI")
    parser.add_argument("--api-key", help="API key (or set CREATEOS_API_KEY)")
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # List projects
    list_parser = subparsers.add_parser("list", help="List projects")
    list_parser.add_argument("--limit", type=int, default=10)
    
    # Create project
    create_parser = subparsers.add_parser("create", help="Create project")
    create_parser.add_argument("name", help="Unique name")
    create_parser.add_argument("display_name", help="Display name")
    create_parser.add_argument("--type", default="upload", choices=["vcs", "image", "upload"])
    create_parser.add_argument("--runtime", default="node:20")
    create_parser.add_argument("--port", type=int, default=3000)
    
    # Deploy
    deploy_parser = subparsers.add_parser("deploy", help="Trigger deployment")
    deploy_parser.add_argument("project_id")
    deploy_parser.add_argument("--branch")
    
    # Upload
    upload_parser = subparsers.add_parser("upload", help="Upload files")
    upload_parser.add_argument("project_id")
    upload_parser.add_argument("path", help="Directory or zip file")
    
    # Status
    status_parser = subparsers.add_parser("status", help="Get deployment status")
    status_parser.add_argument("project_id")
    status_parser.add_argument("deployment_id", nargs="?")
    
    # Logs
    logs_parser = subparsers.add_parser("logs", help="Get logs")
    logs_parser.add_argument("project_id")
    logs_parser.add_argument("deployment_id")
    logs_parser.add_argument("--type", choices=["build", "runtime"], default="runtime")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    client = CreateOS(api_key=args.api_key)
    
    if args.command == "list":
        result = client.list_projects(limit=args.limit)
    elif args.command == "create":
        result = client.create_project(args.name, args.display_name, args.type, args.runtime, args.port)
    elif args.command == "deploy":
        result = client.trigger_deployment(args.project_id, args.branch)
    elif args.command == "upload":
        if Path(args.path).is_dir():
            result = client.upload_directory(args.project_id, args.path)
        else:
            result = client.upload_zip(args.project_id, args.path)
    elif args.command == "status":
        if args.deployment_id:
            result = client.get_deployment(args.project_id, args.deployment_id)
        else:
            result = client.list_deployments(args.project_id, limit=5)
    elif args.command == "logs":
        if args.type == "build":
            result = client.get_build_logs(args.project_id, args.deployment_id)
        else:
            result = client.get_runtime_logs(args.project_id, args.deployment_id)
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
