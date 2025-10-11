use serde::Serialize;

// EXIF metadata structure
#[derive(Serialize, Clone)]
pub struct ExifData {
    pub date_time: Option<String>,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub iso: Option<String>,
    pub shutter_speed: Option<String>,
    pub aperture: Option<String>,
    pub focal_length: Option<String>,
    pub orientation: Option<u32>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub gps_latitude: Option<String>,
    pub gps_longitude: Option<String>,
}

// File timestamps for preservation
#[derive(Clone)]
pub struct FileTimestamps {
    pub accessed: std::time::SystemTime,
    pub modified: std::time::SystemTime,
}

// Internal file item (stores actual image bytes)
pub struct FileItem {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub mime_type: String,
    pub data: Vec<u8>,
    pub source_path: Option<String>,
    pub source_url: Option<String>,
    pub exif: Option<ExifData>,
    pub exif_raw_bytes: Option<Vec<u8>>, // Raw EXIF data for preservation
    pub timestamps: Option<FileTimestamps>,
    pub converted: bool,
}

// Response type for frontend (no image bytes)
#[derive(Serialize, Clone)]
pub struct FileItemResponse {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub mime_type: String,
    pub source_path: Option<String>,
    pub source_url: Option<String>,
    pub exif: Option<ExifData>,
    pub converted: bool,
}

impl FileItem {
    pub fn to_response(&self) -> FileItemResponse {
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

// Conversion result for each file
#[derive(Serialize)]
pub struct ConversionResult {
    pub original_name: String,
    pub converted_name: String,
    pub original_size: u64,
    pub converted_size: u64,
    pub saved_path: String,
}

// Event payload for conversion progress
#[derive(Serialize, Clone)]
pub struct ConversionProgress {
    pub file_id: String,
    pub file_name: String,
    pub status: String, // "converting" | "completed" | "error"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>, // Error message for failed conversions
}
