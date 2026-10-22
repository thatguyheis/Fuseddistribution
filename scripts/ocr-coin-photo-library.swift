import Foundation
import ImageIO
import Vision

struct OCRLine: Codable {
    let text: String
    let confidence: Float
}

struct OCRResult: Codable {
    let file: String
    let lines: [OCRLine]
    let error: String?
}

let filePaths = Array(CommandLine.arguments.dropFirst())
var results: [OCRResult] = []

for filePath in filePaths {
    autoreleasepool {
        let url = URL(fileURLWithPath: filePath)
        guard let data = try? Data(contentsOf: url),
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            results.append(OCRResult(file: filePath, lines: [], error: "Image could not be opened"))
            return
        }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en-US"]
        do {
            try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
            let lines = (request.results ?? [])
                .compactMap { observation -> OCRLine? in
                    guard let candidate = observation.topCandidates(1).first else { return nil }
                    return OCRLine(text: candidate.string, confidence: candidate.confidence)
                }
            results.append(OCRResult(file: filePath, lines: lines, error: nil))
        } catch {
            results.append(OCRResult(file: filePath, lines: [], error: String(reflecting: error)))
        }
    }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
do {
    let data = try encoder.encode(results)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0A]))
} catch {
    fputs("Could not encode OCR results: \(error.localizedDescription)\n", stderr)
    exit(1)
}
