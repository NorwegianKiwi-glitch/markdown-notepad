#[tauri::command]
fn move_to_trash(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebKitGTK's compositor/GPU process adds a large, mostly-idle memory
    // footprint that this app's static UI doesn't benefit from. Must be set
    // before the webview is created, and only applies on Linux.
    #[cfg(target_os = "linux")]
    unsafe {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        // FTL, JavaScriptCore's top JIT tier, pulls in libLLVM (~30MB resident)
        // to optimize hot numeric loops. This app's JS is UI/event-handler
        // code, not the kind of workload FTL targets, so the DFG tier below
        // it is plenty and this avoids loading LLVM at all.
        std::env::set_var("JSC_useFTLJIT", "0");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![move_to_trash])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
