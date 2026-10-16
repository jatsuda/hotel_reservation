package com.hotel.reservation.service;

import com.hotel.reservation.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;
import java.util.UUID;

/**
 * Stores uploaded photos on local disk and hands back their public URL.
 *
 * Security notes:
 *  - The file type is decided by the file's real bytes (magic numbers), never
 *    by the client-supplied name or Content-Type.
 *  - Every upload is DECODED and RE-ENCODED from pixels. What is stored is a
 *    brand-new JPEG/PNG written by this server, so EXIF/GPS/XMP metadata,
 *    appended payloads and polyglot tricks do not survive.
 *  - Pixel dimensions are checked before decoding (decompression-bomb guard),
 *    large photos are read subsampled, and the result is scaled down to
 *    MAX_DIMENSION on its longest side.
 *  - JPEG orientation (EXIF) is applied before the metadata is dropped, so
 *    phone photos are not stored sideways.
 *  - The stored name is a random UUID plus an extension WE choose; the
 *    client's filename is never used in a path.
 *  - SVG and WEBP are not accepted (SVG can carry scripts; the JDK has no
 *    built-in WEBP codec to re-encode with). GIFs are stored as a static PNG
 *    of their first frame.
 */
@Service
public class ImageStorageService {

    private static final Logger log = LoggerFactory.getLogger(ImageStorageService.class);

    private static final long MAX_BYTES = 8L * 1024 * 1024;        // 8 MB upload
    private static final long MAX_SOURCE_PIXELS = 100_000_000L;    // refuse absurd dimensions
    private static final int MAX_DIMENSION = 2400;                 // stored longest side
    private static final float JPEG_QUALITY = 0.85f;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    // Absolute base of the returned URL, e.g. https://api.example.com
    // Deliberately NOT derived from the request's Host header (which a client
    // controls). Set APP_UPLOAD_PUBLIC_BASE_URL in every real deployment.
    @Value("${app.upload.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    private Path root;
    private String baseUrl;

    @PostConstruct
    void init() throws IOException {
        root = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("images");
        Files.createDirectories(root);
        baseUrl = (publicBaseUrl == null || publicBaseUrl.isBlank())
                ? "http://localhost:8080"
                : publicBaseUrl.trim().replaceAll("/+$", "");
        if (baseUrl.startsWith("http://localhost")) {
            log.info("Uploaded image URLs use {} - set APP_UPLOAD_PUBLIC_BASE_URL for a real deployment.", baseUrl);
        }
    }

    public Path getRoot() {
        return root;
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please choose an image file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Image is too large (max 8 MB)");
        }

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Could not read the uploaded file");
        }
        if (data.length > MAX_BYTES) {
            throw new BadRequestException("Image is too large (max 8 MB)");
        }

        String kind = detectKind(data);
        if (kind == null) {
            throw new BadRequestException("Only JPG, PNG or GIF images are allowed");
        }
        boolean asJpeg = "jpg".equals(kind);

        BufferedImage decoded = decode(data);
        int orientation = asJpeg ? readJpegOrientation(data) : 1;
        boolean keepAlpha = !asJpeg && decoded.getColorModel().hasAlpha();
        BufferedImage image = normalize(decoded, orientation, keepAlpha);

        String ext = asJpeg ? "jpg" : "png";
        String filename = UUID.randomUUID() + "." + ext;
        Path target = root.resolve(filename).normalize();
        if (!target.startsWith(root)) {
            throw new BadRequestException("Invalid file name");
        }
        try {
            if (asJpeg) {
                writeJpeg(image, target);
            } else {
                writePng(image, target);
            }
        } catch (IOException e) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException ignored) {
                // best effort
            }
            throw new IllegalStateException("Could not save the image", e);
        }

        return baseUrl + "/uploads/images/" + filename;
    }

    // ------------------------------------------------------------------
    // Type detection
    // ------------------------------------------------------------------

    private static String detectKind(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A) {
            return "png";
        }
        if (h.length >= 6 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8'
                && (h[4] == '7' || h[4] == '9') && h[5] == 'a') {
            return "gif";
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Decoding (bounded)
    // ------------------------------------------------------------------

    private static BufferedImage decode(byte[] data) {
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            if (iis == null) {
                throw new BadRequestException("Could not read the image");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new BadRequestException("Could not read the image");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(iis, true, true);
                int w = reader.getWidth(0);
                int h = reader.getHeight(0);
                if (w <= 0 || h <= 0 || (long) w * h > MAX_SOURCE_PIXELS) {
                    throw new BadRequestException("Image dimensions are too large");
                }
                ImageReadParam param = reader.getDefaultReadParam();
                // Very large photos are read subsampled so the full-size pixel
                // array is never allocated in memory.
                int sub = Math.max(1, Math.max(w, h) / (MAX_DIMENSION * 2));
                if (sub > 1) {
                    param.setSourceSubsampling(sub, sub, 0, 0);
                }
                BufferedImage img = reader.read(0, param);
                if (img == null) {
                    throw new BadRequestException("Could not read the image");
                }
                return img;
            } finally {
                reader.dispose();
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            throw new BadRequestException("Could not read the image (unsupported or corrupted file)");
        }
    }

    // ------------------------------------------------------------------
    // Orientation + downscale into a fresh bitmap
    // ------------------------------------------------------------------

    private static BufferedImage normalize(BufferedImage src, int orientation, boolean alpha) {
        int w = src.getWidth();
        int h = src.getHeight();
        boolean swap = orientation >= 5 && orientation <= 8;
        int ow = swap ? h : w; // size after rotating
        int oh = swap ? w : h;

        double scale = Math.min(1.0, (double) MAX_DIMENSION / Math.max(ow, oh));
        int nw = Math.max(1, (int) Math.round(ow * scale));
        int nh = Math.max(1, (int) Math.round(oh * scale));

        AffineTransform at = new AffineTransform();
        at.scale(scale, scale);
        at.concatenate(orientationTransform(orientation, w, h));

        BufferedImage out = new BufferedImage(nw, nh, alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            if (!alpha) {
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, nw, nh);
            }
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(src, at, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    // Maps source pixels to the upright image for EXIF orientation 1-8.
    private static AffineTransform orientationTransform(int orientation, int w, int h) {
        switch (orientation) {
            case 2: return new AffineTransform(-1, 0, 0, 1, w, 0);   // mirror horizontally
            case 3: return new AffineTransform(-1, 0, 0, -1, w, h);  // rotate 180
            case 4: return new AffineTransform(1, 0, 0, -1, 0, h);   // mirror vertically
            case 5: return new AffineTransform(0, 1, 1, 0, 0, 0);    // transpose
            case 6: return new AffineTransform(0, 1, -1, 0, h, 0);   // rotate 90 clockwise
            case 7: return new AffineTransform(0, -1, -1, 0, h, w);  // transverse
            case 8: return new AffineTransform(0, -1, 1, 0, 0, w);   // rotate 90 counter-clockwise
            default: return new AffineTransform();
        }
    }

    // ------------------------------------------------------------------
    // EXIF orientation (JPEG only) - read before the metadata is discarded
    // ------------------------------------------------------------------

    private static int readJpegOrientation(byte[] d) {
        int pos = 2; // after SOI
        while (pos + 4 <= d.length) {
            if ((d[pos] & 0xFF) != 0xFF) {
                return 1;
            }
            int marker = d[pos + 1] & 0xFF;
            if (marker == 0xFF) {            // fill byte
                pos++;
                continue;
            }
            if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD8)) { // standalone markers
                pos += 2;
                continue;
            }
            if (marker == 0xD9 || marker == 0xDA) {   // EOI / start of scan: no EXIF after this
                return 1;
            }
            int len = ((d[pos + 2] & 0xFF) << 8) | (d[pos + 3] & 0xFF);
            if (len < 2) {
                return 1;
            }
            int end = pos + 2 + len;
            if (end > d.length) {
                return 1;
            }
            if (marker == 0xE1 && len >= 16
                    && d[pos + 4] == 'E' && d[pos + 5] == 'x' && d[pos + 6] == 'i' && d[pos + 7] == 'f'
                    && d[pos + 8] == 0 && d[pos + 9] == 0) {
                return parseTiffOrientation(d, pos + 10, end);
            }
            pos = end;
        }
        return 1;
    }

    private static int parseTiffOrientation(byte[] d, int tiff, int end) {
        if (tiff + 8 > end) {
            return 1;
        }
        boolean le;
        if (d[tiff] == 'I' && d[tiff + 1] == 'I') {
            le = true;
        } else if (d[tiff] == 'M' && d[tiff + 1] == 'M') {
            le = false;
        } else {
            return 1;
        }
        long ifdOffset = readUInt(d, tiff + 4, 4, le);
        long ifd = tiff + ifdOffset;
        if (ifdOffset < 8 || ifd + 2 > end) {
            return 1;
        }
        int count = (int) readUInt(d, (int) ifd, 2, le);
        for (int i = 0; i < count; i++) {
            long entry = ifd + 2 + 12L * i;
            if (entry + 12 > end) {
                return 1;
            }
            int tag = (int) readUInt(d, (int) entry, 2, le);
            if (tag == 0x0112) {
                int value = (int) readUInt(d, (int) entry + 8, 2, le);
                return (value >= 1 && value <= 8) ? value : 1;
            }
        }
        return 1;
    }

    private static long readUInt(byte[] d, int off, int n, boolean littleEndian) {
        long v = 0;
        for (int i = 0; i < n; i++) {
            int b = d[off + (littleEndian ? n - 1 - i : i)] & 0xFF;
            v = (v << 8) | b;
        }
        return v;
    }

    // ------------------------------------------------------------------
    // Encoding (fresh files, no metadata)
    // ------------------------------------------------------------------

    private static void writeJpeg(BufferedImage image, Path target) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IOException("No JPEG writer available");
        }
        ImageWriter writer = writers.next();
        try (OutputStream out = Files.newOutputStream(target);
             ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.setOutput(ios);
            // null metadata => no EXIF/XMP/ICC copied over from the original
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    private static void writePng(BufferedImage image, Path target) throws IOException {
        try (OutputStream out = Files.newOutputStream(target)) {
            if (!ImageIO.write(image, "png", out)) {
                throw new IOException("No PNG writer available");
            }
        }
    }
}
