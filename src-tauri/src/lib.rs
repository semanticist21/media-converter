mod commands;
mod converters;
mod exif;
mod models;
mod state;

use state::FileListState;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(FileListState(Arc::new(Mutex::new(Vec::new()))))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::add_file_from_path,
            commands::add_file_from_url,
            commands::remove_file,
            commands::clear_files,
            commands::remove_converted_files,
            commands::get_file_list,
            commands::save_file,
            commands::get_cpu_count,
            commands::convert_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
