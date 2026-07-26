
import AppKit

func processImage(inputPath: String, outputPath: String) {
    guard let image = NSImage(contentsOfFile: inputPath),
          let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
    
    let width = cgImage.width
    let height = cgImage.height
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bytesPerPixel = 4
    let bytesPerRow = bytesPerPixel * width
    let rawData = UnsafeMutablePointer<UInt8>.allocate(capacity: height * bytesPerRow)
    
    guard let context = CGContext(data: rawData,
                                  width: width,
                                  height: height,
                                  bitsPerComponent: 8,
                                  bytesPerRow: bytesPerRow,
                                  space: colorSpace,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
    
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    
    for y in 0..<height {
        for x in 0..<width {
            let offset = (y * bytesPerRow) + (x * bytesPerPixel)
            let r = rawData[offset]
            let g = rawData[offset + 1]
            let b = rawData[offset + 2]
            
            // If near white background, set alpha to 0
            if r > 235 && g > 235 && b > 235 {
                rawData[offset + 3] = 0
            }
        }
    }
    
    if let newCgImage = context.makeImage() {
        let newImage = NSImage(cgImage: newCgImage, size: image.size)
        if let tiffData = newImage.tiffRepresentation,
           let bitmapRep = NSBitmapImageRep(data: tiffData),
           let pngData = bitmapRep.representation(using: .png, properties: [:]) {
            try? pngData.write(to: URL(fileURLWithPath: outputPath))
            print("Saved transparent PNG to \(outputPath)")
        }
    }
}

let args = CommandLine.arguments
if args.count >= 3 {
    processImage(inputPath: args[1], outputPath: args[2])
}
