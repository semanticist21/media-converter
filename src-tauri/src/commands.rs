use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::{mpsc, Semaphore};
use uuid::Uuid;

use crate::converters::{convert_to_avif, convert_to_jpeg, convert_to_png, convert_to_webp};
use crate::exif::{extract_exif_from_bytes, extract_exif_raw_bytes};
use crate::models::{
    ConversionProgress, ConversionResult, FileItem, FileItemResponse, FileTimestamps,
};
use crate::state::FileListState;

#[tauri::command]
pub fn add_file_from_path(
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
    let exif_raw_bytes = extract_exif_raw_bytes(&data);

    // Extract timestamps from original file
    let timestamps = std::fs::metadata(&path).ok().and_then(|metadata| {
        let accessed = metadata.accessed().ok()?;
        let modified = metadata.modified().ok()?;
        Some(FileTimestamps { accessed, modified })
    });

    // Create file item
    let mut file_list = state.0.lock().unwrap();

    // Check for duplicate path - only block if unconverted file exists
    // Allows re-adding converted files for re-conversion
    if file_list
        .iter()
        .any(|f| f.source_path.as_ref() == Some(&path) && !f.converted)
    {
        return Err(format!("File already added: {}", path));
    }

    let file_item = FileItem {
        id: Uuid::new_v4().to_string(),
        name: file_name,
        size: data.len() as u64,
        mime_type,
        data,
        source_path: Some(path),
        source_url: None,
        exif,
        exif_raw_bytes,
        timestamps,
        converted: false,
        converted_path: None,
    };

    let response = file_item.to_response();
    file_list.push(file_item);

    Ok(response)
}

#[tauri::command]
pub async fn add_file_from_url(
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

    // Validate that content type is an image
    if !content_type.starts_with("image/") {
        return Err(format!(
            "URL does not point to an image (content-type: {})",
            content_type
        ));
    }

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
    let exif_raw_bytes = extract_exif_raw_bytes(&data);

    // Create file item (URL files don't have timestamps)
    let mut file_list = state.0.lock().unwrap();
    let file_item = FileItem {
        id: Uuid::new_v4().to_string(),
        name: file_name,
        size: data.len() as u64,
        mime_type: content_type,
        data,
        source_path: None,
        source_url: Some(url),
        exif,
        exif_raw_bytes,
        timestamps: None,
        converted: false,
        converted_path: None,
    };

    let response = file_item.to_response();
    file_list.push(file_item);

    Ok(response)
}

#[tauri::command]
pub fn remove_file(id: String, state: tauri::State<FileListState>) -> Result<(), String> {
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
pub fn clear_files(state: tauri::State<FileListState>) -> Result<(), String> {
    let mut file_list = state.0.lock().unwrap();
    file_list.clear();
    Ok(())
}

#[tauri::command]
pub fn remove_converted_files(state: tauri::State<FileListState>) -> Result<(), String> {
    let mut file_list = state.0.lock().unwrap();
    file_list.retain(|f| !f.converted);
    Ok(())
}

#[tauri::command]
pub fn get_file_list(state: tauri::State<FileListState>) -> Vec<FileItemResponse> {
    let file_list = state.0.lock().unwrap();
    file_list.iter().map(|f| f.to_response()).collect()
}

#[tauri::command]
pub fn save_file(
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
    std::fs::write(&save_path, &file.data).map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_cpu_count() -> usize {
    num_cpus::get()
}

#[tauri::command]
pub async fn convert_images(
    target_format: String,
    quality: u8,
    avif_speed: u8,
    preserve_exif: bool,
    preserve_timestamps: bool,
    output_dir: String,
    max_concurrent: usize,
    create_subfolder: bool,
    subfolder_name: String,
    url_files_fallback_dir: String,
    window: tauri::Window,
    state: tauri::State<'_, FileListState>,
) -> Result<Vec<ConversionResult>, String> {
    // Clone file list data to release Mutex lock quickly, filter out already converted files
    let files_to_convert: Vec<(
        String,
        String,
        u64,
        Vec<u8>,
        Option<Vec<u8>>,
        Option<FileTimestamps>,
        Option<String>,
    )> = {
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
                    f.exif_raw_bytes.clone(), // For img-parts (JPEG, PNG, WebP)
                    f.timestamps.clone(),
                    f.source_path.clone(), // For source directory mode
                )
            })
            .collect()
    }; // Mutex lock released here

    if files_to_convert.is_empty() {
        return Err("No files to convert (all files already converted)".to_string());
    }

    // Check if using source directory mode
    let use_source_dir = output_dir == "USE_SOURCE_DIR";

    // Determine concurrent processing count
    // 0 = auto (CPU cores), 1+ = manual value
    let concurrent_count = if max_concurrent == 0 {
        num_cpus::get()
    } else {
        max_concurrent
    };
    let semaphore = Arc::new(Semaphore::new(concurrent_count));

    // Create channel for ordered results
    let (result_tx, mut result_rx) = mpsc::channel(files_to_convert.len());

    // Clone state Arc for async tasks
    let state_arc = state.0.clone();

    // Process files concurrently with order preservation
    for (index, (id, name, original_size, data, exif_raw_bytes, timestamps, source_path)) in
        files_to_convert.into_iter().enumerate()
    {
        let window = window.clone();
        let target_format = target_format.clone();
        let output_dir = output_dir.clone();
        let subfolder_name = subfolder_name.clone();
        let url_fallback = url_files_fallback_dir.clone();
        let semaphore = Arc::clone(&semaphore);
        let result_tx = result_tx.clone();
        let avif_speed_clone = avif_speed;
        let state_clone = state_arc.clone();

        tokio::spawn(async move {
            // Acquire semaphore permit to limit concurrent processing
            let _permit = semaphore.acquire().await.unwrap();

            // Perform heavy conversion work in blocking thread pool
            let result = tokio::task::spawn_blocking(move || {
                // Emit conversion start event
                let _ = window.emit(
                    "conversion-progress",
                    ConversionProgress {
                        file_id: id.clone(),
                        file_name: name.clone(),
                        status: "converting".to_string(),
                        error_message: None,
                        saved_path: None,
                    },
                );

                // Load image from bytes
                let img = match image::load_from_memory(&data) {
                    Ok(img) => img,
                    Err(e) => {
                        // If standard decoding fails, try AVIF decoding
                        // AVIF decode → RGBA/RGB pixels → DynamicImage → target format
                        match avif_decode::Decoder::from_avif(&data) {
                            Ok(decoder) => {
                                match decoder.to_image() {
                                    Ok(avif_image) => {
                                        // Convert avif_decode::Image to image::DynamicImage
                                        match avif_image {
                                            avif_decode::Image::Rgba8(img) => {
                                                // RGBA8 → Vec<u8>
                                                let pixels: Vec<u8> = img.buf()
                                                    .iter()
                                                    .flat_map(|px| [px.r, px.g, px.b, px.a])
                                                    .collect();
                                                match image::RgbaImage::from_raw(
                                                    img.width() as u32,
                                                    img.height() as u32,
                                                    pixels,
                                                ) {
                                                    Some(rgba_img) => image::DynamicImage::ImageRgba8(rgba_img),
                                                    None => {
                                                        let error_msg = "Failed to create RGBA image from AVIF".to_string();
                                                        let _ = window.emit(
                                                            "conversion-progress",
                                                            ConversionProgress {
                                                                file_id: id.clone(),
                                                                file_name: name.clone(),
                                                                status: "error".to_string(),
                                                                error_message: Some(error_msg.clone()),
                                                                saved_path: None,
                                                            },
                                                        );
                                                        eprintln!("{}", error_msg);
                                                        return None;
                                                    }
                                                }
                                            }
                                            avif_decode::Image::Rgb8(img) => {
                                                // RGB8 → Vec<u8>
                                                let pixels: Vec<u8> = img.buf()
                                                    .iter()
                                                    .flat_map(|px| [px.r, px.g, px.b])
                                                    .collect();
                                                match image::RgbImage::from_raw(
                                                    img.width() as u32,
                                                    img.height() as u32,
                                                    pixels,
                                                ) {
                                                    Some(rgb_img) => image::DynamicImage::ImageRgb8(rgb_img),
                                                    None => {
                                                        let error_msg = "Failed to create RGB image from AVIF".to_string();
                                                        let _ = window.emit(
                                                            "conversion-progress",
                                                            ConversionProgress {
                                                                file_id: id.clone(),
                                                                file_name: name.clone(),
                                                                status: "error".to_string(),
                                                                error_message: Some(error_msg.clone()),
                                                                saved_path: None,
                                                            },
                                                        );
                                                        eprintln!("{}", error_msg);
                                                        return None;
                                                    }
                                                }
                                            }
                                            avif_decode::Image::Rgba16(img) => {
                                                // RGBA16 → RGBA8 conversion (simple downscaling)
                                                let pixels: Vec<u8> = img.buf()
                                                    .iter()
                                                    .flat_map(|px| [
                                                        (px.r >> 8) as u8,
                                                        (px.g >> 8) as u8,
                                                        (px.b >> 8) as u8,
                                                        (px.a >> 8) as u8,
                                                    ])
                                                    .collect();
                                                match image::RgbaImage::from_raw(
                                                    img.width() as u32,
                                                    img.height() as u32,
                                                    pixels,
                                                ) {
                                                    Some(rgba_img) => image::DynamicImage::ImageRgba8(rgba_img),
                                                    None => {
                                                        let error_msg = "Failed to create RGBA image from AVIF (16-bit)".to_string();
                                                        let _ = window.emit(
                                                            "conversion-progress",
                                                            ConversionProgress {
                                                                file_id: id.clone(),
                                                                file_name: name.clone(),
                                                                status: "error".to_string(),
                                                                error_message: Some(error_msg.clone()),
                                                                saved_path: None,
                                                            },
                                                        );
                                                        eprintln!("{}", error_msg);
                                                        return None;
                                                    }
                                                }
                                            }
                                            avif_decode::Image::Rgb16(img) => {
                                                // RGB16 → RGB8 conversion
                                                let pixels: Vec<u8> = img.buf()
                                                    .iter()
                                                    .flat_map(|px| [
                                                        (px.r >> 8) as u8,
                                                        (px.g >> 8) as u8,
                                                        (px.b >> 8) as u8,
                                                    ])
                                                    .collect();
                                                match image::RgbImage::from_raw(
                                                    img.width() as u32,
                                                    img.height() as u32,
                                                    pixels,
                                                ) {
                                                    Some(rgb_img) => image::DynamicImage::ImageRgb8(rgb_img),
                                                    None => {
                                                        let error_msg = "Failed to create RGB image from AVIF (16-bit)".to_string();
                                                        let _ = window.emit(
                                                            "conversion-progress",
                                                            ConversionProgress {
                                                                file_id: id.clone(),
                                                                file_name: name.clone(),
                                                                status: "error".to_string(),
                                                                error_message: Some(error_msg.clone()),
                                                                saved_path: None,
                                                            },
                                                        );
                                                        eprintln!("{}", error_msg);
                                                        return None;
                                                    }
                                                }
                                            }
                                            avif_decode::Image::Gray8(img) => {
                                                // Gray8 → Luma8
                                                let pixels: Vec<u8> = img.buf()
                                                    .iter()
                                                    .map(|px| px.value())
                                                    .collect();
                                                match image::GrayImage::from_raw(
                                                    img.width() as u32,
                                                    img.height() as u32,
                                                    pixels,
                                                ) {
                                                    Some(gray_img) => image::DynamicImage::ImageLuma8(gray_img),
                                                    None => {
                                                        let error_msg = "Failed to create Gray image from AVIF".to_string();
                                                        let _ = window.emit(
                                                            "conversion-progress",
                                                            ConversionProgress {
                                                                file_id: id.clone(),
                                                                file_name: name.clone(),
                                                                status: "error".to_string(),
                                                                error_message: Some(error_msg.clone()),
                                                                saved_path: None,
                                                            },
                                                        );
                                                        eprintln!("{}", error_msg);
                                                        return None;
                                                    }
                                                }
                                            }
                                            avif_decode::Image::Gray16(img) => {
                                                // Gray16 → Luma8 conversion
                                                let pixels: Vec<u8> = img.buf()
                                                    .iter()
                                                    .map(|px| (px.value() >> 8) as u8)
                                                    .collect();
                                                match image::GrayImage::from_raw(
                                                    img.width() as u32,
                                                    img.height() as u32,
                                                    pixels,
                                                ) {
                                                    Some(gray_img) => image::DynamicImage::ImageLuma8(gray_img),
                                                    None => {
                                                        let error_msg = "Failed to create Gray image from AVIF (16-bit)".to_string();
                                                        let _ = window.emit(
                                                            "conversion-progress",
                                                            ConversionProgress {
                                                                file_id: id.clone(),
                                                                file_name: name.clone(),
                                                                status: "error".to_string(),
                                                                error_message: Some(error_msg.clone()),
                                                                saved_path: None,
                                                            },
                                                        );
                                                        eprintln!("{}", error_msg);
                                                        return None;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Err(to_image_err) => {
                                        let error_msg = format!("Failed to convert AVIF to image: {}", to_image_err);
                                        let _ = window.emit(
                                            "conversion-progress",
                                            ConversionProgress {
                                                file_id: id.clone(),
                                                file_name: name.clone(),
                                                status: "error".to_string(),
                                                error_message: Some(error_msg.clone()),
                                                saved_path: None,
                                            },
                                        );
                                        eprintln!("{}", error_msg);
                                        return None;
                                    }
                                }
                            }
                            Err(avif_err) => {
                                // Both standard and AVIF decoding failed
                                let error_msg = format!("Failed to decode image: {} (AVIF decode also failed: {})", e, avif_err);
                                let _ = window.emit(
                                    "conversion-progress",
                                    ConversionProgress {
                                        file_id: id.clone(),
                                        file_name: name.clone(),
                                        status: "error".to_string(),
                                        error_message: Some(error_msg.clone()),
                                        saved_path: None,
                                    },
                                );
                                eprintln!("{}", error_msg);
                                return None;
                            }
                        }
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

                // Determine output directory
                let output_path = if use_source_dir {
                    // Use source directory mode
                    match &source_path {
                        Some(path) => {
                            // Extract directory from source path
                            let source_dir = std::path::Path::new(path)
                                .parent()
                                .ok_or_else(|| "Failed to get source directory".to_string());

                            match source_dir {
                                Ok(dir) => {
                                    // Determine final directory based on subfolder settings
                                    let final_dir = if create_subfolder && !subfolder_name.is_empty() {
                                        // Create subfolder if it doesn't exist
                                        let subfolder_path = dir.join(&subfolder_name);
                                        if !subfolder_path.exists() {
                                            if let Err(e) = std::fs::create_dir_all(&subfolder_path) {
                                                let error_msg = format!("Failed to create subfolder: {}", e);
                                                let _ = window.emit(
                                                    "conversion-progress",
                                                    ConversionProgress {
                                                        file_id: id.clone(),
                                                        file_name: name.clone(),
                                                        status: "error".to_string(),
                                                        error_message: Some(error_msg.clone()),
                                                        saved_path: None,
                                                    },
                                                );
                                                eprintln!("{}", error_msg);
                                                return None;
                                            }
                                        }
                                        subfolder_path
                                    } else {
                                        // Save directly in source directory
                                        dir.to_path_buf()
                                    };

                                    final_dir.join(&output_name)
                                }
                                Err(e) => {
                                    let error_msg =
                                        format!("Failed to get source directory: {}", e);
                                    let _ = window.emit(
                                        "conversion-progress",
                                        ConversionProgress {
                                            file_id: id.clone(),
                                            file_name: name.clone(),
                                            status: "error".to_string(),
                                            error_message: Some(error_msg.clone()),
                                            saved_path: None,
                                        },
                                    );
                                    eprintln!("{}", error_msg);
                                    return None;
                                }
                            }
                        }
                        None => {
                            // URL 파일의 경우 fallback 디렉토리 사용
                            let fallback_dir = if url_fallback.is_empty() {
                                // 빈 문자열이면 Downloads 폴더 사용
                                match dirs::download_dir() {
                                    Some(dir) => dir,
                                    None => {
                                        let error_msg = "Cannot determine Downloads folder".to_string();
                                        let _ = window.emit(
                                            "conversion-progress",
                                            ConversionProgress {
                                                file_id: id.clone(),
                                                file_name: name.clone(),
                                                status: "error".to_string(),
                                                error_message: Some(error_msg.clone()),
                                                saved_path: None,
                                            },
                                        );
                                        eprintln!("{}", error_msg);
                                        return None;
                                    }
                                }
                            } else {
                                // 사용자가 지정한 폴더 사용
                                std::path::PathBuf::from(&url_fallback)
                            };

                            // Subfolder 처리
                            let final_dir = if create_subfolder && !subfolder_name.is_empty() {
                                let subfolder_path = fallback_dir.join(&subfolder_name);
                                if !subfolder_path.exists() {
                                    if let Err(e) = std::fs::create_dir_all(&subfolder_path) {
                                        let error_msg = format!("Failed to create subfolder: {}", e);
                                        let _ = window.emit(
                                            "conversion-progress",
                                            ConversionProgress {
                                                file_id: id.clone(),
                                                file_name: name.clone(),
                                                status: "error".to_string(),
                                                error_message: Some(error_msg.clone()),
                                                saved_path: None,
                                            },
                                        );
                                        eprintln!("{}", error_msg);
                                        return None;
                                    }
                                }
                                subfolder_path
                            } else {
                                fallback_dir
                            };

                            final_dir.join(&output_name)
                        }
                    }
                } else {
                    std::path::Path::new(&output_dir).join(&output_name)
                };

                // Check if file already exists at output path
                if output_path.exists() {
                    let _ = window.emit(
                        "conversion-progress",
                        ConversionProgress {
                            file_id: id.clone(),
                            file_name: name.clone(),
                            status: "skipped".to_string(),
                            error_message: Some("File already exists".to_string()),
                            saved_path: None,
                        },
                    );
                    return None;
                }

                // Convert based on target format
                let exif_to_use = if preserve_exif {
                    exif_raw_bytes.as_deref()
                } else {
                    None
                };
                let converted_data = match target_format.as_str() {
                    "error" => {
                        // Dev mode: intentional error for testing
                        let error_msg = "Intentional error for testing (dev mode)".to_string();
                        let _ = window.emit(
                            "conversion-progress",
                            ConversionProgress {
                                file_id: id.clone(),
                                file_name: name.clone(),
                                status: "error".to_string(),
                                error_message: Some(error_msg.clone()),
                                saved_path: None,
                            },
                        );
                        eprintln!("{}", error_msg);
                        return None;
                    }
                    "webp" => match convert_to_webp(&img, quality, exif_to_use) {
                        Ok(data) => data,
                        Err(e) => {
                            let _ = window.emit(
                                "conversion-progress",
                                ConversionProgress {
                                    file_id: id.clone(),
                                    file_name: name.clone(),
                                    status: "error".to_string(),
                                    error_message: Some(e.clone()),
                                    saved_path: None,
                                },
                            );
                            eprintln!("{}", e);
                            return None;
                        }
                    },
                    "jpeg" | "jpg" => match convert_to_jpeg(&img, quality, exif_to_use) {
                        Ok(data) => data,
                        Err(e) => {
                            let _ = window.emit(
                                "conversion-progress",
                                ConversionProgress {
                                    file_id: id.clone(),
                                    file_name: name.clone(),
                                    status: "error".to_string(),
                                    error_message: Some(e.clone()),
                                    saved_path: None,
                                },
                            );
                            eprintln!("{}", e);
                            return None;
                        }
                    },
                    "png" => match convert_to_png(&img, quality, exif_to_use) {
                        Ok(data) => data,
                        Err(e) => {
                            let _ = window.emit(
                                "conversion-progress",
                                ConversionProgress {
                                    file_id: id.clone(),
                                    file_name: name.clone(),
                                    status: "error".to_string(),
                                    error_message: Some(e.clone()),
                                    saved_path: None,
                                },
                            );
                            eprintln!("{}", e);
                            return None;
                        }
                    },
                    "avif" => match convert_to_avif(&img, quality, avif_speed_clone, exif_to_use) {
                        Ok(data) => data,
                        Err(e) => {
                            let _ = window.emit(
                                "conversion-progress",
                                ConversionProgress {
                                    file_id: id.clone(),
                                    file_name: name.clone(),
                                    status: "error".to_string(),
                                    error_message: Some(e.clone()),
                                    saved_path: None,
                                },
                            );
                            eprintln!("{}", e);
                            return None;
                        }
                    },
                    "tiff" => {
                        // TIFF: Basic encoding without EXIF preservation
                        let mut buffer = Vec::new();
                        match img.write_to(
                            &mut std::io::Cursor::new(&mut buffer),
                            image::ImageFormat::Tiff,
                        ) {
                            Ok(_) => buffer,
                            Err(e) => {
                                let error_msg = format!("TIFF encoding failed: {}", e);
                                let _ = window.emit(
                                    "conversion-progress",
                                    ConversionProgress {
                                        file_id: id.clone(),
                                        file_name: name.clone(),
                                        status: "error".to_string(),
                                        error_message: Some(error_msg.clone()),
                                        saved_path: None,
                                    },
                                );
                                eprintln!("{}", error_msg);
                                return None;
                            }
                        }
                    }
                    _ => {
                        // Use image crate's default encoder for other formats
                        let mut buffer = Vec::new();
                        let format = match image::ImageFormat::from_extension(&target_format) {
                            Some(fmt) => fmt,
                            None => {
                                let error_msg = format!("Unsupported format: {}", target_format);
                                let _ = window.emit(
                                    "conversion-progress",
                                    ConversionProgress {
                                        file_id: id.clone(),
                                        file_name: name.clone(),
                                        status: "error".to_string(),
                                        error_message: Some(error_msg.clone()),
                                        saved_path: None,
                                    },
                                );
                                eprintln!("{}", error_msg);
                                return None;
                            }
                        };

                        match img.write_to(&mut std::io::Cursor::new(&mut buffer), format) {
                            Ok(_) => buffer,
                            Err(e) => {
                                let error_msg =
                                    format!("Failed to encode {}: {}", target_format, e);
                                let _ = window.emit(
                                    "conversion-progress",
                                    ConversionProgress {
                                        file_id: id.clone(),
                                        file_name: name.clone(),
                                        status: "error".to_string(),
                                        error_message: Some(error_msg.clone()),
                                        saved_path: None,
                                    },
                                );
                                eprintln!("{}", error_msg);
                                return None;
                            }
                        }
                    }
                };

                // Write to file
                if let Err(e) = std::fs::write(&output_path, &converted_data) {
                    let error_msg = format!("Failed to write file: {}", e);
                    let _ = window.emit(
                        "conversion-progress",
                        ConversionProgress {
                            file_id: id.clone(),
                            file_name: name.clone(),
                            status: "error".to_string(),
                            error_message: Some(error_msg.clone()),
                            saved_path: None,
                        },
                    );
                    eprintln!("{}", error_msg);
                    return None;
                }

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
                        error_message: None,
                        saved_path: Some(output_path.to_string_lossy().to_string()),
                    },
                );

                // Mark file as converted immediately and store converted path
                {
                    let mut file_list = state_clone.lock().unwrap();
                    if let Some(file) = file_list.iter_mut().find(|f| f.id == id) {
                        file.converted = true;
                        file.converted_path = Some(output_path.to_string_lossy().to_string());
                    }
                }

                // Return conversion result
                Some(ConversionResult {
                    original_name: name,
                    converted_name: output_name,
                    original_size,
                    converted_size: converted_data.len() as u64,
                    saved_path: output_path.to_string_lossy().to_string(),
                })
            })
            .await
            .ok()
            .flatten();

            // Send result with index to channel
            let _ = result_tx.send((index, result)).await;
        });
    }

    // Close sender to signal completion
    drop(result_tx);

    // Collect results from channel
    let mut indexed_results = Vec::new();
    while let Some((index, result)) = result_rx.recv().await {
        indexed_results.push((index, result));
    }

    // Sort by index to maintain original order
    indexed_results.sort_by_key(|(index, _)| *index);

    // Extract results in order
    let results: Vec<ConversionResult> = indexed_results
        .into_iter()
        .filter_map(|(_, result)| result)
        .collect();

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
