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
pub async fn convert_images(
    target_format: String,
    quality: u8,
    avif_speed: u8,
    preserve_exif: bool,
    preserve_timestamps: bool,
    output_dir: String,
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

    // Get CPU core count for concurrent processing
    let max_concurrent = num_cpus::get();
    let semaphore = Arc::new(Semaphore::new(max_concurrent));

    // Create channel for ordered results
    let (result_tx, mut result_rx) = mpsc::channel(files_to_convert.len());

    // Process files concurrently with order preservation
    for (index, (id, name, original_size, data, exif_raw_bytes, timestamps, source_path)) in
        files_to_convert.into_iter().enumerate()
    {
        let window = window.clone();
        let target_format = target_format.clone();
        let output_dir = output_dir.clone();
        let semaphore = Arc::clone(&semaphore);
        let result_tx = result_tx.clone();
        let avif_speed_clone = avif_speed;

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
                },
            );

            // Load image from bytes
            let img = match image::load_from_memory(&data) {
                Ok(img) => img,
                Err(e) => {
                    let error_msg = format!("Failed to decode image: {}", e);
                    let _ = window.emit(
                        "conversion-progress",
                        ConversionProgress {
                            file_id: id.clone(),
                            file_name: name.clone(),
                            status: "error".to_string(),
                            error_message: Some(error_msg.clone()),
                        },
                    );
                    eprintln!("{}", error_msg);
                    return None;
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
                            Ok(dir) => dir.join(&output_name),
                            Err(e) => {
                                let error_msg = format!("Failed to get source directory: {}", e);
                                let _ = window.emit(
                                    "conversion-progress",
                                    ConversionProgress {
                                        file_id: id.clone(),
                                        file_name: name.clone(),
                                        status: "error".to_string(),
                                        error_message: Some(error_msg.clone()),
                                    },
                                );
                                eprintln!("{}", error_msg);
                                return None;
                            }
                        }
                    }
                    None => {
                        let error_msg = "Cannot use source directory for URL-based files".to_string();
                        let _ = window.emit(
                            "conversion-progress",
                            ConversionProgress {
                                file_id: id.clone(),
                                file_name: name.clone(),
                                status: "error".to_string(),
                                error_message: Some(error_msg.clone()),
                            },
                        );
                        eprintln!("{}", error_msg);
                        return None;
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
                                },
                            );
                            eprintln!("{}", error_msg);
                            return None;
                        }
                    };

                    match img.write_to(&mut std::io::Cursor::new(&mut buffer), format) {
                        Ok(_) => buffer,
                        Err(e) => {
                            let error_msg = format!("Failed to encode {}: {}", target_format, e);
                            let _ = window.emit(
                                "conversion-progress",
                                ConversionProgress {
                                    file_id: id.clone(),
                                    file_name: name.clone(),
                                    status: "error".to_string(),
                                    error_message: Some(error_msg.clone()),
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
                },
            );

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
