use rgb::FromSlice;

// Convert to AVIF using ravif with configurable speed
pub fn convert_to_avif(
    img: &image::DynamicImage,
    quality: u8,
    speed: u8,
    _exif_bytes: Option<&[u8]>, // EXIF not supported yet for AVIF
) -> Result<Vec<u8>, String> {
    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();

    // Convert to rgb crate's RGBA format
    let raw_pixels = rgba_img.as_raw();
    let rgba_pixels: &[rgb::RGBA8] = raw_pixels.as_rgba();

    // Clamp speed to valid range (1-10)
    let speed = speed.clamp(1, 10);

    // Create ravif encoder with user-configurable speed
    let encoder = ravif::Encoder::new()
        .with_quality(quality as f32)
        .with_speed(speed) // 1-10: lower = better compression, higher = faster
        .with_num_threads(Some(num_cpus::get()));

    // Encode to AVIF
    let avif_data = encoder
        .encode_rgba(ravif::Img::new(rgba_pixels, width as usize, height as usize))
        .map_err(|e| format!("AVIF encoding failed: {}", e))?;

    Ok(avif_data.avif_file)
}
