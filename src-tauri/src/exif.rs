use std::io::Cursor;

use img_parts::jpeg::Jpeg;
use img_parts::png::Png;
use img_parts::webp::WebP;
use img_parts::{Bytes, ImageEXIF};

use crate::models::ExifData;

// Helper function to extract EXIF data from image bytes
pub fn extract_exif_from_bytes(data: &[u8]) -> Option<ExifData> {
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

// Helper function to extract raw EXIF bytes from image
pub fn extract_exif_raw_bytes(data: &[u8]) -> Option<Vec<u8>> {
    // Try JPEG first
    if let Ok(jpeg) = Jpeg::from_bytes(Bytes::copy_from_slice(data)) {
        if let Some(exif) = jpeg.exif() {
            return Some(exif.to_vec());
        }
    }

    // Try PNG
    if let Ok(png) = Png::from_bytes(Bytes::copy_from_slice(data)) {
        if let Some(exif) = png.exif() {
            return Some(exif.to_vec());
        }
    }

    // Try WebP
    if let Ok(webp) = WebP::from_bytes(Bytes::copy_from_slice(data)) {
        if let Some(exif) = webp.exif() {
            return Some(exif.to_vec());
        }
    }

    None
}
