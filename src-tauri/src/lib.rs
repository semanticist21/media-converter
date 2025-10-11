use serde::Serialize;
use std::io::Cursor;

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

#[derive(Serialize)]
struct FetchImageResult {
    data: Vec<u8>,
    content_type: String,
    file_name: String,
    exif: Option<ExifData>,
}

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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn fetch_image_from_url(url: String) -> Result<FetchImageResult, String> {
    // Fetch image from URL using reqwest asynchronously
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    // Check if response is successful
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

    // Read response body as bytes asynchronously
    let data = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?
        .to_vec();

    // Extract EXIF data from the image bytes
    let exif = extract_exif_from_bytes(&data);

    Ok(FetchImageResult {
        data,
        content_type,
        file_name,
        exif,
    })
}

#[tauri::command]
fn extract_exif(data: Vec<u8>) -> Result<Option<ExifData>, String> {
    Ok(extract_exif_from_bytes(&data))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_image_from_url,
            extract_exif
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
