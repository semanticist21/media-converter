use image::ImageEncoder;
use img_parts::png::Png;
use img_parts::{Bytes, ImageEXIF};

// Convert to PNG with optional EXIF preservation
pub fn convert_to_png(
    img: &image::DynamicImage,
    _compression: u8,
    exif_bytes: Option<&[u8]>,
) -> Result<Vec<u8>, String> {
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

    // Insert EXIF data if provided
    if let Some(exif) = exif_bytes {
        let mut png = Png::from_bytes(Bytes::copy_from_slice(&buffer))
            .map_err(|e| format!("Failed to parse PNG: {}", e))?;

        png.set_exif(Some(Bytes::copy_from_slice(exif)));

        return Ok(png.encoder().bytes().to_vec());
    }

    Ok(buffer)
}
