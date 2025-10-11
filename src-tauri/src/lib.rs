use image::ImageEncoder;
use serde::Serialize;
use std::io::Cursor;
use std::sync::Mutex;
use tauri::Emitter;
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

// File timestamps for preservation
#[derive(Clone)]
struct FileTimestamps {
    accessed: std::time::SystemTime,
    modified: std::time::SystemTime,
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
    timestamps: Option<FileTimestamps>,
    converted: bool,
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
    converted: bool,
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
            converted: self.converted,
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

    // Extract timestamps from original file
    let timestamps = std::fs::metadata(&path)
        .ok()
        .and_then(|metadata| {
            let accessed = metadata.accessed().ok()?;
            let modified = metadata.modified().ok()?;
            Some(FileTimestamps { accessed, modified })
        });

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
        timestamps,
        converted: false,
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

    // Create file item (URL files don't have timestamps)
    let file_item = FileItem {
        id: Uuid::new_v4().to_string(),
        name: file_name,
        size: data.len() as u64,
        mime_type: content_type,
        data,
        source_path: None,
        source_url: Some(url),
        exif,
        timestamps: None,
        converted: false,
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

#[tauri::command]
fn save_file(
    id: String,
    save_path: String,
    state: tauri::State<FileListState>,
) -> Result<(), String> {
    let file_list = state.0.lock().unwrap();
    let file = file_list
        .iter()
        .find(|f| f.id == id)
        .ok_or_else(|| "File not found".to_string())?;

    // Write file data to the specified path
    std::fs::write(&save_path, &file.data)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(())
}

// Conversion result for each file
#[derive(Serialize)]
struct ConversionResult {
    original_name: String,
    converted_name: String,
    original_size: u64,
    converted_size: u64,
    saved_path: String,
}

// Event payload for conversion progress
#[derive(Serialize, Clone)]
struct ConversionProgress {
    file_id: String,
    file_name: String,
    status: String, // "converting" | "completed" | "error"
}

#[tauri::command]
async fn convert_images(
    target_format: String,
    quality: u8,
    _preserve_exif: bool,
    preserve_timestamps: bool,
    output_dir: String,
    window: tauri::Window,
    state: tauri::State<'_, FileListState>,
) -> Result<Vec<ConversionResult>, String> {
    // Clone file list data to release Mutex lock quickly, filter out already converted files
    let files_to_convert: Vec<(String, String, u64, Vec<u8>, Option<FileTimestamps>)> = {
        let file_list = state.0.lock().unwrap();

        file_list
            .iter()
            .filter(|f| !f.converted) // Skip already converted files
            .map(|f| {
                (
                    f.id.clone(),
                    f.name.clone(),
                    f.size,
                    f.data.clone(),
                    f.timestamps.clone(),
                )
            })
            .collect()
    }; // Mutex lock released here

    if files_to_convert.is_empty() {
        return Err("No files to convert (all files already converted)".to_string());
    }

    // Perform heavy conversion work in blocking thread pool
    let results = tokio::task::spawn_blocking(move || {
        let mut results = Vec::new();

        for (id, name, original_size, data, timestamps) in files_to_convert {
            // Emit conversion start event
            let _ = window.emit(
                "conversion-progress",
                ConversionProgress {
                    file_id: id.clone(),
                    file_name: name.clone(),
                    status: "converting".to_string(),
                },
            );

            // Load image from bytes
            let img = match image::load_from_memory(&data) {
                Ok(img) => img,
                Err(e) => {
                    let _ = window.emit(
                        "conversion-progress",
                        ConversionProgress {
                            file_id: id.clone(),
                            file_name: name.clone(),
                            status: "error".to_string(),
                        },
                    );
                    return Err(format!("Failed to decode image {}: {}", name, e));
                }
            };

            // Generate output filename
            let output_name = format!(
                "{}.{}",
                std::path::Path::new(&name)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("image"),
                target_format
            );

            let output_path = std::path::Path::new(&output_dir).join(&output_name);

            // Convert based on target format
            let converted_data = match target_format.as_str() {
                "webp" => convert_to_webp(&img, quality)?,
                "jpeg" | "jpg" => convert_to_jpeg(&img, quality)?,
                "png" => convert_to_png(&img, quality)?,
                _ => {
                    // Use image crate's default encoder for other formats
                    let mut buffer = Vec::new();
                    img.write_to(
                        &mut std::io::Cursor::new(&mut buffer),
                        image::ImageFormat::from_extension(&target_format)
                            .ok_or_else(|| format!("Unsupported format: {}", target_format))?,
                    )
                    .map_err(|e| format!("Failed to encode {}: {}", target_format, e))?;
                    buffer
                }
            };

            // Write to file
            std::fs::write(&output_path, &converted_data)
                .map_err(|e| format!("Failed to write file: {}", e))?;

            // Preserve timestamps if requested and available
            if preserve_timestamps {
                if let Some(ref ts) = timestamps {
                    let _ = filetime::set_file_times(
                        &output_path,
                        filetime::FileTime::from_system_time(ts.accessed),
                        filetime::FileTime::from_system_time(ts.modified),
                    );
                }
            }

            // Emit conversion complete event
            let _ = window.emit(
                "conversion-progress",
                ConversionProgress {
                    file_id: id.clone(),
                    file_name: name.clone(),
                    status: "completed".to_string(),
                },
            );

            results.push(ConversionResult {
                original_name: name,
                converted_name: output_name,
                original_size,
                converted_size: converted_data.len() as u64,
                saved_path: output_path.to_string_lossy().to_string(),
            });
        }

        Ok::<Vec<ConversionResult>, String>(results)
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))??;

    // Mark converted files
    {
        let mut file_list = state.0.lock().unwrap();
        for result in &results {
            if let Some(file) = file_list
                .iter_mut()
                .find(|f| f.name == result.original_name)
            {
                file.converted = true;
            }
        }
    }

    Ok(results)
}

// Convert to WebP using libwebp (better compression)
fn convert_to_webp(img: &image::DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    use webp::Encoder;

    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();

    let encoder = Encoder::from_rgba(&rgba_img, width, height);
    let webp_data = encoder.encode(quality as f32);

    Ok(webp_data.to_vec())
}

// Convert to JPEG
fn convert_to_jpeg(img: &image::DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, quality);

    let rgb_img = img.to_rgb8();
    encoder
        .encode(
            rgb_img.as_raw(),
            img.width(),
            img.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| format!("JPEG encoding failed: {}", e))?;

    Ok(buffer)
}

// Convert to PNG
fn convert_to_png(img: &image::DynamicImage, _compression: u8) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buffer);

    let rgba_img = img.to_rgba8();
    encoder
        .write_image(
            rgba_img.as_raw(),
            img.width(),
            img.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("PNG encoding failed: {}", e))?;

    Ok(buffer)
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
            get_file_list,
            save_file,
            convert_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
