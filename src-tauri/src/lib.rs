use serde::Serialize;
use std::io::Cursor;
use std::sync::Mutex;
use uuid::Uuid;

// EXIF metadata structure
#[derive(Serialize, Clone)]
struct ExifData {
    date_time: Option<String>,
    camera_make: Option<String>,
    camera_model: Option<String>,
    iso: Option<String>,
    shutter_speed: Option<String>,
    aperture: Option<String>,
    focal_length: Option<String>,
    orientation: Option<u32>,
    width: Option<u32>,
    height: Option<u32>,
    gps_latitude: Option<String>,
    gps_longitude: Option<String>,
}

// Internal file item (stores actual image bytes)
struct FileItem {
    id: String,
    name: String,
    size: u64,
    mime_type: String,
    data: Vec<u8>,
    source_path: Option<String>,
    source_url: Option<String>,
    exif: Option<ExifData>,
}

// Response type for frontend (no image bytes)
#[derive(Serialize, Clone)]
struct FileItemResponse {
    id: String,
    name: String,
    size: u64,
    mime_type: String,
    source_path: Option<String>,
    source_url: Option<String>,
    exif: Option<ExifData>,
}

impl FileItem {
    fn to_response(&self) -> FileItemResponse {
        FileItemResponse {
            id: self.id.clone(),
            name: self.name.clone(),
            size: self.size,
            mime_type: self.mime_type.clone(),
            source_path: self.source_path.clone(),
            source_url: self.source_url.clone(),
            exif: self.exif.clone(),
        }
    }
}

// Global state for file list
struct FileListState(Mutex<Vec<FileItem>>);

// Helper function to extract EXIF data from image bytes
fn extract_exif_from_bytes(data: &[u8]) -> Option<ExifData> {
    let mut cursor = Cursor::new(data);
    let exif_reader = exif::Reader::new();

    match exif_reader.read_from_container(&mut cursor) {
        Ok(exif) => {
            let mut exif_data = ExifData {
                date_time: None,
                camera_make: None,
                camera_model: None,
                iso: None,
                shutter_speed: None,
                aperture: None,
                focal_length: None,
                orientation: None,
                width: None,
                height: None,
                gps_latitude: None,
                gps_longitude: None,
            };

            // Extract DateTime
            if let Some(field) = exif.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY) {
                exif_data.date_time = Some(field.display_value().to_string());
            }

            // Extract Camera Make
            if let Some(field) = exif.get_field(exif::Tag::Make, exif::In::PRIMARY) {
                exif_data.camera_make = Some(field.display_value().to_string());
            }

            // Extract Camera Model
            if let Some(field) = exif.get_field(exif::Tag::Model, exif::In::PRIMARY) {
                exif_data.camera_model = Some(field.display_value().to_string());
            }

            // Extract ISO
            if let Some(field) =
                exif.get_field(exif::Tag::PhotographicSensitivity, exif::In::PRIMARY)
            {
                exif_data.iso = Some(field.display_value().to_string());
            }

            // Extract Shutter Speed
            if let Some(field) = exif.get_field(exif::Tag::ExposureTime, exif::In::PRIMARY) {
                exif_data.shutter_speed = Some(field.display_value().to_string());
            }

            // Extract Aperture
            if let Some(field) = exif.get_field(exif::Tag::FNumber, exif::In::PRIMARY) {
                exif_data.aperture = Some(field.display_value().to_string());
            }

            // Extract Focal Length
            if let Some(field) = exif.get_field(exif::Tag::FocalLength, exif::In::PRIMARY) {
                exif_data.focal_length = Some(field.display_value().to_string());
            }

            // Extract Orientation
            if let Some(field) = exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY) {
                if let exif::Value::Short(ref v) = field.value {
                    if !v.is_empty() {
                        exif_data.orientation = Some(v[0] as u32);
                    }
                }
            }

            // Extract Image Width
            if let Some(field) = exif.get_field(exif::Tag::PixelXDimension, exif::In::PRIMARY) {
                if let exif::Value::Long(ref v) = field.value {
                    if !v.is_empty() {
                        exif_data.width = Some(v[0]);
                    }
                }
            }

            // Extract Image Height
            if let Some(field) = exif.get_field(exif::Tag::PixelYDimension, exif::In::PRIMARY) {
                if let exif::Value::Long(ref v) = field.value {
                    if !v.is_empty() {
                        exif_data.height = Some(v[0]);
                    }
                }
            }

            // Extract GPS Latitude
            if let Some(field) = exif.get_field(exif::Tag::GPSLatitude, exif::In::PRIMARY) {
                exif_data.gps_latitude = Some(field.display_value().to_string());
            }

            // Extract GPS Longitude
            if let Some(field) = exif.get_field(exif::Tag::GPSLongitude, exif::In::PRIMARY) {
                exif_data.gps_longitude = Some(field.display_value().to_string());
            }

            Some(exif_data)
        }
        Err(_) => None,
    }
}

//=============================================================================
// Tauri Commands
//=============================================================================

#[tauri::command]
fn add_file_from_path(
    path: String,
    state: tauri::State<FileListState>,
) -> Result<FileItemResponse, String> {
    // Read file from disk
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Extract file name
    let file_name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Infer MIME type from extension
    let extension = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    let mime_type = format!("image/{}", extension);

    // Extract EXIF
    let exif = extract_exif_from_bytes(&data);

    // Check for duplicates
    let mut file_list = state.0.lock().unwrap();
    if file_list.iter().any(|f| f.source_path.as_ref() == Some(&path)) {
        return Err("File already added".to_string());
    }

    // Create file item
    let file_item = FileItem {
        id: Uuid::new_v4().to_string(),
        name: file_name,
        size: data.len() as u64,
        mime_type,
        data,
        source_path: Some(path),
        source_url: None,
        exif,
    };

    let response = file_item.to_response();
    file_list.push(file_item);

    Ok(response)
}

#[tauri::command]
async fn add_file_from_url(
    url: String,
    state: tauri::State<'_, FileListState>,
) -> Result<FileItemResponse, String> {
    // Fetch image from URL
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch image ({})", response.status()));
    }

    // Get content type
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    // Extract file name from URL
    let mut file_name = url
        .split('/')
        .filter(|s| !s.is_empty())
        .last()
        .unwrap_or("image")
        .to_string();

    // If file name doesn't have extension, infer from content type
    if !file_name.contains('.') {
        if let Some(ext) = content_type.split('/').nth(1) {
            let ext = ext.split(';').next().unwrap_or("");
            if !ext.is_empty() {
                file_name = format!("{}.{}", file_name, ext);
            }
        }
    }

    // Read response body as bytes
    let data = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?
        .to_vec();

    // Extract EXIF
    let exif = extract_exif_from_bytes(&data);

    // Check for duplicates
    let mut file_list = state.0.lock().unwrap();
    if file_list.iter().any(|f| f.source_url.as_ref() == Some(&url)) {
        return Err("File already added".to_string());
    }

    // Create file item
    let file_item = FileItem {
        id: Uuid::new_v4().to_string(),
        name: file_name,
        size: data.len() as u64,
        mime_type: content_type,
        data,
        source_path: None,
        source_url: Some(url),
        exif,
    };

    let response = file_item.to_response();
    file_list.push(file_item);

    Ok(response)
}

#[tauri::command]
fn remove_file(id: String, state: tauri::State<FileListState>) -> Result<(), String> {
    let mut file_list = state.0.lock().unwrap();
    let original_len = file_list.len();
    file_list.retain(|f| f.id != id);

    if file_list.len() == original_len {
        Err("File not found".to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn clear_files(state: tauri::State<FileListState>) -> Result<(), String> {
    let mut file_list = state.0.lock().unwrap();
    file_list.clear();
    Ok(())
}

#[tauri::command]
fn get_file_list(state: tauri::State<FileListState>) -> Vec<FileItemResponse> {
    let file_list = state.0.lock().unwrap();
    file_list.iter().map(|f| f.to_response()).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(FileListState(Mutex::new(Vec::new())))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            add_file_from_path,
            add_file_from_url,
            remove_file,
            clear_files,
            get_file_list
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
