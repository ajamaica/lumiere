// NoChat runtime bridge — stores the PluginRuntime reference
// Pattern matches BlueBubbles: setBlueBubblesRuntime / getBlueBubblesRuntime

let runtime: any = null

export function setNoChatRuntime(next: any): void {
  runtime = next
}

export function getNoChatRuntime(): any {
  if (!runtime) {
    throw new Error('NoChat runtime not initialized — register() must be called first')
  }
  return runtime
}
