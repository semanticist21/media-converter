use img_parts::webp::WebP;
use img_parts::{Bytes, ImageEXIF};

// Convert to WebP using libwebp with optional EXIF preservation
pub fn convert_to_webp(
    img: &image::DynamicImage,
    quality: u8,
    exif_bytes: Option<&[u8]>,
) -> Result<Vec<u8>, String> {
    use webp::Encoder;

    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();

    let encoder = Encoder::from_rgba(&rgba_img, width, height);
    let webp_data = encoder.encode(quality as f32);

    // Insert EXIF data if provided
    if let Some(exif) = exif_bytes {
        let mut webp = WebP::from_bytes(Bytes::copy_from_slice(&webp_data))
            .map_err(|e| format!("Failed to parse WebP: {}", e))?;

        webp.set_exif(Some(Bytes::copy_from_slice(exif)));

        return Ok(webp.encoder().bytes().to_vec());
    }

    Ok(webp_data.to_vec())
}
