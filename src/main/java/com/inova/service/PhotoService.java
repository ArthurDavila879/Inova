package com.inova.service;

import com.inova.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.util.*;
import java.io.*;
import javax.imageio.ImageIO;

@Service
public class PhotoService {
    private final Path directory;
    public PhotoService(@Value("${app.upload-dir:./uploads}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    public String save(String photo) {
        if (photo == null || photo.isBlank()) return null;
        if (photo.length() > 7_000_000) throw new BusinessException("Foto deve ter no máximo 5 MB");
        if (!photo.matches("(?s)^data:image/(png|jpeg);base64,[A-Za-z0-9+/=\\r\\n]+$"))
            throw new BusinessException("Envie uma foto PNG ou JPEG");
        try {
            byte[] bytes = Base64.getDecoder().decode(photo.substring(photo.indexOf(',') + 1));
            if (bytes.length > 5 * 1024 * 1024) throw new BusinessException("Foto deve ter no máximo 5 MB");
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new BusinessException("Imagem inválida");
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    if ((long) reader.getWidth(0) * reader.getHeight(0) > 20_000_000)
                        throw new BusinessException("Imagem excede 20 megapixels");
                    var decoded = reader.read(0);
                    String filename = UUID.randomUUID() + ".png";
                    Files.createDirectories(directory);
                    ImageIO.write(decoded, "png", directory.resolve(filename).toFile());
                    return "/uploads/" + filename;
                } finally { reader.dispose(); }
            }
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Imagem inválida");
        } catch (IOException e) {
            throw new BusinessException("Não foi possível processar a foto");
        }
    }
}
