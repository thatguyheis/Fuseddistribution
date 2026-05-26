import AVFoundation
import Foundation

// Usage: swift personal-voice-tts.swift "text" /output/path.m4a

let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("Usage: swift personal-voice-tts.swift <text> <output.m4a>\n", stderr)
    exit(1)
}
let text = args[1]
let outputPath = args[2]

let group = DispatchGroup()
group.enter()

AVSpeechSynthesizer.requestPersonalVoiceAuthorization { status in
    guard status == .authorized else {
        fputs("Personal voice not authorized (status: \(status.rawValue)). Grant access in System Settings → Privacy & Security → Personal Voice.\n", stderr)
        exit(1)
    }

    let voices = AVSpeechSynthesisVoice.speechVoices().filter { $0.voiceTraits.contains(.isPersonalVoice) }
    guard let voice = voices.first else {
        fputs("No personal voice found. Create one in System Settings → Accessibility → Personal Voice.\n", stderr)
        exit(1)
    }

    fputs("Using voice: \(voice.name)\n", stderr)

    let utterance = AVSpeechUtterance(string: text)
    utterance.voice = voice
    utterance.rate = 0.50
    utterance.pitchMultiplier = 1.0
    utterance.volume = 1.0

    let synth = AVSpeechSynthesizer()
    let url = URL(fileURLWithPath: outputPath)

    do {
        try synth.write(utterance, toBufferCallback: { _ in }) // needed to trigger write
    } catch {}

    synth.write(utterance) { buffer in
        guard let pcmBuffer = buffer as? AVAudioPCMBuffer, pcmBuffer.frameLength > 0 else { return }
        // write handled by AVAudioFile below
    }

    // Use AVAudioFile approach via outputURL
    synth.stopSpeaking(at: .immediate)

    // Proper approach: collect buffers and write to file
    var audioBuffers: [AVAudioPCMBuffer] = []
    var audioFormat: AVAudioFormat?

    let synth2 = AVSpeechSynthesizer()
    let sema = DispatchSemaphore(value: 0)

    synth2.write(utterance) { buffer in
        if let pcm = buffer as? AVAudioPCMBuffer {
            if pcm.frameLength > 0 {
                if audioFormat == nil { audioFormat = pcm.format }
                audioBuffers.append(pcm)
            } else {
                sema.signal()
            }
        }
    }

    sema.wait()

    guard let format = audioFormat, !audioBuffers.isEmpty else {
        fputs("No audio generated\n", stderr)
        exit(1)
    }

    let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: format.sampleRate,
        AVNumberOfChannelsKey: format.channelCount,
        AVEncoderBitRateKey: 128000,
    ]

    do {
        let fileURL = URL(fileURLWithPath: outputPath)
        let audioFile = try AVAudioFile(forWriting: fileURL, settings: settings)
        for buf in audioBuffers {
            try audioFile.write(from: buf)
        }
        fputs("Wrote \(outputPath)\n", stderr)
    } catch {
        fputs("Write error: \(error)\n", stderr)
        exit(1)
    }

    group.leave()
}

group.wait()
