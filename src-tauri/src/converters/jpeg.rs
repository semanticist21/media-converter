use img_parts::jpeg::Jpeg;
use img_parts::{Bytes, ImageEXIF};

// Convert to JPEG with optional EXIF preservation
pub fn convert_to_jpeg(
    img: &image::DynamicImage,
    quality: u8,
    exif_bytes: Option<&[u8]>,
) -> Result<Vec<u8>, String> {
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

    // Insert EXIF data if provided
    if let Some(exif) = exif_bytes {
        let mut jpeg = Jpeg::from_bytes(Bytes::copy_from_slice(&buffer))
            .map_err(|e| format!("Failed to parse JPEG: {}", e))?;

        jpeg.set_exif(Some(Bytes::copy_from_slice(exif)));

        return Ok(jpeg.encoder().bytes().to_vec());
    }

    Ok(buffer)
}
